import { defineNitroPlugin, registerDicomHandlers } from '#imports'

/**
 * Register DICOM event handlers at Nitro startup
 * Handlers are auto-discovered at build-time and this plugin ensures they're loaded
 */
export default defineNitroPlugin(async () => {
  try {
    registerDicomHandlers()
    console.log('[nuxt-dicom] DICOM event handlers registered successfully')
  }
  catch (error) {
    console.warn('[nuxt-dicom] Error registering DICOM handlers:', error)
  }
})
