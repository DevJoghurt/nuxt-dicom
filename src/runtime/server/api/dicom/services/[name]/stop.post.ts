import { defineEventHandler, getRouterParam, storeSCPServiceManager } from '#imports'

/**
 * POST /api/dicom/services/[name]/stop
 * Stop a DICOM service
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

    if (!storeSCPServiceManager.isRunning(name)) {
      return {
        success: false,
        error: `Service "${name}" is not running`,
      }
    }

    await storeSCPServiceManager.stopService(name)

    return {
      success: true,
      message: `Service "${name}" stopped successfully`,
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
