import { defineEventHandler, getRouterParam, createError, readBody } from '#imports'
import { useDicomTransfer } from '../../../../utils/dicomSend'

/**
 * POST /api/dicom/services/:name/send
 *
 * Initiate a non-blocking C-STORE SCU transfer from this service's storage to
 * an internal or external DICOM destination. Returns a job ID immediately; use
 * the jobs API (or the WebSocket at /ws/dicom/jobs) to track progress.
 *
 * Body:
 *   targetName        {string}   Name of a registered internal or external destination
 *   paths?            {string[]} Specific unstorage key paths to send (optional)
 *   studyUid?         {string}   Send an entire study by UID (optional)
 *   callingAeTitle?   {string}   Override the calling AE title (optional)
 *   delayBetweenFiles?{number}   ms pause between file sends — see DicomTransferOptions
 *
 * If neither `paths` nor `studyUid` is supplied, all files in the service
 * storage are sent.
 */
export default defineEventHandler(async (event) => {
  const serviceName = getRouterParam(event, 'name')
  if (!serviceName) {
    throw createError({ statusCode: 400, message: 'Service name is required' })
  }

  const body = await readBody<{
    targetName?: string
    paths?: string[]
    studyUid?: string
    callingAeTitle?: string
    delayBetweenFiles?: number
  }>(event)

  if (!body?.targetName) {
    throw createError({ statusCode: 400, message: 'Body field "targetName" is required' })
  }

  const { enqueue } = useDicomTransfer()
  const job = await enqueue(serviceName, body.targetName, {
    paths: body.paths,
    studyUid: body.studyUid,
    callingAeTitle: body.callingAeTitle,
    delayBetweenFiles: body.delayBetweenFiles,
  })

  return { jobId: job.id }
})

