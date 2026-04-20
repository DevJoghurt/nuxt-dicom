import { defineEventHandler, getRouterParam, createError, dicomServiceRegistry, storeSCPServiceManager, getStorageByName } from '#imports'

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
      // Service-specific config
      port: config.port,
      callingAETitle: config.callingAETitle,
      autoStart: config.autoStart,
      maxPduLength: config.maxPduLength,
      verbose: config.verbose,
      studyTimeout: config.studyTimeout,
      strict: config.strict,
      abstractSyntaxMode: config.abstractSyntaxMode,
      abstractSyntaxes: config.abstractSyntaxes,
      transferSyntaxMode: config.transferSyntaxMode,
      transferSyntaxes: config.transferSyntaxes,
      extractTags: config.extractTags,
      // Storage — resolved from the named storage registry when storageKey is present,
      // falling back to the merged values for inline/legacy configs
      storage: (() => {
        const storageKey = config.storageKey
        const registryEntry = storageKey ? getStorageByName(storageKey) : undefined
        return {
          key: storageKey,
          backend: registryEntry?.storageBackend ?? config.storageBackend,
          outDir: registryEntry?.outDir ?? config.outDir,
          storeWithFileMeta: registryEntry?.storeWithFileMeta ?? config.storeWithFileMeta,
          autoDeleteAfterDays: registryEntry?.autoDeleteAfterDays ?? config.autoDeleteAfterDays,
        }
      })(),
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
