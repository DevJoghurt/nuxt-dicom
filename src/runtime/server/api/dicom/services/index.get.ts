import { defineEventHandler, storeSCPServiceManager, dicomServiceRegistry, createError, useRuntimeConfig } from '#imports'
import type { ExternalDicomDestination } from '../../../../utils/schema'

/**
 * GET /api/dicom/services
 * Get all DICOM services (internal StoreSCP + external send targets) with status
 */
export default defineEventHandler(async () => {
  try {
    // ── Internal StoreSCP services ──────────────────────────────────────────
    const registeredServices = dicomServiceRegistry.getAllServices()
    const internalServices = registeredServices.map(service => ({
      kind: 'storeScp' as const,
      name: service.name,
      id: service.id,
      port: service.config.port,
      callingAETitle: service.config.callingAETitle,
      outDir: service.config.outDir,
      autoStart: service.config.autoStart,
      storageKey: service.config.storageKey,
      status: service.status,
      isRunning: storeSCPServiceManager.isRunning(service.id),
      createdAt: service.createdAt,
      startedAt: service.startedAt,
      eventHandlers: service.config?.eventHandlers || {},
    }))

    // ── External services from runtime config ───────────────────────────────
    const runtimeConfig = useRuntimeConfig()
    const dicomConfig = runtimeConfig.dicom as Record<string, unknown>
    const external = (dicomConfig?.destinations as ExternalDicomDestination[] | undefined) ?? []

    const externalServices = external.map(dest => ({
      kind: 'external' as const,
      name: dest.name,
      label: dest.label ?? dest.name,
      protocol: dest.protocol,
      addr: dest.protocol === 'dicomweb' ? dest.url : dest.addr,
      calledAeTitle: dest.protocol === 'dimse' ? dest.calledAeTitle : undefined,
      callingAeTitle: dest.protocol === 'dimse' ? dest.callingAeTitle : undefined,
      description: dest.description,
    }))

    return [...internalServices, ...externalServices]
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw createError({
      statusCode: 500,
      statusMessage: message,
    })
  }
})
