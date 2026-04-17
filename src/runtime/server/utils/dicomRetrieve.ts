import { useRuntimeConfig, dicomRetrieveJobManager, dicomServiceRegistry, createError } from '#imports'
import { GetScu, MoveScu } from '@nuxthealth/node-dicom'
import { resolve } from 'node:path'
import { homedir } from 'node:os'
import { getStorageByName } from './storageRegistry'
import type { PacsServerConfig } from '../../utils/schema'

// ── Public types ──────────────────────────────────────────────────────────────

export type DicomRetrieveMethod = 'c-get' | 'c-move'

export interface DicomRetrieveOptions {
  /** Study Instance UID to retrieve */
  studyUid: string
  /** Operation method */
  method: DicomRetrieveMethod
  /**
   * Destination name.
   * - For `c-get` with `destinationType: 'storage'`: a named storage
   * - For `c-get` with `destinationType: 'service'`: a running StoreSCP (files forwarded in-memory)
   * - For `c-move`: a running StoreSCP (the PACS pushes directly to it)
   */
  destinationName: string
  /** Whether the destination is a named storage or a StoreSCP service */
  destinationType: 'storage' | 'service'
  /** Override query/retrieve information model */
  queryModel?: 'StudyRoot' | 'PatientRoot'
}

// ── Main composable ───────────────────────────────────────────────────────────

/**
 * Server-side composable for enqueuing a PACS retrieve job via C-GET or C-MOVE.
 *
 * For C-GET with a storage destination: uses GetScu with Filesystem backend.
 * For C-GET with a service destination: uses GetScu with Forward backend.
 * For C-MOVE: uses MoveScu; the destination AE title must be pre-configured in the PACS.
 *
 * @example
 * const { enqueue } = useDicomRetrieve()
 * const job = await enqueue('orthanc', {
 *   studyUid: '1.2.3',
 *   method: 'c-get',
 *   destinationName: 'main-storage',
 *   destinationType: 'storage',
 * })
 * return { jobId: job.id }
 */
export function useDicomRetrieve() {
  async function enqueue(pacsName: string, options: DicomRetrieveOptions) {
    const { studyUid, method, destinationName, destinationType, queryModel } = options

    // ── Resolve PACS config ───────────────────────────────────────────────
    const runtimeConfig = useRuntimeConfig()
    const dicomConfig = runtimeConfig.dicom as Record<string, unknown>
    const allPacs = (dicomConfig?.pacs as PacsServerConfig[] | undefined) ?? []
    const pacsConfig = allPacs.find(p => p.name === pacsName)

    if (!pacsConfig) {
      throw createError({ statusCode: 404, message: `PACS "${pacsName}" not found` })
    }

    // ── Resolve destination ───────────────────────────────────────────────
    const resolved = _resolveDestination(method, destinationName, destinationType)
    const targetAddr = resolved.type === 'filesystem'
      ? `storage:${destinationName}`
      : resolved.type === 'forward'
        ? `${resolved.addr} (forward)`
        : resolved.aeTitle

    // ── Create and enqueue job ────────────────────────────────────────────
    const job = dicomRetrieveJobManager.createJob(
      pacsName,
      studyUid,
      method,
      destinationName,
      targetAddr,
    )

    const qModel = queryModel ?? pacsConfig.queryModel ?? 'PatientRoot'

    dicomRetrieveJobManager.enqueue(job.id, () =>
      _runRetrieve({
        jobId: job.id,
        pacsConfig,
        studyUid,
        method,
        resolved,
        queryModel: qModel === 'ModalityWorklist' ? 'PatientRoot' : qModel,
      }),
    )

    return job
  }

  return { enqueue }
}

// ── Internal: destination resolution ─────────────────────────────────────────

type ResolvedDestination
  = | { type: 'filesystem', outDir: string }
    | { type: 'forward', addr: string, calledAeTitle: string }
    | { type: 'move', aeTitle: string }

function _resolveDestination(
  method: DicomRetrieveMethod,
  destinationName: string,
  destinationType: 'storage' | 'service',
): ResolvedDestination {
  if (method === 'c-move') {
    // C-MOVE: resolve StoreSCP service to get its AE title
    const service = dicomServiceRegistry.getService(destinationName)
      ?? dicomServiceRegistry.getAllServices().find(s => s.name === destinationName)
    if (!service) {
      throw createError({ statusCode: 404, message: `Service "${destinationName}" not found` })
    }
    return { type: 'move', aeTitle: service.config.callingAETitle }
  }

  if (destinationType === 'storage') {
    // C-GET → Filesystem: write directly to the named storage
    const storage = getStorageByName(destinationName)
    if (!storage) {
      throw createError({ statusCode: 404, message: `Storage "${destinationName}" not found` })
    }
    return { type: 'filesystem', outDir: storage.outDir }
  }

  // C-GET → Forward: relay to a running StoreSCP
  const service = dicomServiceRegistry.getService(destinationName)
    ?? dicomServiceRegistry.getAllServices().find(s => s.name === destinationName)
  if (!service) {
    throw createError({ statusCode: 404, message: `Service "${destinationName}" not found` })
  }
  return {
    type: 'forward',
    addr: `127.0.0.1:${service.config.port}`,
    calledAeTitle: service.config.callingAETitle,
  }
}

// ── Internal: retrieve orchestration ─────────────────────────────────────────

interface RunRetrieveOptions {
  jobId: string
  pacsConfig: PacsServerConfig
  studyUid: string
  method: DicomRetrieveMethod
  resolved: ResolvedDestination
  queryModel: 'StudyRoot' | 'PatientRoot'
}

async function _runRetrieve(opts: RunRetrieveOptions): Promise<void> {
  const { jobId, pacsConfig, studyUid, method, resolved, queryModel } = opts

  dicomRetrieveJobManager.update(jobId, { status: 'running' })

  const query: Record<string, string> = {
    StudyInstanceUID: studyUid,
    QueryRetrieveLevel: 'STUDY',
  }

  const scuBase = {
    addr: pacsConfig.addr,
    callingAeTitle: pacsConfig.callingAeTitle ?? (method === 'c-get' ? 'GET-SCU' : 'MOVE-SCU'),
    ...(pacsConfig.calledAeTitle ? { calledAeTitle: pacsConfig.calledAeTitle } : {}),
    ...(pacsConfig.maxPduLength ? { maxPduLength: pacsConfig.maxPduLength } : {}),
    verbose: pacsConfig.verbose ?? false,
  }

  try {
    if (method === 'c-move' && resolved.type === 'move') {
      await _runMoveScu({ jobId, scuBase, query, queryModel, moveDestination: resolved.aeTitle })
    }
    else {
      await _runGetScu({ jobId, scuBase, query, queryModel, resolved })
    }
  }
  catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    dicomRetrieveJobManager.update(jobId, {
      status: 'failed' as const,
      error: message,
      completedAt: new Date(),
    })
  }
}

// ── Internal: C-GET ───────────────────────────────────────────────────────────

async function _runGetScu(opts: {
  jobId: string
  scuBase: object
  query: Record<string, string>
  queryModel: 'StudyRoot' | 'PatientRoot'
  resolved: Extract<ResolvedDestination, { type: 'filesystem' | 'forward' }>
}): Promise<void> {
  const { jobId, scuBase, query, queryModel, resolved } = opts

  const scuOpts: Record<string, unknown> = { ...scuBase }

  if (resolved.type === 'filesystem') {
    scuOpts.storageBackend = 'Filesystem'
    scuOpts.outDir = _resolveOutDir(resolved.outDir)
  }
  else {
    scuOpts.storageBackend = 'Forward'
    scuOpts.forwardTarget = {
      addr: resolved.addr,
      callingAeTitle: 'GET-SCU',
      calledAeTitle: resolved.calledAeTitle,
    }
  }

  const getScu = new GetScu(scuOpts as Parameters<typeof GetScu>[0])

  let currentTotal = 0

  const result = await getScu.getStudy({
    query,
    queryModel,
    onSubOperation: (_err, event) => {
      const data = event?.data ?? {}
      const completed = (data.completed as number) ?? 0
      const failed = (data.failed as number) ?? 0
      const warning = (data.warning as number) ?? 0
      const remaining = (data.remaining as number) ?? 0
      const total = completed + failed + warning + remaining
      if (total > currentTotal) currentTotal = total
      dicomRetrieveJobManager.update(jobId, {
        progress: { sent: completed, failed, total: currentTotal },
      })
    },
  })

  dicomRetrieveJobManager.update(jobId, {
    status: 'completed' as const,
    progress: {
      sent: result.completed ?? 0,
      failed: (result.failed ?? 0) + (result.warning ?? 0),
      total: result.total ?? currentTotal,
    },
    completedAt: new Date(),
  })
}

// ── Internal: C-MOVE ──────────────────────────────────────────────────────────

async function _runMoveScu(opts: {
  jobId: string
  scuBase: object
  query: Record<string, string>
  queryModel: 'StudyRoot' | 'PatientRoot'
  moveDestination: string
}): Promise<void> {
  const { jobId, scuBase, query, queryModel, moveDestination } = opts

  const moveScu = new MoveScu(scuBase as Parameters<typeof MoveScu>[0])

  let currentTotal = 0

  const result = await moveScu.moveStudy({
    query,
    moveDestination,
    queryModel,
    onSubOperation: (_err, event) => {
      const data = event?.data ?? {}
      const total = (data.total as number) ?? 0
      const completed = (data.completed as number) ?? 0
      const failed = (data.failed as number) ?? 0
      const warning = (data.warning as number) ?? 0
      if (total > currentTotal) currentTotal = total
      dicomRetrieveJobManager.update(jobId, {
        progress: { sent: completed, failed: failed + warning, total: currentTotal },
      })
    },
  })

  dicomRetrieveJobManager.update(jobId, {
    status: 'completed' as const,
    progress: {
      sent: result.completed ?? 0,
      failed: (result.failed ?? 0) + (result.warning ?? 0),
      total: result.total ?? currentTotal,
    },
    completedAt: new Date(),
  })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _resolveOutDir(outDir: string): string {
  if (outDir.startsWith('~/')) return resolve(homedir(), outDir.slice(2))
  return resolve(outDir)
}
