import { randomUUID } from 'node:crypto'
import { BaseJobManager } from './BaseJobManager'
import type { BaseJobStatus } from './BaseJobManager'

export type DicomRetrieveJobStatus = BaseJobStatus
export type DicomRetrieveMethod = 'c-get' | 'c-move'

export interface DicomRetrieveJobProgress {
  /** Completed sub-operations — mapped to "sent" for JobCard compatibility */
  sent: number
  failed: number
  total: number
}

export interface DicomRetrieveJob {
  id: string
  type: 'pacs-retrieve'
  status: DicomRetrieveJobStatus
  label: string
  method: DicomRetrieveMethod
  pacsName: string
  studyUid: string
  destinationName: string
  /** Human-readable destination info (addr or service name) */
  targetAddr: string
  progress: DicomRetrieveJobProgress
  results?: Array<{ status: string, message: string }>
  error?: string
  startedAt: Date
  updatedAt: Date
  completedAt?: Date
}

class DicomRetrieveJobManager extends BaseJobManager<DicomRetrieveJob> {
  constructor() {
    super(2) // max 2 concurrent C-GET/C-MOVE retrieve operations
  }

  createJob(
    pacsName: string,
    studyUid: string,
    method: DicomRetrieveMethod,
    destinationName: string,
    targetAddr: string,
  ): DicomRetrieveJob {
    const now = new Date()
    const methodLabel = method === 'c-get' ? 'C-GET' : 'C-MOVE'
    const shortUid = studyUid.length > 20 ? `…${studyUid.slice(-20)}` : studyUid
    const job: DicomRetrieveJob = {
      id: randomUUID(),
      type: 'pacs-retrieve',
      status: 'queued',
      label: `${pacsName} → ${destinationName} [${methodLabel}] ${shortUid}`,
      method,
      pacsName,
      studyUid,
      destinationName,
      targetAddr,
      progress: { sent: 0, failed: 0, total: 0 },
      startedAt: now,
      updatedAt: now,
    }
    this._addJob(job)
    return job
  }
}

export const dicomRetrieveJobManager = new DicomRetrieveJobManager()
