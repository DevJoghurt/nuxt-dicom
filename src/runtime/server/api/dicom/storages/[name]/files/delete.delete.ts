import { defineEventHandler, getRouterParam, createError, getQuery, useStorage } from '#imports'

/**
 * DELETE /api/dicom/storages/:name/files/delete?key=KEY
 *
 * Delete a specific file from named storage.
 * The `key` query parameter is an unstorage key.
 */
export default defineEventHandler(async (event) => {
  const storageName = getRouterParam(event, 'name')
  if (!storageName) {
    throw createError({ statusCode: 400, message: 'Storage name is required' })
  }

  const { key } = getQuery(event) as { key?: string }
  if (!key) {
    throw createError({ statusCode: 400, message: 'Query parameter "key" is required' })
  }

  const storage = useStorage(`dicom-storage:${storageName}`)
  const exists = await storage.hasItem(key)
  if (!exists) {
    throw createError({ statusCode: 404, message: 'File not found' })
  }

  await storage.removeItem(key)

  return { success: true, key }
})
