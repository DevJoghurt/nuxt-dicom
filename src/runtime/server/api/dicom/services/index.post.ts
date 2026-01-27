import { defineEventHandler, readBody, storeSCPServiceManager, dicomServiceRegistry, createError } from '#imports'
import type { StoreScpConfig } from '../../../../utils/schema'

/**
 * POST /api/dicom/services
 * Create a new DICOM service at runtime
 * Note: Services created this way are not persisted and will be lost on server restart.
 * Use nuxt.config to define persistent services.
 */
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<StoreScpConfig>(event)

    if (!body.name || !body.port) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: name, port',
      })
    }

    // Check if service already exists
    if (dicomServiceRegistry.getService(body.name)) {
      throw createError({
        statusCode: 409,
        statusMessage: `Service "${body.name}" already exists`,
      })
    }

    // Create service
    await storeSCPServiceManager.createService(body.name, body)

    // Register in service registry
    dicomServiceRegistry.registerService(
      body.name,
      'storeScp',
      body.name,
      body,
      body.eventHandlers,
    )

    // Auto-start if configured
    if (body.autoStart !== false) {
      await storeSCPServiceManager.startService(body.name)
    }

    return {
      name: body.name,
      port: body.port,
      callingAETitle: body.callingAETitle,
      status: body.autoStart !== false ? 'running' : 'stopped',
      message: 'Service created successfully. Note: runtime services are not persisted on restart.',
    }
  }
  catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }
    const message = error instanceof Error ? error.message : String(error)
    throw createError({
      statusCode: 500,
      statusMessage: message,
    })
  }
})
