import { z } from 'zod'
import { dicomLogger } from '../../../../utils/logger'

const LogLevelSchema = z.object({
  serviceName: z.string().optional(),
  level: z.enum(['debug', 'info', 'warn', 'error']),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const validation = LogLevelSchema.safeParse(body)
  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid request body',
      data: validation.error.issues,
    })
  }

  const { serviceName, level } = validation.data

  if (serviceName) {
    // Set log level for specific service
    dicomLogger.setLogLevel(serviceName, level)
  }
  else {
    // Set global log level
    dicomLogger.setGlobalLogLevel(level)
  }

  return {
    success: true,
    serviceName: serviceName || 'global',
    level,
  }
})
