import { ref, computed, readonly } from '#imports'
import { useJobs } from './useJobs'
import type { DicomJob } from './useJobs'

export interface DicomSendOptions {
  /** Send an entire study folder by UID (folder-based transfer) */
  studyUid?: string
  /** Send specific files by their storage key paths */
  paths?: string[]
  /** Override the calling AE title used in C-STORE negotiation */
  callingAeTitle?: string
  /** Delay in milliseconds between sending each file (0 = unlimited speed) */
  delayBetweenFiles?: number
}

export interface DicomSendResult {
  jobId: string
}

/**
 * Composable for triggering DICOM C-STORE / STOW-RS transfers and tracking
 * their live progress via the shared WebSocket job stream.
 *
 * Uses the StoreSCU events (onTransferStarted, onFileSent, onFileError) that
 * are emitted by the server-side transfer worker and pushed over WebSocket.
 *
 * @example
 * const { send, job, isPending, error } = useDicomSend()
 * const jobId = await send('myService', 'pacsTarget', { studyUid: '1.2.3' })
 */
export function useDicomSend() {
  // Shared job stream (WebSocket singleton — connects on first mount, refcounted)
  const { jobs, progressPercent, elapsedLabel } = useJobs()

  const _isPending = ref(false)
  const _jobId = ref<string | null>(null)
  const _error = ref<string | null>(null)

  /** The live job object for the most recently triggered transfer, or null. */
  const job = computed<DicomJob | null>(() =>
    _jobId.value ? ((jobs.value.find(j => j.id === _jobId.value) as DicomJob) ?? null) : null,
  )

  /** true while the POST request to queue the job is in-flight */
  const isPending = readonly(_isPending)

  /** The job ID returned by the server after a successful send request */
  const jobId = readonly(_jobId)

  /** Last POST error message, if any */
  const error = readonly(_error)

  /**
   * Trigger a DICOM transfer from the given source service to the target
   * destination. Returns the job ID immediately; track progress via `job`.
   *
   * @param sourceName  - Name of the StoreSCP service that owns the files
   * @param targetName  - Name of an internal StoreSCP or configured external destination
   * @param options     - studyUid | paths | callingAeTitle
   */
  async function send(
    sourceName: string,
    targetName: string,
    options: DicomSendOptions = {},
  ): Promise<string> {
    _isPending.value = true
    _error.value = null

    try {
      const body: Record<string, unknown> = { targetName }

      if (options.studyUid) body.studyUid = options.studyUid
      if (options.paths?.length) body.paths = options.paths
      if (options.callingAeTitle) body.callingAeTitle = options.callingAeTitle
      if (options.delayBetweenFiles && options.delayBetweenFiles > 0)
        body.delayBetweenFiles = options.delayBetweenFiles

      const result = await $fetch<DicomSendResult>(
        `/api/dicom/services/${encodeURIComponent(sourceName)}/send`,
        { method: 'POST', body },
      )
      _jobId.value = result.jobId
      return result.jobId
    }
    catch (err) {
      _error.value = err instanceof Error ? err.message : String(err)
      throw err
    }
    finally {
      _isPending.value = false
    }
  }

  /** Reset tracked job and error so the composable can be reused */
  function reset() {
    _jobId.value = null
    _error.value = null
  }

  return {
    send,
    reset,
    job,
    jobId,
    isPending,
    error,
    /** Progress 0-100 for the current job */
    progress: computed(() => job.value ? progressPercent(job.value) : 0),
    /** Human-readable elapsed time for the current job */
    elapsed: computed(() => job.value ? elapsedLabel(job.value) : ''),
  }
}
