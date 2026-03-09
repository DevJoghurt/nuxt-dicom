import { randomUUID } from 'node:crypto'

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed'
export type DestinationProtocol = 'dimse' | 'dicomweb'

export interface StoreSCUJobProgress {
  sent: number
  failed: number
  total: number
}

export interface StoreSCUJob {
  id: string
  status: JobStatus
  protocol: DestinationProtocol
  sourceService: string
  targetName: string
  targetAddr: string
  progress: StoreSCUJobProgress
  results?: Array<{ status: string, message: string }>
  error?: string
  startedAt: Date
  completedAt?: Date
}

type JobListener = (job: StoreSCUJob) => void

class StoreSCUJobManager {
  private jobs = new Map<string, StoreSCUJob>()
  private listeners = new Map<string, Set<JobListener>>()

  createJob(
    sourceService: string,
    targetName: string,
    targetAddr: string,
    total: number,
    protocol: DestinationProtocol = 'dimse',
  ): StoreSCUJob {
    const job: StoreSCUJob = {
      id: randomUUID(),
      status: 'pending',
      protocol,
      sourceService,
      targetName,
      targetAddr,
      progress: { sent: 0, failed: 0, total },
      startedAt: new Date(),
    }
    this.jobs.set(job.id, job)
    return job
  }

  getJob(id: string): StoreSCUJob | undefined {
    return this.jobs.get(id)
  }

  getAllJobs(): StoreSCUJob[] {
    return Array.from(this.jobs.values())
  }

  update(id: string, updates: Partial<StoreSCUJob>): void {
    const job = this.jobs.get(id)
    if (!job) return
    Object.assign(job, updates)
    this.notify(id)
  }

  /**
   * Subscribe to job updates. Returns an unsubscribe function.
   */
  subscribe(jobId: string, listener: JobListener): () => void {
    if (!this.listeners.has(jobId)) {
      this.listeners.set(jobId, new Set())
    }
    this.listeners.get(jobId)!.add(listener)
    return () => {
      this.listeners.get(jobId)?.delete(listener)
    }
  }

  private notify(jobId: string): void {
    const job = this.jobs.get(jobId)
    if (!job) return
    this.listeners.get(jobId)?.forEach(fn => fn(job))
  }

  /**
   * Remove completed/failed jobs older than 1 hour to prevent memory leaks.
   */
  cleanup(): void {
    const threshold = new Date(Date.now() - 3_600_000)
    for (const [id, job] of this.jobs) {
      if (job.completedAt && job.completedAt < threshold) {
        this.jobs.delete(id)
        this.listeners.delete(id)
      }
    }
  }
}

export const storeSCUJobManager = new StoreSCUJobManager()
