import { useRuntimeConfig, storeSCUJobManager, dicomServiceRegistry, createError } from '#imports'
import { StoreScu } from '@nuxthealth/node-dicom'
import { join, resolve } from 'node:path'
import { homedir } from 'node:os'
import { readFile } from 'node:fs/promises'
import type { ExternalDicomDestination } from '../../utils/schema'

// ── Public types ──────────────────────────────────────────────────────────────

export interface DicomTransferOptions {
  /** Send specific files by their storage key paths */
  paths?: string[]
  /** Send an entire study by UID */
  studyUid?: string
  /** Override the calling AE title for C-STORE negotiation */
  callingAeTitle?: string
  /**
   * Pause between each individual file send (milliseconds).
   * Useful when the target StoreSCP cannot keep up with fast transfers.
   *
   * When > 0 and using DIMSE, each file is sent in its own DICOM association
   * rather than batching everything into one. This is a temporary workaround —
   * a native `delay` / throttle option will be provided directly by the
   * StoreScu implementation in a future release.
   *
   * When 0 (default) DIMSE uses a single association for all files (fastest).
   */
  delayBetweenFiles?: number
}

// ── Main composable ───────────────────────────────────────────────────────────

/**
 * Server-side composable for enqueuing a DICOM transfer job.
 *
 * Handles destination resolution, job creation, and async worker enqueueing.
 * Returns a `DicomJob` with an `id` that callers can forward to the client for
 * live-progress tracking via the jobs WebSocket.
 *
 * @example
 * const { enqueue } = useDicomTransfer()
 * const job = await enqueue('myService', 'pacsTarget', { studyUid: '1.2.3' })
 * return { jobId: job.id }
 */
export function useDicomTransfer() {
  /**
   * Resolve source + destination, create a job and enqueue the transfer worker.
   * Throws `H3Error` (400/404) for invalid inputs — safe to propagate from an
   * event handler.
   */
  async function enqueue(
    sourceName: string,
    targetName: string,
    options: DicomTransferOptions = {},
  ) {
    const { paths, studyUid, callingAeTitle: overrideCallingAe, delayBetweenFiles } = options

    // ── Resolve source service ──────────────────────────────────────────────
    const allServices = dicomServiceRegistry.getAllServices()
    const sourceService = allServices.find(s => s.id === sourceName || s.name === sourceName)
    if (!sourceService) {
      throw createError({ statusCode: 404, message: `Service "${sourceName}" not found` })
    }

    // ── Resolve target destination ──────────────────────────────────────────
    const resolvedDest = _resolveDestination(allServices, targetName, overrideCallingAe)

    // ── Determine send mode ─────────────────────────────────────────────────
    type SendMode = 'files' | 'study' | 'all'
    let sendMode: SendMode = 'all'
    if (paths && paths.length > 0) sendMode = 'files'
    else if (studyUid) sendMode = 'study'

    const initialTotal = sendMode === 'files' ? (paths?.length ?? 0) : 0
    const displayAddr = resolvedDest.protocol === 'dimse' ? resolvedDest.addr : resolvedDest.url

    // ── Create job and enqueue worker ───────────────────────────────────────
    const job = storeSCUJobManager.createJob(sourceName, targetName, displayAddr, initialTotal, resolvedDest.protocol)

    storeSCUJobManager.enqueue(job.id, () =>
      _runTransfer({
        jobId: job.id,
        dest: resolvedDest,
        outDir: sourceService.config.outDir,
        sendMode,
        filePaths: sendMode === 'files' ? (paths ?? []) : null,
        studyUid: sendMode === 'study' ? studyUid : undefined,
        delayBetweenFiles: delayBetweenFiles && delayBetweenFiles > 0 ? delayBetweenFiles : 0,
      }),
    )

    return job
  }

  return { enqueue }
}

// ── Internal: destination resolution ─────────────────────────────────────────

function _resolveDestination(
  allServices: ReturnType<typeof dicomServiceRegistry.getAllServices>,
  targetName: string,
  overrideCallingAe?: string,
): ResolvedDestination {
  const internalTarget = allServices.find(s => s.id === targetName || s.name === targetName)
  if (internalTarget) {
    return {
      protocol: 'dimse',
      addr: `127.0.0.1:${internalTarget.config.port}`,
      calledAeTitle: internalTarget.config.callingAETitle,
      callingAeTitle: overrideCallingAe ?? 'STORE-SCU',
    }
  }

  const runtimeConfig = useRuntimeConfig()
  const dicomConfig = runtimeConfig.dicom as Record<string, unknown>
  const externalDests = dicomConfig.destinations as ExternalDicomDestination[] | undefined
  const externalTarget = externalDests?.find(d => d.name === targetName)

  if (!externalTarget) {
    throw createError({ statusCode: 404, message: `Destination "${targetName}" not found` })
  }

  if (externalTarget.protocol === 'dicomweb') {
    return {
      protocol: 'dicomweb',
      url: externalTarget.url,
      authorization: externalTarget.authorization,
      headers: externalTarget.headers,
    }
  }

  return {
    protocol: 'dimse',
    addr: externalTarget.addr,
    calledAeTitle: externalTarget.calledAeTitle,
    callingAeTitle: overrideCallingAe ?? externalTarget.callingAeTitle ?? 'STORE-SCU',
  }
}

// ── Internal: types ───────────────────────────────────────────────────────────

type ResolvedDestination
  = | { protocol: 'dimse', addr: string, calledAeTitle?: string, callingAeTitle?: string }
    | { protocol: 'dicomweb', url: string, authorization?: string, headers?: Record<string, string> }

interface TransferOptions {
  jobId: string
  dest: ResolvedDestination
  outDir: string
  sendMode: 'files' | 'study' | 'all'
  filePaths: string[] | null
  studyUid?: string
  delayBetweenFiles: number
}

// ── Internal: transfer orchestration ─────────────────────────────────────────

async function _runTransfer(opts: TransferOptions): Promise<void> {
  const { jobId, dest, outDir, sendMode, filePaths, studyUid, delayBetweenFiles } = opts

  storeSCUJobManager.update(jobId, { status: 'running' })

  const resolvedOutDir = _resolveOutDir(outDir)

  if (dest.protocol === 'dicomweb') {
    await _runStowRsTransfer({ jobId, dest, resolvedOutDir, sendMode, filePaths, studyUid, delayBetweenFiles })
  }
  else {
    await _runDimseTransfer({ jobId, dest, resolvedOutDir, sendMode, filePaths, studyUid, delayBetweenFiles })
  }
}

// ── Internal: DIMSE (C-STORE) ─────────────────────────────────────────────────

async function _runDimseTransfer(opts: {
  jobId: string
  dest: Extract<ResolvedDestination, { protocol: 'dimse' }>
  resolvedOutDir: string
  sendMode: 'files' | 'study' | 'all'
  filePaths: string[] | null
  studyUid?: string
  delayBetweenFiles: number
}): Promise<void> {
  const { jobId, dest, resolvedOutDir, sendMode, filePaths, studyUid, delayBetweenFiles } = opts

  const addr = dest.calledAeTitle ? `${dest.calledAeTitle}@${dest.addr}` : dest.addr
  const scuOpts = { addr, callingAeTitle: dest.callingAeTitle ?? 'STORE-SCU' }

  // ── Collect files ─────────────────────────────────────────────────────────
  let allFiles: string[] = []
  if (sendMode === 'files' && filePaths) {
    allFiles = filePaths.map(k => _storageKeyToPath(resolvedOutDir, k))
  }
  else if (sendMode === 'study' && studyUid) {
    const { readdirSync, statSync } = await import('node:fs')
    allFiles = _collectDicomFiles(join(resolvedOutDir, studyUid), readdirSync, statSync)
  }
  else {
    const { readdirSync, statSync } = await import('node:fs')
    allFiles = _collectDicomFiles(resolvedOutDir, readdirSync, statSync)
  }

  const total = allFiles.length
  let sent = 0
  let failed = 0
  storeSCUJobManager.update(jobId, { progress: { sent, failed, total } })

  if (delayBetweenFiles > 0) {
    // ── Throttled: one file per association, delay between each ─────────────
    // TODO: Replace with a native StoreScu `delay` option once available.
    const allResults: Array<{ status: string, message: string }> = []
    for (let i = 0; i < allFiles.length; i++) {
      const filePath = allFiles[i]!
      const scu = new StoreScu(scuOpts)
      scu.addFile(filePath)
      try {
        const results = await scu.send({})
        if (results.some(r => r.status === 'Success')) sent++
        else failed++
        allResults.push(...results.map(r => ({ status: r.status, message: r.message })))
      }
      catch (err) {
        failed++
        allResults.push({ status: 'Error', message: err instanceof Error ? err.message : String(err) })
      }
      storeSCUJobManager.update(jobId, { progress: { sent, failed, total } })
      if (i < allFiles.length - 1) await _sleep(delayBetweenFiles)
    }
    storeSCUJobManager.update(jobId, {
      status: 'completed',
      results: allResults,
      progress: { sent, failed, total },
      completedAt: new Date(),
    })
  }
  else {
    // ── Fast: single association for all files ────────────────────────────
    const scu = new StoreScu(scuOpts)
    for (const f of allFiles) scu.addFile(f)

    const results = await scu.send({
      onTransferStarted: (_err, ev) => {
        const t = ev.data?.totalFiles ?? total
        storeSCUJobManager.update(jobId, { progress: { sent, failed, total: t } })
      },
      onFileSent: () => {
        sent++
        storeSCUJobManager.update(jobId, { progress: { sent, failed, total } })
      },
      onFileError: () => {
        failed++
        storeSCUJobManager.update(jobId, { progress: { sent, failed, total } })
      },
    })

    storeSCUJobManager.update(jobId, {
      status: 'completed',
      results: results.map(r => ({ status: r.status, message: r.message })),
      progress: { sent, failed, total },
      completedAt: new Date(),
    })
  }
}

// ── Internal: DICOMweb STOW-RS ────────────────────────────────────────────────

const STOW_BOUNDARY = 'dicom-boundary'

async function _runStowRsTransfer(opts: {
  jobId: string
  dest: Extract<ResolvedDestination, { protocol: 'dicomweb' }>
  resolvedOutDir: string
  sendMode: 'files' | 'study' | 'all'
  filePaths: string[] | null
  studyUid?: string
  delayBetweenFiles: number
}): Promise<void> {
  const { jobId, dest, resolvedOutDir, sendMode, filePaths, studyUid, delayBetweenFiles } = opts
  const { readdirSync, statSync } = await import('node:fs')

  let absolutePaths: string[] = []
  if (sendMode === 'files' && filePaths) {
    absolutePaths = filePaths.map(k => _storageKeyToPath(resolvedOutDir, k))
  }
  else if (sendMode === 'study' && studyUid) {
    absolutePaths = _collectDicomFiles(join(resolvedOutDir, studyUid), readdirSync, statSync)
  }
  else {
    absolutePaths = _collectDicomFiles(resolvedOutDir, readdirSync, statSync)
  }

  const total = absolutePaths.length
  storeSCUJobManager.update(jobId, { progress: { sent: 0, failed: 0, total } })

  const stowUrl = dest.url.replace(/\/$/, '') + '/studies' + (studyUid ? `/${studyUid}` : '')
  const extraHeaders = dest.headers ?? {}

  let sent = 0
  let failed = 0
  const results: Array<{ status: string, message: string }> = []

  for (let i = 0; i < absolutePaths.length; i++) {
    const filePath = absolutePaths[i]!
    try {
      const bytes = await readFile(filePath)
      const body = Buffer.concat([
        Buffer.from(`--${STOW_BOUNDARY}\r\nContent-Type: application/dicom\r\n\r\n`),
        bytes,
        Buffer.from(`\r\n--${STOW_BOUNDARY}--\r\n`),
      ])

      const response = await fetch(stowUrl, {
        method: 'POST',
        headers: Object.assign(
          {
            'Content-Type': `multipart/related; type="application/dicom"; boundary=${STOW_BOUNDARY}`,
            'Accept': 'application/dicom+json',
          } as Record<string, string>,
          dest.authorization ? { Authorization: dest.authorization } : {},
          extraHeaders,
        ),
        body,
      })

      if (response.ok || response.status === 409) {
        sent++
        results.push({ status: 'Success', message: `${filePath} → HTTP ${response.status}` })
      }
      else {
        failed++
        results.push({ status: 'Error', message: `${filePath} → HTTP ${response.status}` })
      }
    }
    catch (err) {
      failed++
      results.push({ status: 'Error', message: `${filePath} → ${err instanceof Error ? err.message : String(err)}` })
    }
    storeSCUJobManager.update(jobId, { progress: { sent, failed, total } })
    if (delayBetweenFiles > 0 && i < absolutePaths.length - 1) {
      await _sleep(delayBetweenFiles)
    }
  }

  storeSCUJobManager.update(jobId, {
    status: 'completed',
    results,
    progress: { sent, failed, total },
    completedAt: new Date(),
  })
}

// ── Internal: helpers ─────────────────────────────────────────────────────────

const _sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

function _resolveOutDir(outDir: string): string {
  if (outDir.startsWith('~/')) return join(homedir(), outDir.slice(2))
  return resolve(outDir)
}

function _storageKeyToPath(resolvedOutDir: string, key: string): string {
  return join(resolvedOutDir, key.replace(/:/g, '/'))
}

function _collectDicomFiles(
  dir: string,
  readdirSync: (p: string) => string[],
  statSync: (p: string) => { isDirectory(): boolean },
): string[] {
  const result: string[] = []
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) {
        result.push(..._collectDicomFiles(full, readdirSync, statSync))
      }
      else {
        result.push(full)
      }
    }
  }
  catch {
    // Ignore unreadable paths
  }
  return result
}
