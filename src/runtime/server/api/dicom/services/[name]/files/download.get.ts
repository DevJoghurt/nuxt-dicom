import { defineEventHandler, getRouterParam, createError, getQuery, useStorage, setResponseHeaders } from '#imports'

/**
 * GET /api/dicom/services/:name/files/download?path=...
 * Download a specific file from DICOM service storage
 */
export default defineEventHandler(async (event) => {
  const serviceName = getRouterParam(event, 'name')
  if (!serviceName) {
    throw createError({
      statusCode: 400,
      message: 'Service name is required',
    })
  }

  const query = getQuery(event)
  const path = query.path as string

  if (!path) {
    throw createError({
      statusCode: 400,
      message: 'File path is required',
    })
  }

  try {
    const storage = useStorage(`dicom:${serviceName}`)

    // Get file content
    const content = await storage.getItemRaw(path)

    if (!content) {
      throw createError({
        statusCode: 404,
        message: 'File not found',
      })
    }

    // Get metadata
    // const meta = await storage.getMeta(path)

    // Set appropriate headers
    setResponseHeaders(event, {
      'Content-Type': 'application/dicom',
      'Content-Disposition': `attachment; filename="${path.split('/').pop()}"`,
      'Content-Length': String(content.length),
    })

    return content
  }
  catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    console.error(`[nuxt-dicom] Error downloading file from ${serviceName}:`, error)
    throw createError({
      statusCode: 500,
      message: `Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }
})
