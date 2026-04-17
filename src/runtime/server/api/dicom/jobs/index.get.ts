import { defineEventHandler, storeSCUJobManager, dicomRetrieveJobManager } from '#imports'

/**
 * GET /api/dicom/jobs
 *
 * Returns a snapshot of all background jobs (running, queued, and recent).
 * Merges Store-SCU transfer jobs and PACS retrieve jobs, sorted newest first.
 */
export default defineEventHandler(() => {
  const storeJobs = storeSCUJobManager.getAllJobs()
  const retrieveJobs = dicomRetrieveJobManager.getAllJobs()
  return [...storeJobs, ...retrieveJobs].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  )
})
