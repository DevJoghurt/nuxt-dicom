import { defineEventHandler } from '#imports'

/**
 * GET /api/dicom/handlers
 * Get all registered DICOM event handlers
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const handlers = config.dicom?.handlers || []

  return {
    total: handlers.length,
    handlers: handlers.map((handler: any) => ({
      serviceName: handler.serviceName,
      eventType: handler.eventType,
      eventId: handler.eventId,
      name: handler.name || 'Unnamed',
      description: handler.description || '',
    })),
  }
})
