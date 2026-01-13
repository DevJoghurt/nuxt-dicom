import { defineEventHandler, getRouterParam, createError, dicomServiceRegistry } from '#imports'

/**
 * GET /api/dicom/services/[name]/events
 * Get event handlers and status for a service
 * Note: Events are in-memory and not persisted. For event logging, implement a custom handler.
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

    // Get service to verify it exists
    const service = dicomServiceRegistry.getService(name)
    if (!service) {
      throw createError({
        statusCode: 404,
        statusMessage: `Service "${name}" not found`,
      })
    }

    // Return event handlers configuration for this service
    const eventHandlers = service.config?.eventHandlers || {}
    const eventsList = Object.entries(eventHandlers).map(([eventId, handler]) => ({
      eventId,
      isHandled: !!handler,
    }))

    return {
      service: name,
      message: 'Events are in-memory and not persisted across restarts',
      handlers: eventsList,
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
