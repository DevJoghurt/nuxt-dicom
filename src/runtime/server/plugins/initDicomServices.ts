import { defineNitroPlugin, useRuntimeConfig, storeSCPServiceManager, dicomServiceRegistry } from '#imports'
import type { StoreScpConfig } from '../../utils/schema'

/**
 * Initialize DICOM services on server startup
 * This plugin:
 * 1. Initializes service registry with handlers and configured services
 * 2. Creates and starts StoreSCP services from nuxt.config
 * 3. Registers shutdown hook to gracefully close services on server close
 *
 * Note: Event handlers are registered at build time via module scanning
 */
export default defineNitroPlugin(async (nitro) => {
  // Only run once per server startup
  const g = globalThis as Record<string, unknown>
  if (g.__dicomInitialized) {
    return
  }
  g.__dicomInitialized = true

  try {
    const config = useRuntimeConfig()
    const dicomConfig = config.dicom as Record<string, unknown> | undefined

    // Get handlers and services from runtime config
    const handlers = (dicomConfig?.handlers as Array<Record<string, unknown>>) || []
    const services = (dicomConfig?.services as StoreScpConfig[]) || []

    // Initialize registry with handler metadata
    dicomServiceRegistry.initializeWithHandlers(
      handlers.map(h => ({
        serviceName: String(h.serviceName || ''),
        eventType: String(h.eventType || ''),
        eventId: String(h.eventId || ''),
        name: String(h.name || ''),
        description: h.description ? String(h.description) : undefined,
      })),
    )

    // Register each configured service into the registry
    services.forEach((serviceConfig: StoreScpConfig, idx: number) => {
      if (!serviceConfig || !serviceConfig.port) return

      const serviceId = serviceConfig.name || `storeScp_${idx + 1}`

      dicomServiceRegistry.registerService(
        serviceId,
        'storeScp',
        serviceConfig.name || `Store SCP ${idx + 1}`,
        serviceConfig,
        serviceConfig.eventHandlers as Record<string, string[]>,
      )

      console.log(`[nuxt-dicom] Registered service: ${serviceId}`)
    })

    // Track started services for cleanup
    const startedServices: string[] = []

    // Initialize StoreSCP services - create and optionally start
    for (const serviceConfig of services) {
      if (!serviceConfig || !serviceConfig.port) continue

      // Use the same name that was assigned in module.ts (already in config)
      const serviceName = serviceConfig.name || `storeScp_${services.indexOf(serviceConfig) + 1}`

      try {
        // Create service with configuration from nuxt.config
        await storeSCPServiceManager.createService(serviceName, serviceConfig)

        // Auto-start if configured (default: true)
        if (serviceConfig.autoStart !== false) {
          await storeSCPServiceManager.startService(serviceName)
          startedServices.push(serviceName)
          console.log(`✓ Started StoreSCP service: ${serviceName}`)
        }
      }
      catch (error) {
        console.error(
          `Failed to initialize StoreSCP service "${serviceName}":`,
          error,
        )
      }
    }

    // Register graceful shutdown hook
    nitro.hooks.hook('close', async () => {
      console.log('[nuxt-dicom] Closing DICOM services...')

      // Stop all started services in reverse order
      for (const serviceName of startedServices.reverse()) {
        try {
          await storeSCPServiceManager.stopService(serviceName)
          console.log(`✓ Stopped StoreSCP service: ${serviceName}`)
        }
        catch (error) {
          console.error(
            `Error stopping StoreSCP service "${serviceName}":`,
            error,
          )
        }
      }

      // Clear registry
      dicomServiceRegistry.clear()
      console.log('[nuxt-dicom] DICOM services closed')
    })
  }
  catch (error) {
    console.error('Failed to initialize DICOM services:', error)
  }
})
