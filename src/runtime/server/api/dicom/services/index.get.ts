import { defineEventHandler, storeSCPServiceManager, dicomServiceRegistry, createError } from '#imports'

/**
 * GET /api/dicom/services
 * Get all DICOM services with their status and metadata
 */
export default defineEventHandler(async (event) => {
  try {
    const registeredServices = dicomServiceRegistry.getAllServices()

    const services = registeredServices.map(service => ({
      name: service.name,
      id: service.id,
      port: service.config.port,
      callingAETitle: service.config.callingAETitle,
      outDir: service.config.outDir,
      autoStart: service.config.autoStart,
      status: service.status,
      isRunning: storeSCPServiceManager.isRunning(service.id),
      createdAt: service.createdAt,
      startedAt: service.startedAt,
      eventHandlers: service.config?.eventHandlers || {},
    }))
    return services
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw createError({
      statusCode: 500,
      statusMessage: message,
    })
  }
})
