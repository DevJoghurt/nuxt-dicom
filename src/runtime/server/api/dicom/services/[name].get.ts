import { defineEventHandler, getRouterParam, createError, dicomServiceRegistry, storeSCPServiceManager } from '#imports'

/**
 * GET /api/dicom/services/[name]
 * Get details of a specific DICOM service
 */
export default defineEventHandler(async (event) => {
  try {
    const name = getRouterParam(event, 'name')
    if (!name) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Service name is required',
      })
    }

    const service = dicomServiceRegistry.getService(name)
    if (!service) {
      throw createError({
        statusCode: 404,
        statusMessage: `Service "${name}" not found`,
      })
    }

    const isRunning = storeSCPServiceManager.isRunning(name)

    return {
      id: service.id,
      name,
      type: service.type,
      status: isRunning ? 'running' : 'stopped',
      createdAt: service.createdAt,
      startedAt: service.startedAt,
      config: service.config,
    }
  }
  catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }
    const message = error instanceof Error ? error.message : String(error)
    throw createError({
      statusCode: 500,
      statusMessage: message,
    })
  }
})
