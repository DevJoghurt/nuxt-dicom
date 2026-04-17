import fastq from 'fastq'
import type { queueAsPromised } from 'fastq'

export type BaseJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface BaseJob {
  id: string
  type: string
  status: BaseJobStatus
  label: string
  startedAt: Date
  updatedAt: Date
  completedAt?: Date
  error?: string
}

type JobListener<T extends BaseJob> = (job: T) => void

interface QueueItem {
  jobId: string
  fn: () => Promise<void>
}

/**
 * Generic base class for background job management backed by fastq.
 *
 * Provides:
 * - A battle-tested concurrency-limited FIFO queue (fastq.promise)
 * - Per-job and global subscriber notifications for SSE streaming
 * - Graceful shutdown: drain running jobs before the Nitro server closes
 * - Automatic cleanup of old completed/failed/cancelled jobs
 *
 * Sub-classes extend this with job-specific fields and call `_addJob()` +
 * `enqueue()` from their own `createJob()` factory.
 */
export class BaseJobManager<T extends BaseJob> {
  private _jobs = new Map<string, T>()
  private _perJobListeners = new Map<string, Set<JobListener<T>>>()
  private _globalListeners = new Set<JobListener<T>>()
  /** fastq promise-based queue. Worker calls the job fn and handles errors. */
  private _queue: queueAsPromised<QueueItem>
  /** Prevents new jobs from being enqueued after shutdown() is called. */
  private _shuttingDown = false

  constructor(maxConcurrent = 3) {
    this._queue = fastq.promise<QueueItem>(this._worker.bind(this), maxConcurrent)
  }

  get concurrency(): number {
    return this._queue.concurrency
  }

  get isShuttingDown(): boolean {
    return this._shuttingDown
  }

  private async _worker(item: QueueItem): Promise<void> {
    try {
      await item.fn()
    }
    catch (err: unknown) {
      // Safety-net: if fn throws without setting a terminal status, mark failed
      const job = this._jobs.get(item.jobId)
      if (job && job.status === 'running') {
        this.update(item.jobId, {
          status: 'failed',
          error: err instanceof Error ? err.message : String(err),
          completedAt: new Date(),
        } as Partial<T>)
      }
    }
  }

  /** Register a new job object. Call from the sub-class factory. */
  protected _addJob(job: T): void {
    this._jobs.set(job.id, job)
    this._notify(job)
  }

  // ── Query ──────────────────────────────────────────────────────────────────

  getJob(id: string): T | undefined {
    return this._jobs.get(id)
  }

  getAllJobs(): T[] {
    return Array.from(this._jobs.values()).sort(
      (a, b) => b.startedAt.getTime() - a.startedAt.getTime(),
    )
  }

  /** Number of jobs actively being processed (not counting queued ones). */
  running(): number {
    return this._queue.running()
  }

  /** Number of jobs waiting in the queue (not yet started). */
  queued(): number {
    return this._queue.length()
  }

  // ── Mutation ───────────────────────────────────────────────────────────────

  update(id: string, updates: Partial<T>): void {
    const job = this._jobs.get(id)
    if (!job) return
    Object.assign(job, { ...updates, updatedAt: new Date() })
    this._notify(job)
    this._perJobListeners.get(id)?.forEach(fn => fn(job))
  }

  // ── Queue ──────────────────────────────────────────────────────────────────

  /**
   * Enqueue a job for execution, honouring the concurrency limit.
   * `fn` is responsible for updating the job status (running → completed/failed).
   * The base class provides only a final safety-net catch.
   * New jobs are silently ignored once `shutdown()` has been called.
   */
  enqueue(jobId: string, fn: () => Promise<void>): void {
    if (!this._jobs.has(jobId) || this._shuttingDown) return
    // Push but intentionally don't await — callers use subscribe() for progress
    this._queue.push({ jobId, fn }).catch(() => {
      // Error already handled inside _worker; ignore the queue-level rejection
    })
  }

  // ── Subscriptions ──────────────────────────────────────────────────────────

  /** Subscribe to updates for a single job. Returns an unsubscribe function. */
  subscribe(jobId: string, listener: JobListener<T>): () => void {
    if (!this._perJobListeners.has(jobId)) {
      this._perJobListeners.set(jobId, new Set())
    }
    this._perJobListeners.get(jobId)!.add(listener)
    return () => this._perJobListeners.get(jobId)?.delete(listener)
  }

  /**
   * Subscribe to ALL job mutations — used by the SSE endpoint so it can push
   * every state change to connected clients. Returns an unsubscribe function.
   */
  subscribeAll(listener: JobListener<T>): () => void {
    this._globalListeners.add(listener)
    return () => this._globalListeners.delete(listener)
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  /**
   * Graceful shutdown.
   * Stops accepting new jobs and waits for all currently running and queued
   * jobs to finish before resolving. Call this from your Nitro `close` hook.
   */
  async shutdown(): Promise<void> {
    this._shuttingDown = true
    if (this._queue.idle()) return
    await this._queue.drained()
  }

  /**
   * Remove finished jobs older than `maxAgeMs` (default 1 hour) to prevent
   * unbounded memory growth. Called by the scheduled cleanup plugin.
   */
  cleanup(maxAgeMs = 3_600_000): void {
    const threshold = new Date(Date.now() - maxAgeMs)
    for (const [id, job] of this._jobs) {
      if (
        (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled')
        && job.completedAt
        && job.completedAt < threshold
      ) {
        this._jobs.delete(id)
        this._perJobListeners.delete(id)
      }
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private _notify(job: T): void {
    this._globalListeners.forEach(fn => fn(job))
  }
}
