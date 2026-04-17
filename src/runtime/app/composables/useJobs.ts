import { ref, computed, readonly, onMounted, onBeforeUnmount } from '#imports'

// ── Shared types ──────────────────────────────────────────────────────────────

export type DicomJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
export type DestinationProtocol = 'dimse' | 'dicomweb'

export interface DicomJobProgress {
  sent: number
  failed: number
  total: number
}

export interface DicomJob {
  id: string
  type: string
  status: DicomJobStatus
  label: string
  /** ISO date string after JSON serialisation */
  startedAt: string
  updatedAt: string
  completedAt?: string
  error?: string
  // StoreSCU-specific fields
  protocol?: DestinationProtocol
  sourceService?: string
  targetName?: string
  targetAddr?: string
  progress?: DicomJobProgress
  results?: Array<{ status: string, message: string }>
}

type WsMessage =
  | { type: 'snapshot', jobs: DicomJob[] }
  | { type: 'update', job: DicomJob }
  | { type: 'pong' }

// ── Module-level singleton ─────────────────────────────────────────────────────
// All calls to useJobs() share one WebSocket and one set of reactive refs.

const _jobs = ref<DicomJob[]>([])
const _isConnected = ref(false)
const _error = ref<string | null>(null)
let _ws: WebSocket | null = null
let _reconnectTimer: ReturnType<typeof setTimeout> | null = null
let _refCount = 0

function _upsert(job: DicomJob): void {
  const idx = _jobs.value.findIndex(j => j.id === job.id)
  if (idx >= 0) {
    _jobs.value[idx] = job
  }
  else {
    _jobs.value.unshift(job)
  }
}

function _connect(): void {
  if (_ws) return
  try {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    _ws = new WebSocket(`${protocol}//${window.location.host}/ws/dicom/jobs`)

    _ws.onopen = () => {
      _isConnected.value = true
      _error.value = null
    }

    _ws.onmessage = (event: MessageEvent): void => {
      try {
        const msg = JSON.parse(event.data as string) as WsMessage
        if (msg.type === 'snapshot') {
          _jobs.value = msg.jobs
        }
        else if (msg.type === 'update') {
          _upsert(msg.job)
        }
      }
      catch { /* ignore parse errors */ }
    }

    _ws.onerror = () => {
      _isConnected.value = false
      _error.value = 'Reconnecting…'
    }

    _ws.onclose = () => {
      _isConnected.value = false
      _ws = null
      // Auto-reconnect after 3 s
      _reconnectTimer = setTimeout(_connect, 3000)
    }
  }
  catch (err) {
    _error.value = err instanceof Error ? err.message : 'Connection failed'
  }
}

function _disconnect(): void {
  if (_reconnectTimer) {
    clearTimeout(_reconnectTimer)
    _reconnectTimer = null
  }
  _ws?.close()
  _ws = null
  _isConnected.value = false
}

// ── Display helpers ────────────────────────────────────────────────────────────

export function progressPercent(job: DicomJob): number {
  const p = job.progress
  if (!p || p.total === 0) return 0
  return Math.round(((p.sent + p.failed) / p.total) * 100)
}

export function elapsedLabel(job: DicomJob): string {
  const start = new Date(job.startedAt).getTime()
  const end = job.completedAt ? new Date(job.completedAt).getTime() : Date.now()
  const ms = end - start
  if (ms < 1000) return '<1s'
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`
}

// ── Composable ─────────────────────────────────────────────────────────────────

export function useJobs() {
  // Reference-count so the connection lives as long as any component is mounted
  onMounted(() => {
    _refCount++
    if (_refCount === 1) _connect()
  })

  onBeforeUnmount(() => {
    _refCount = Math.max(0, _refCount - 1)
    if (_refCount === 0) _disconnect()
  })

  const activeJobs = computed(() =>
    _jobs.value.filter(j => j.status === 'running' || j.status === 'queued'),
  )
  const runningJobs = computed(() => _jobs.value.filter(j => j.status === 'running'))
  const queuedJobs = computed(() => _jobs.value.filter(j => j.status === 'queued'))
  const completedJobs = computed(() => _jobs.value.filter(j => j.status === 'completed'))
  const failedJobs = computed(() => _jobs.value.filter(j => j.status === 'failed'))

  const activeCount = computed(() => activeJobs.value.length)
  const hasRunning = computed(() => runningJobs.value.length > 0)
  const hasQueued = computed(() => queuedJobs.value.length > 0)
  const hasFailed = computed(() => failedJobs.value.length > 0)

  function clearCompleted(): void {
    _jobs.value = _jobs.value.filter(j => j.status !== 'completed')
  }

  return {
    jobs: readonly(_jobs),
    activeJobs,
    runningJobs,
    queuedJobs,
    completedJobs,
    failedJobs,
    activeCount,
    hasRunning,
    hasQueued,
    hasFailed,
    isConnected: readonly(_isConnected),
    error: readonly(_error),
    clearCompleted,
    progressPercent,
    elapsedLabel,
  }
}
