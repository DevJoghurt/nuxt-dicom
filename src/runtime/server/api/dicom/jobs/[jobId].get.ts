import { defineEventHandler, getRouterParam, createError, storeSCUJobManager } from '#imports'

/**
 * GET /api/dicom/jobs/:jobId
 *
 * Poll the current state of a store-SCU transfer job.
 */
export default defineEventHandler((event) => {
  const jobId = getRouterParam(event, 'jobId')
  if (!jobId) {
    throw createError({ statusCode: 400, message: 'Job ID is required' })
  }

  const job = storeSCUJobManager.getJob(jobId)
  if (!job) {
    throw createError({ statusCode: 404, message: `Job "${jobId}" not found` })
  }

  return job
})
