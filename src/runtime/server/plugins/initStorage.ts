import fsDriver from 'unstorage/drivers/fs'
import { defineNitroPlugin, dicomServiceRegistry, useStorage, useRuntimeConfig } from '#imports'

/**
 * Initialize storage drivers for each registered DICOM service and named storage.
 * Per-service mounts: dicom:<serviceName>
 * Per-named-storage mounts: dicom-storage:<storageName>
 */
export default defineNitroPlugin(() => {
  const storage = useStorage()
  const services = dicomServiceRegistry.getAllServices()

  // Mount per-service storage (used by file browsing on service detail page)
  for (const service of services) {
    const config = service.config
    const mountPoint = `dicom:${config.name}`

    if (config.storageBackend === 'S3' && config.s3Config) {
      console.warn(`[nuxt-dicom] S3 storage not yet implemented for service ${config.name}`)
    }
    else {
      storage.mount(mountPoint, fsDriver({ base: config.outDir }))
      console.log(`[nuxt-dicom] Mounted filesystem storage for service "${config.name}" at ${config.outDir}`)
    }
  }

  // Mount named storages (used by the Storages page)
  const configStorages = (useRuntimeConfig().dicom as Record<string, unknown>).storages as Array<{
    name: string
    storageBackend: string
    outDir: string
    s3Config?: unknown
  }> | undefined

  for (const storageConfig of configStorages ?? []) {
    const mountPoint = `dicom-storage:${storageConfig.name}`

    if (storageConfig.storageBackend === 'S3' && storageConfig.s3Config) {
      console.warn(`[nuxt-dicom] S3 storage not yet implemented for named storage "${storageConfig.name}"`)
    }
    else {
      storage.mount(mountPoint, fsDriver({ base: storageConfig.outDir }))
      console.log(`[nuxt-dicom] Mounted named storage "${storageConfig.name}" at ${storageConfig.outDir}`)
    }
  }
})
