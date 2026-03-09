import { defineEventHandler, getRouterParam, createError, storeSCUJobManager } from '#imports'
import type { StoreSCUJob } from '../../../../../utils/storeSCUJobManager'
import { createEventStream } from 'h3'

/**
 * GET /api/dicom/jobs/:jobId/events
 *
 * Server-Sent Events stream for a store-SCU transfer job.
 * Pushes a snapshot immediately, then streams status/progress updates until
 * the job reaches a terminal state (completed or failed).
 *
 * Each SSE message has:
 *   event: current job status ('running' | 'completed' | 'failed')
 *   data:  JSON-serialised StoreSCUJob snapshot
 */
export default defineEventHandler(async (event) => {
  const jobId = getRouterParam(event, 'jobId')
  if (!jobId) {
    throw createError({ statusCode: 400, message: 'Job ID is required' })
  }

  const job = storeSCUJobManager.getJob(jobId)
  if (!job) {
    throw createError({ statusCode: 404, message: `Job "${jobId}" not found` })
  }

  const stream = createEventStream(event)

  // Push the current snapshot immediately so the client has a baseline
  await stream.push({ event: job.status, data: JSON.stringify(job) })

  // If the job is already finished, close after the initial push
  if (job.status === 'completed' || job.status === 'failed') {
    await stream.close()
    return stream.send()
  }

  const unsubscribe = storeSCUJobManager.subscribe(jobId, async (updatedJob: StoreSCUJob) => {
    try {
      await stream.push({ event: updatedJob.status, data: JSON.stringify(updatedJob) })
      if (updatedJob.status === 'completed' || updatedJob.status === 'failed') {
        await stream.close()
      }
    }
    catch {
      // Client disconnected — stream.onClosed will handle cleanup
    }
  })

  stream.onClosed(() => {
    unsubscribe()
  })

  return stream.send()
})
