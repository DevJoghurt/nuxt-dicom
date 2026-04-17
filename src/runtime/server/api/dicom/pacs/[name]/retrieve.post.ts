import { defineEventHandler, getRouterParam, readBody, createError } from '#imports'
import { useDicomRetrieve } from '../../../../utils/dicomRetrieve'

/**
 * POST /api/dicom/pacs/:name/retrieve
 *
 * Initiate a non-blocking PACS retrieve operation (C-GET or C-MOVE) for a study.
 * Returns a job ID immediately; track progress via the jobs API or WebSocket.
 *
 * Body:
 *   studyUid          {string}               Study Instance UID to retrieve
 *   method            {'c-get'|'c-move'}     Retrieve method
 *   destinationName   {string}               Target storage or StoreSCP service name
 *   destinationType   {'storage'|'service'}  Whether the destination is a storage or service
 *   queryModel?       {'StudyRoot'|'PatientRoot'} Override query/retrieve information model
 *
 * C-GET notes:
 *   - destinationType 'storage': files are written to that storage's outDir
 *   - destinationType 'service': files are forwarded in-memory to the running StoreSCP
 *
 * C-MOVE notes:
 *   - destinationType must be 'service' (a running StoreSCP)
 *   - The destination AE title must be pre-configured in the source PACS
 */
export default defineEventHandler(async (event) => {
  const pacsName = getRouterParam(event, 'name')
  if (!pacsName) {
    throw createError({ statusCode: 400, message: 'PACS name is required' })
  }

  const body = await readBody<{
    studyUid?: string
    method?: 'c-get' | 'c-move'
    destinationName?: string
    destinationType?: 'storage' | 'service'
    queryModel?: 'StudyRoot' | 'PatientRoot'
  }>(event)

  if (!body?.studyUid) {
    throw createError({ statusCode: 400, message: 'Body field "studyUid" is required' })
  }
  if (!body?.method || !['c-get', 'c-move'].includes(body.method)) {
    throw createError({ statusCode: 400, message: 'Body field "method" must be "c-get" or "c-move"' })
  }
  if (!body?.destinationName) {
    throw createError({ statusCode: 400, message: 'Body field "destinationName" is required' })
  }
  if (!body?.destinationType || !['storage', 'service'].includes(body.destinationType)) {
    throw createError({ statusCode: 400, message: 'Body field "destinationType" must be "storage" or "service"' })
  }

  const { enqueue } = useDicomRetrieve()
  const job = await enqueue(pacsName, {
    studyUid: body.studyUid,
    method: body.method,
    destinationName: body.destinationName,
    destinationType: body.destinationType,
    queryModel: body.queryModel,
  })

  return { jobId: job.id }
})
