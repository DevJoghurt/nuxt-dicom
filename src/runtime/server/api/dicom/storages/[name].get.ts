import { defineEventHandler, getRouterParam, createError, getStorageByName } from '#imports'

/**
 * GET /api/dicom/storages/:name
 * Get details for a single named storage backend
 */
export default defineEventHandler((event) => {
  const name = getRouterParam(event, 'name')
  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'Storage name is required' })
  }

  const storage = getStorageByName(name)
  if (!storage) {
    throw createError({ statusCode: 404, statusMessage: `Storage "${name}" not found` })
  }

  return storage
})
