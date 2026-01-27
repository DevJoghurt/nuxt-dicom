import { defineEventHandler, dicomLogger } from '#imports'

export default defineEventHandler(async () => {
  // Get all services that have custom log levels
  const services = Array.from((dicomLogger as any).minLogLevel.entries()).map(([service, level]) => ({
    serviceName: service,
    level,
  }))

  return {
    globalLevel: (dicomLogger as any).globalMinLogLevel,
    services,
  }
})
