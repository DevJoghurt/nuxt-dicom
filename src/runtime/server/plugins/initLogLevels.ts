import { defineNitroPlugin, useRuntimeConfig } from '#imports'
import { dicomLogger } from '../../utils/logger'

export default defineNitroPlugin(() => {
  const config = useRuntimeConfig()
  const dicomConfig = config.dicom as any

  // Set global log level from config
  if (dicomConfig?.logLevel) {
    dicomLogger.setGlobalLogLevel(dicomConfig.logLevel)
    console.log(`[nuxt-dicom] Global log level set to: ${dicomConfig.logLevel}`)
  }

  // Set per-service log levels from config
  if (dicomConfig?.serviceLogs && typeof dicomConfig.serviceLogs === 'object') {
    for (const [serviceName, level] of Object.entries(dicomConfig.serviceLogs)) {
      if (typeof level === 'string') {
        dicomLogger.setLogLevel(serviceName, level as any)
        console.log(`[nuxt-dicom] Log level for ${serviceName} set to: ${level}`)
      }
    }
  }
})
