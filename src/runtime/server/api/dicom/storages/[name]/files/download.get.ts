import { defineEventHandler, getRouterParam, createError, getQuery, useStorage, setResponseHeaders } from '#imports'

/**
 * GET /api/dicom/storages/:name/files/download?key=KEY
 *
 * Download a specific file from named storage.
 * The `key` query parameter is an unstorage key.
 */
export default defineEventHandler(async (event) => {
  const storageName = getRouterParam(event, 'name')
  if (!storageName) {
    throw createError({ statusCode: 400, message: 'Storage name is required' })
  }

  const { key } = getQuery(event) as { key?: string }
  if (!key) {
    throw createError({ statusCode: 400, message: 'Query parameter "key" is required' })
  }

  const storage = useStorage(`dicom-storage:${storageName}`)
  const content = await storage.getItemRaw(key)

  if (!content) {
    throw createError({ statusCode: 404, message: 'File not found' })
  }

  const fileName = key.split(':').pop() ?? key
  const ext = fileName.split('.').pop()?.toLowerCase()
  const contentType = ext === 'dcm' ? 'application/dicom' : 'application/octet-stream'

  setResponseHeaders(event, {
    'Content-Type': contentType,
    'Content-Disposition': `attachment; filename="${fileName}"`,
    'Content-Length': String((content as Buffer).byteLength),
  })

  return content
})
