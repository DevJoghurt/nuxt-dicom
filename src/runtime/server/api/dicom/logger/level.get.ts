import { defineEventHandler, dicomLogger } from '#imports'

export default defineEventHandler(async () => {
  // Get all services that have custom log levels
  const loggerInternal = dicomLogger as Record<string, unknown>
  const minLogLevel = loggerInternal.minLogLevel as Map<string, string>
  const services = Array.from(minLogLevel.entries()).map(([service, level]) => ({
    serviceName: service,
    level,
  }))

  return {
    globalLevel: loggerInternal.globalMinLogLevel as string,
    services,
  }
})
