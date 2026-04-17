import { randomUUID } from 'node:crypto'
import { BaseJobManager } from './BaseJobManager'
import type { BaseJobStatus } from './BaseJobManager'

export type JobStatus = BaseJobStatus
export type DestinationProtocol = 'dimse' | 'dicomweb'

export interface StoreSCUJobProgress {
  sent: number
  failed: number
  total: number
}

export interface StoreSCUJob {
  id: string
  type: 'storeSCU'
  status: JobStatus
  label: string
  protocol: DestinationProtocol
  sourceService: string
  targetName: string
  targetAddr: string
  progress: StoreSCUJobProgress
  results?: Array<{ status: string, message: string }>
  error?: string
  startedAt: Date
  updatedAt: Date
  completedAt?: Date
}

class StoreSCUJobManager extends BaseJobManager<StoreSCUJob> {
  constructor() {
    super(3) // max 3 concurrent C-STORE / STOW-RS transfers
  }

  createJob(
    sourceService: string,
    targetName: string,
    targetAddr: string,
    total: number,
    protocol: DestinationProtocol = 'dimse',
  ): StoreSCUJob {
    const now = new Date()
    const job: StoreSCUJob = {
      id: randomUUID(),
      type: 'storeSCU',
      status: 'queued',
      label: `${sourceService} → ${targetName}`,
      protocol,
      sourceService,
      targetName,
      targetAddr,
      progress: { sent: 0, failed: 0, total },
      startedAt: now,
      updatedAt: now,
    }
    this._addJob(job)
    return job
  }
}

export const storeSCUJobManager = new StoreSCUJobManager()
