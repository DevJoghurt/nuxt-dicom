import { defineEventHandler, useRuntimeConfig } from '#imports'

/**
 * GET /api/dicom/handlers
 * Get all registered DICOM event handlers
 */
export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const handlers = (config.dicom?.handlers as Array<Record<string, unknown>>) || []

  return {
    total: handlers.length,
    handlers: handlers.map((handler: Record<string, unknown>) => ({
      serviceName: handler.serviceName,
      eventType: handler.eventType,
      eventId: handler.eventId,
      name: handler.name || 'Unnamed',
      description: handler.description || '',
    })),
  }
})
