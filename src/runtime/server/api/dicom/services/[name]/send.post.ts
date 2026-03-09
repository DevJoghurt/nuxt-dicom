import { defineEventHandler, getRouterParam, createError, readBody, useRuntimeConfig, storeSCUJobManager, dicomServiceRegistry } from '#imports'
import { StoreScu } from '@nuxthealth/node-dicom'
import { join, resolve } from 'node:path'
import { homedir } from 'node:os'
import { readFile } from 'node:fs/promises'
import type { ExternalDicomDestination } from '../../../../../utils/schema'

/**
 * POST /api/dicom/services/:name/send
 *
 * Initiate a non-blocking C-STORE SCU transfer from this service's storage to
 * an internal or external DICOM destination. Returns a job ID immediately; use
 * the jobs API to track progress.
 *
 * Body:
 *   targetName  {string}   Name of a registered internal or external destination
 *   paths?      {string[]} Specific unstorage key paths to send (optional)
 *   studyUid?   {string}   Send an entire study by UID (optional)
 *
 * If neither `paths` nor `studyUid` is supplied, all files in the service
 * storage are sent.
 */
export default defineEventHandler(async (event) => {
  const serviceName = getRouterParam(event, 'name')
  if (!serviceName) {
    throw createError({ statusCode: 400, message: 'Service name is required' })
  }

  const body = await readBody<{
    targetName?: string
    paths?: string[]
    studyUid?: string
    callingAeTitle?: string
  }>(event)

  const { targetName, paths, studyUid, callingAeTitle: overrideCallingAe } = body ?? {}

  if (!targetName) {
    throw createError({ statusCode: 400, message: 'Body field "targetName" is required' })
  }

  // ── Resolve source service ────────────────────────────────────────────────
  const allServices = dicomServiceRegistry.getAllServices()
  const sourceService = allServices.find(s => s.id === serviceName || s.name === serviceName)
  if (!sourceService) {
    throw createError({ statusCode: 404, message: `Service "${serviceName}" not found` })
  }

  // ── Resolve target destination ────────────────────────────────────────────
  let resolvedDest: ResolvedDestination

  const internalTarget = allServices.find(s => s.id === targetName || s.name === targetName)
  if (internalTarget) {
    resolvedDest = {
      protocol: 'dimse',
      addr: `127.0.0.1:${internalTarget.config.port}`,
      calledAeTitle: internalTarget.config.callingAETitle,
      callingAeTitle: overrideCallingAe ?? 'STORE-SCU',
    }
  }
  else {
    const runtimeConfig = useRuntimeConfig()
    const dicomConfig = runtimeConfig.dicom as Record<string, unknown>
    const externalDests = dicomConfig.destinations as ExternalDicomDestination[] | undefined
    const externalTarget = externalDests?.find(d => d.name === targetName)
    if (!externalTarget) {
      throw createError({ statusCode: 404, message: `Destination "${targetName}" not found` })
    }
    if (externalTarget.protocol === 'dicomweb') {
      resolvedDest = {
        protocol: 'dicomweb',
        url: externalTarget.url,
        authorization: externalTarget.authorization,
        headers: externalTarget.headers,
      }
    }
    else {
      resolvedDest = {
        protocol: 'dimse',
        addr: externalTarget.addr,
        calledAeTitle: externalTarget.calledAeTitle,
        callingAeTitle: overrideCallingAe ?? externalTarget.callingAeTitle ?? 'STORE-SCU',
      }
    }
  }

  // ── Determine send mode ───────────────────────────────────────────────────
  type SendMode = 'files' | 'study' | 'all'
  let sendMode: SendMode = 'all'

  if (paths && paths.length > 0) {
    sendMode = 'files'
  }
  else if (studyUid) {
    sendMode = 'study'
  }

  const initialTotal = sendMode === 'files' ? (paths?.length ?? 0) : 0
  const displayAddr = resolvedDest.protocol === 'dimse' ? resolvedDest.addr : resolvedDest.url

  // ── Create job and start background transfer ──────────────────────────────
  const job = storeSCUJobManager.createJob(serviceName, targetName, displayAddr, initialTotal, resolvedDest.protocol)

  runTransfer({
    jobId: job.id,
    dest: resolvedDest,
    outDir: sourceService.config.outDir,
    sendMode,
    filePaths: sendMode === 'files' ? (paths ?? []) : null,
    studyUid: sendMode === 'study' ? studyUid : undefined,
  }).catch((err: unknown) => {
    storeSCUJobManager.update(job.id, {
      status: 'failed',
      error: err instanceof Error ? err.message : String(err),
      completedAt: new Date(),
    })
  })

  return { jobId: job.id }
})

// ── Types ─────────────────────────────────────────────────────────────────────

type ResolvedDestination
  = | { protocol: 'dimse', addr: string, calledAeTitle?: string, callingAeTitle?: string }
    | { protocol: 'dicomweb', url: string, authorization?: string, headers?: Record<string, string> }

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveOutDir(outDir: string): string {
  if (outDir.startsWith('~/')) {
    return join(homedir(), outDir.slice(2))
  }
  return resolve(outDir)
}

function storageKeyToPath(resolvedOutDir: string, key: string): string {
  return join(resolvedOutDir, key.replace(/:/g, '/'))
}

interface TransferOptions {
  jobId: string
  dest: ResolvedDestination
  outDir: string
  sendMode: 'files' | 'study' | 'all'
  filePaths: string[] | null
  studyUid?: string
}

async function runTransfer(opts: TransferOptions): Promise<void> {
  const { jobId, dest, outDir, sendMode, filePaths, studyUid } = opts

  storeSCUJobManager.update(jobId, { status: 'running' })

  const resolvedOutDir = resolveOutDir(outDir)

  if (dest.protocol === 'dicomweb') {
    await runStowRsTransfer({ jobId, dest, resolvedOutDir, sendMode, filePaths, studyUid })
  }
  else {
    await runDimseTransfer({ jobId, dest, resolvedOutDir, sendMode, filePaths, studyUid })
  }
}

// ── DIMSE (C-STORE) transfer ──────────────────────────────────────────────────

async function runDimseTransfer(opts: {
  jobId: string
  dest: Extract<ResolvedDestination, { protocol: 'dimse' }>
  resolvedOutDir: string
  sendMode: 'files' | 'study' | 'all'
  filePaths: string[] | null
  studyUid?: string
}): Promise<void> {
  const { jobId, dest, resolvedOutDir, sendMode, filePaths, studyUid } = opts

  const addr = dest.calledAeTitle ? `${dest.calledAeTitle}@${dest.addr}` : dest.addr
  const scu = new StoreScu({ addr, callingAeTitle: dest.callingAeTitle ?? 'STORE-SCU' })

  if (sendMode === 'files' && filePaths) {
    for (const key of filePaths) scu.addFile(storageKeyToPath(resolvedOutDir, key))
  }
  else if (sendMode === 'study' && studyUid) {
    scu.addFolder(join(resolvedOutDir, studyUid))
  }
  else {
    scu.addFolder(resolvedOutDir)
  }

  let total = filePaths?.length ?? 0
  let sent = 0
  let failed = 0

  const results = await scu.send({
    onTransferStarted: (_err, ev) => {
      total = ev.data?.totalFiles ?? total
      storeSCUJobManager.update(jobId, { progress: { sent, failed, total } })
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

// ── DICOMweb STOW-RS transfer ─────────────────────────────────────────────────

const STOW_BOUNDARY = 'dicom-boundary'

async function runStowRsTransfer(opts: {
  jobId: string
  dest: Extract<ResolvedDestination, { protocol: 'dicomweb' }>
  resolvedOutDir: string
  sendMode: 'files' | 'study' | 'all'
  filePaths: string[] | null
  studyUid?: string
}): Promise<void> {
  const { jobId, dest, resolvedOutDir, sendMode, filePaths, studyUid } = opts
  const { readdirSync, statSync } = await import('node:fs')

  // Collect absolute filesystem paths of all files to send
  let absolutePaths: string[] = []

  if (sendMode === 'files' && filePaths) {
    absolutePaths = filePaths.map(k => storageKeyToPath(resolvedOutDir, k))
  }
  else if (sendMode === 'study' && studyUid) {
    absolutePaths = collectDicomFiles(join(resolvedOutDir, studyUid), readdirSync, statSync)
  }
  else {
    absolutePaths = collectDicomFiles(resolvedOutDir, readdirSync, statSync)
  }

  const total = absolutePaths.length
  storeSCUJobManager.update(jobId, { progress: { sent: 0, failed: 0, total } })

  // STOW-RS: POST each file individually to keep memory usage low.
  // The standard also allows batching multiple instances per request.
  const stowUrl = dest.url.replace(/\/$/, '') + '/studies' + (studyUid ? `/${studyUid}` : '')
  const extraHeaders = dest.headers ?? {}

  let sent = 0
  let failed = 0
  const results: Array<{ status: string, message: string }> = []

  for (const filePath of absolutePaths) {
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
        // 409 = Conflict (duplicate), still counts as "stored"
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
  }

  storeSCUJobManager.update(jobId, {
    status: 'completed',
    results,
    progress: { sent, failed, total },
    completedAt: new Date(),
  })
}

function collectDicomFiles(
  dir: string,
  readdirSync: (p: string) => string[],
  statSync: (p: string) => { isDirectory(): boolean },
): string[] {
  const result: string[] = []
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) {
        result.push(...collectDicomFiles(full, readdirSync, statSync))
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
