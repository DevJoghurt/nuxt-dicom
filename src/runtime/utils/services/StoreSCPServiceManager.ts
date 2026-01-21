import { StoreScp } from '@nuxthealth/node-dicom'
import type { StoreScpConfig } from '../schema'
import { DicomConfigSchemas } from '../schema'
import type { OnBeforeStorePayload, OnFileStoredPayload, OnStudyCompletedPayload, OnServerStartedPayload, OnErrorPayload } from '../dicomEvents'
import { dicomEventEmitter } from '../dicomEvents'
import { emitDicomEvent } from '../defineDicomEvent'
import { dicomLogger } from '../logger'
import { DICOM_EVENTS } from '../../../types'
import { BaseServiceManager } from './BaseServiceManager'

/**
 * Manages lifecycle of StoreSCP service instances
 */
export class StoreSCPServiceManager extends BaseServiceManager<StoreScp, StoreScpConfig> {
  /**
   * Create and configure a StoreSCP instance
   */
  async createService(serviceName: string, config: StoreScpConfig): Promise<StoreScp> {
    if (this.instances.has(serviceName)) {
      throw new Error(`StoreSCP service "${serviceName}" already exists`)
    }

    // Parse and normalize config using Zod schema (applies all defaults)
    const parsed = DicomConfigSchemas.storeSCP.parse(config)

    // Store config for later use in event handling
    this.serviceConfigs.set(serviceName, parsed)

    // Transform to StoreScp constructor format
    const scpConfig = {
      port: parsed.port,
      callingAeTitle: parsed.callingAETitle,
      outDir: parsed.outDir,
      maxPduLength: parsed.maxPduLength,
      storageBackend: parsed.storageBackend,
      storeWithFileMeta: parsed.storeWithFileMeta,
      verbose: parsed.verbose,
      studyTimeout: parsed.studyTimeout,
      ...(parsed.storageBackend === 'S3' && parsed.s3Config && {
        s3Config: parsed.s3Config,
      }),
      ...(parsed.extractTags && { extractTags: parsed.extractTags }),
      ...(parsed.extractCustomTags && { extractCustomTags: parsed.extractCustomTags }),
      ...(parsed.abstractSyntaxMode && { abstractSyntaxMode: parsed.abstractSyntaxMode }),
      ...(parsed.abstractSyntaxes && { abstractSyntaxes: parsed.abstractSyntaxes }),
      ...(parsed.transferSyntaxMode && { transferSyntaxMode: parsed.transferSyntaxMode }),
      ...(parsed.transferSyntaxes && { transferSyntaxes: parsed.transferSyntaxes }),
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scp = new StoreScp(scpConfig as any)

    // Register event handlers
    this.registerEventHandlers(serviceName, scp)

    this.instances.set(serviceName, scp)
    return scp
  }

  /**
   * Start a StoreSCP service
   */
  async startService(serviceName: string): Promise<void> {
    const scp = this.instances.get(serviceName)
    if (!scp) {
      throw new Error(`StoreSCP service "${serviceName}" not found`)
    }

    if (this.started.has(serviceName)) {
      dicomLogger.warn(serviceName, `Service is already running`)
      return
    }

    try {
      dicomLogger.info(serviceName, 'Starting service...')
      scp.start()
      this.started.add(serviceName)
      dicomLogger.info(serviceName, 'Service started successfully')
    }
    catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      dicomLogger.error(serviceName, `Failed to start service: ${errorMsg}`)
      await emitDicomEvent(serviceName, DICOM_EVENTS.storeScp_onError, {
        serviceName,
        error: errorMsg,
        context: 'Service startup',
      } as OnErrorPayload)
      throw error
    }
  }

  /**
   * Stop a StoreSCP service
   */
  async stopService(serviceName: string): Promise<void> {
    const scp = this.instances.get(serviceName)
    if (!scp) {
      throw new Error(`StoreSCP service "${serviceName}" not found`)
    }

    if (!this.started.has(serviceName)) {
      dicomLogger.warn(serviceName, 'Service is not running')
      return
    }

    try {
      dicomLogger.info(serviceName, 'Stopping service...')
      await scp.stop()
      this.started.delete(serviceName)
      dicomLogger.info(serviceName, 'Service stopped successfully')
    }
    catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      dicomLogger.error(serviceName, `Failed to stop service: ${errorMsg}`)
      await emitDicomEvent(serviceName, DICOM_EVENTS.storeScp_onError, {
        serviceName,
        error: errorMsg,
        context: 'Service shutdown',
      } as OnErrorPayload)
      throw error
    }
  }

  /**
   * Register event handlers for a StoreSCP instance
   * Instance-specific handlers are registered based on the service's eventHandlers config
   */
  private registerEventHandlers(serviceName: string, scp: StoreScp): void {
    const config = this.serviceConfigs.get(serviceName)
    const eventHandlers = config?.eventHandlers || {}

    // Helper to register configured handlers for an event
    const registerConfiguredHandlers = (eventId: string, eventType: keyof typeof eventHandlers) => {
      const handlerNames = eventHandlers[eventType as string] || []
      for (const handlerName of handlerNames) {
        const handler = dicomEventEmitter.getNamedHandler(handlerName)
        if (handler) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          dicomEventEmitter.on(serviceName, eventId as any, handler)
          dicomLogger.debug(serviceName, `Registered handler "${handlerName}" for event ${eventType}`)
        }
        else {
          dicomLogger.warn(serviceName, `Handler "${handlerName}" not found for event ${eventType}`)
        }
      }
    }

    // Register handlers for each configured event type
    registerConfiguredHandlers(DICOM_EVENTS.storeScp_onBeforeStore, 'onBeforeStore')
    registerConfiguredHandlers(DICOM_EVENTS.storeScp_onFileStored, 'onFileStored')
    registerConfiguredHandlers(DICOM_EVENTS.storeScp_onServerStarted, 'onServerStarted')
    registerConfiguredHandlers(DICOM_EVENTS.storeScp_onStudyCompleted, 'onStudyCompleted')
    registerConfiguredHandlers(DICOM_EVENTS.storeScp_onError, 'onError')

    // OnBeforeStore - asynchronous callback for tag modification/validation
    scp.onBeforeStore(async (error: Error | null, tags) => {
      const payload: OnBeforeStorePayload = {
        serviceName,
        tags,
        sopInstanceUid: tags.sopInstanceUid || '',
        sopClassUid: tags.sopClassUid || '',
        transferSyntaxUid: tags.transferSyntaxUid || '',
        studyInstanceUid: tags.studyInstanceUid || '',
        seriesInstanceUid: tags.seriesInstanceUid || '',
      }

      // Emit event synchronously and collect modified tags
      // Note: This is synchronous, so we execute the handler directly
      const handlerNames = eventHandlers['onBeforeStore' as string] || []
      let modifiedTags = tags

      for (const handlerName of handlerNames) {
        const handler = dicomEventEmitter.getNamedHandler(handlerName)
        if (handler) {
          try {
            // Call handler and potentially get modified tags
            const result = handler(payload)
            if (result && typeof result === 'object' && 'tags' in result) {
              modifiedTags = (result as { tags: Record<string, string> }).tags
            }
          }
          catch (error) {
            console.error(
              `[nuxt-dicom] Error in onBeforeStore handler "${handlerName}":`,
              error,
            )
            throw error // Re-throw to prevent file storage
          }
        }
      }

      return modifiedTags
    })

    // OnServerStarted
    scp.onServerStarted((err, event) => {
      if (err) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        emitDicomEvent(serviceName, DICOM_EVENTS.storeScp_onError, {
          serviceName,
          error: errorMsg,
          context: 'OnServerStarted',
        } as OnErrorPayload).catch(console.error)
        return
      }

      const payload: OnServerStartedPayload = {
        serviceName,
        message: event.message,
      }

      emitDicomEvent(serviceName, DICOM_EVENTS.storeScp_onServerStarted, payload).catch(
        console.error,
      )
    })

    // OnFileStored
    scp.onFileStored((err, event) => {
      if (err) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        emitDicomEvent(serviceName, DICOM_EVENTS.storeScp_onError, {
          serviceName,
          error: errorMsg,
          context: 'OnFileStored',
        } as OnErrorPayload).catch(console.error)
        return
      }

      const data = event.data
      if (!data) return

      const payload: OnFileStoredPayload = {
        serviceName,
        file: data.file ?? '',
        sopInstanceUid: data.sopInstanceUid ?? '',
        sopClassUid: data.sopClassUid ?? '',
        transferSyntaxUid: data.transferSyntaxUid ?? '',
        studyInstanceUid: data.studyInstanceUid ?? '',
        seriesInstanceUid: data.seriesInstanceUid ?? '',
        tags: data.tags,
      }

      emitDicomEvent(serviceName, DICOM_EVENTS.storeScp_onFileStored, payload).catch(
        console.error,
      )
    })

    // OnStudyCompleted
    scp.onStudyCompleted((err, event) => {
      if (err) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        emitDicomEvent(serviceName, DICOM_EVENTS.storeScp_onError, {
          serviceName,
          error: errorMsg,
          context: 'OnStudyCompleted',
        } as OnErrorPayload).catch(console.error)
        return
      }

      const study = event.data?.study
      if (!study) return

      const payload: OnStudyCompletedPayload = {
        serviceName,
        studyInstanceUid: study.studyInstanceUid,
        tags: study.tags,
        series: study.series,
        study,
      }

      emitDicomEvent(serviceName, DICOM_EVENTS.storeScp_onStudyCompleted, payload).catch(
        console.error,
      )
    })
  }
}

export const storeSCPServiceManager = new StoreSCPServiceManager()
