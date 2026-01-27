import { defineEventHandler, getRouterParam, getQuery, createError } from 'h3'
import { cleanupOldFiles } from '../../../../utils/cleanupFiles'

export default defineEventHandler(async (event) => {
  const serviceName = getRouterParam(event, 'name')

  if (!serviceName) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Service name is required',
    })
  }

  const query = getQuery(event)
  const days = Number(query.days) || 30

  if (days <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Days must be greater than 0',
    })
  }

  const result = await cleanupOldFiles(serviceName, days)

  return {
    success: true,
    ...result,
  }
})
