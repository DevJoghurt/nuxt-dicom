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
    const config = service.config

    // Convert event handlers Map to Record for JSON serialization
    const eventHandlers: Record<string, string[]> = {}
    for (const [eventId, handlerNames] of service.eventHandlers) {
      eventHandlers[eventId] = handlerNames
    }

    return {
      id: service.id,
      name: service.name,
      type: service.type,
      status: isRunning ? 'running' : 'stopped',
      isRunning,
      createdAt: service.createdAt,
      startedAt: service.startedAt,
      // Flatten config fields for easier UI access
      port: config.port,
      callingAETitle: config.callingAETitle,
      outDir: config.outDir,
      autoStart: config.autoStart,
      maxPduLength: config.maxPduLength,
      storageBackend: config.storageBackend,
      storageKey: config.storageKey,
      storeWithFileMeta: config.storeWithFileMeta,
      verbose: config.verbose,
      studyTimeout: config.studyTimeout,
      // Event handlers mapped by event type
      eventHandlers,
      // Include full config for advanced use cases
      config,
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
