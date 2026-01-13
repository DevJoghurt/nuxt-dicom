import { defineDicomEvent, defineDicomEventConfig } from '#imports'

/**
 * Example handler for OnServerStarted event
 * Triggered when the StoreSCP server is initialized and ready to receive connections
 *
 * File location: playground/server/dicom/storeScp.onServerStarted.ts
 */
export const config = defineDicomEventConfig({
  name: 'onServerReady',
  description: 'Notifies when DICOM service is ready',
})

export default defineDicomEvent('storeScp_onServerStarted', async (payload) => {
  console.log('[StoreSCP] Server started:', payload.message)

  // Example: Notify monitoring system
  // await $fetch('https://monitoring.example.com/dicom-service-up', {
  //   method: 'POST',
  //   body: { serviceName: payload.serviceName, timestamp: new Date() }
  // })
})
