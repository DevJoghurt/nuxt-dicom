import { dicomLogger, defineEventHandler } from '#imports'

export default defineEventHandler(() => {
  const storeScp1Logs = dicomLogger.getRecentLogs('storeScp_1', 50)

  // Check subscriber count
  const subscriberInfo = (dicomLogger as Record<string, unknown>).listeners as Map<string, Set<unknown>> | undefined
  const storeScp1Subscribers = subscriberInfo?.get?.('storeScp_1')?.size || 0

  return {
    storeScp1Count: storeScp1Logs.length,
    subscriberCount: storeScp1Subscribers,
    storeScp1Recent: storeScp1Logs.slice(-10).map(log => ({
      timestamp: log.timestamp,
      level: log.level,
      message: log.message,
    })),
  }
})
