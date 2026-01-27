import fsDriver from 'unstorage/drivers/fs'
import { dicomServiceRegistry } from '#imports'

/**
 * Initialize storage drivers for each registered DICOM service
 * Mounts filesystem or S3 storage based on service configuration
 */
export default defineNitroPlugin(() => {
  const storage = useStorage()
  const services = dicomServiceRegistry.getAllServices()

  for (const service of services) {
    const config = service.config
    const mountPoint = `dicom:${config.name}`

    if (config.storageBackend === 'S3' && config.s3Config) {
      // TODO: Add S3 driver when needed
      // For now, we'll log a warning
      console.warn(`[nuxt-dicom] S3 storage not yet implemented for service ${config.name}`)
    }
    else {
      // Mount filesystem driver
      const driver = fsDriver({
        base: config.outDir,
      })

      storage.mount(mountPoint, driver)
      console.log(`[nuxt-dicom] Mounted filesystem storage for ${config.name} at ${config.outDir}`)
    }
  }
})
