import { defineEventHandler, createError, getRegisteredStorages  } from '#imports'

/**
 * GET /api/dicom/storages
 * List all named storage backends with their configuration and which services use them
 */
export default defineEventHandler(() => {
  try {
    return getRegisteredStorages()
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw createError({ statusCode: 500, statusMessage: message })
  }
})
