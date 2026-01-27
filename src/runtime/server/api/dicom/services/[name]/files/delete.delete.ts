import { defineEventHandler, getRouterParam, createError, getQuery, useStorage } from '#imports'

/**
 * DELETE /api/dicom/services/:name/files/delete?path=...
 * Delete a specific file from DICOM service storage
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

    // Check if file exists
    const exists = await storage.hasItem(path)
    if (!exists) {
      throw createError({
        statusCode: 404,
        message: 'File not found',
      })
    }

    // Delete the file
    await storage.removeItem(path)

    return {
      success: true,
      message: 'File deleted successfully',
      path,
    }
  }
  catch (error) {
    if ((error as any).statusCode) {
      throw error
    }

    console.error(`[nuxt-dicom] Error deleting file from ${serviceName}:`, error)
    throw createError({
      statusCode: 500,
      message: `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }
})
