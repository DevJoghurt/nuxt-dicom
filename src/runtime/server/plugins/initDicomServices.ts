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
export default defineNitroPlugin((nitro) => {
  console.log('[nuxt-dicom] initDicomServices plugin starting...')

  // Only run once per server startup
  const g = globalThis as Record<string, unknown>
  if (g.__dicomInitialized) {
    console.log('[nuxt-dicom] Already initialized, skipping')
    return
  }
  g.__dicomInitialized = true

  // Register shutdown hook immediately (synchronously) so it is always called,
  // regardless of whether service initialization has completed yet.
  nitro.hooks.hook('close', async () => {
    console.log('[nuxt-dicom] Closing DICOM services...')

    // Stop all running services tracked by the manager (covers services started
    // both from config and dynamically via the API).
    const running = storeSCPServiceManager.getRunningServices()
    for (const serviceName of running.reverse()) {
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

  console.log('[nuxt-dicom] Initializing DICOM services...')

  // Run initialization asynchronously to not block Nitro startup
  const initializeServices = async () => {
    try {
      const config = useRuntimeConfig()
      const dicomConfig = config.dicom as Record<string, unknown> | undefined

      console.log('[nuxt-dicom] Runtime config loaded')

      // Get handlers and services from runtime config
      const handlers = (dicomConfig?.handlers as Array<Record<string, unknown>>) || []
      const services = (dicomConfig?.services as StoreScpConfig[]) || []

      console.log(`[nuxt-dicom] Found ${handlers.length} handlers and ${services.length} services`)

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

      // Initialize StoreSCP services - create and optionally start
      for (const serviceConfig of services) {
        if (!serviceConfig || !serviceConfig.port) continue

        // Use the same name that was assigned in module.ts (already in config)
        const serviceName = serviceConfig.name || `storeScp_${services.indexOf(serviceConfig) + 1}`

        try {
          console.log(`[nuxt-dicom] Creating StoreSCP service: ${serviceName}`)

          // Create service with configuration from nuxt.config
          await storeSCPServiceManager.createService(serviceName, serviceConfig)

          console.log(`[nuxt-dicom] Service created successfully: ${serviceName}`)

          // Auto-start if configured (default: true)
          if (serviceConfig.autoStart !== false) {
            console.log(`[nuxt-dicom] Starting StoreSCP service: ${serviceName}`)
            await storeSCPServiceManager.startService(serviceName)
            console.log(`✓ Started StoreSCP service: ${serviceName}`)
          }
        }
        catch (error) {
          console.error(
            `Failed to initialize StoreSCP service "${serviceName}":`,
            error instanceof Error ? error.message : String(error),
          )
          console.error('Error details:', error)
        }
      }
    }
    catch (error) {
      console.error('Failed to initialize DICOM services:', error)
    }
  }

  // Start initialization without blocking
  initializeServices().catch((error) => {
    console.error('[nuxt-dicom] Fatal error during service initialization:', error)
  })
})
