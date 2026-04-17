import { createEventStream, defineEventHandler } from 'h3'
import { storeSCUJobManager } from '#imports'

/**
 * GET /sse/dicom/jobs
 *
 * Server-Sent Events stream for background job progress.
 *
 * Protocol:
 *   { type: 'snapshot', jobs: StoreSCUJob[] }   – sent once on connect
 *   { type: 'update',   job:  StoreSCUJob  }    – sent on every state change
 */
export default defineEventHandler(async (event) => {
  const stream = createEventStream(event)

  // Send initial snapshot of all current jobs
  const snapshot = storeSCUJobManager.getAllJobs()
  await stream.push({ data: JSON.stringify({ type: 'snapshot', jobs: snapshot }) })

  // Stream every subsequent job mutation
  const unsubscribe = storeSCUJobManager.subscribeAll((job) => {
    stream.push({ data: JSON.stringify({ type: 'update', job }) }).catch(() => {})
  })

  stream.onClosed(() => {
    unsubscribe()
  })

  return stream.send()
})
