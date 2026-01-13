import { defineEventHandler, storeSCPServiceManager } from '#imports'

/**
 * POST /api/dicom/services/[name]/start
 * Start a DICOM service
 */
export default defineEventHandler(async (event) => {
  try {
    const name = getRouterParam(event, 'name')
    if (!name) {
      return {
        success: false,
        error: 'Service name is required',
      }
    }

    if (storeSCPServiceManager.isRunning(name)) {
      return {
        success: false,
        error: `Service "${name}" is already running`,
      }
    }

    await storeSCPServiceManager.startService(name)

    return {
      success: true,
      message: `Service "${name}" started successfully`,
    }
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      error: message,
    }
  }
})
