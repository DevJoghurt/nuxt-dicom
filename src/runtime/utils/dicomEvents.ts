import type { ScpEventDetails, StudyHierarchyData, SeriesHierarchyData } from '@nuxthealth/node-dicom'
import type { DicomEventType } from '../../types'

/**
 * Event handler type for DICOM events
 */
export interface DicomEventHandler<T = unknown> {
  (data: T): void | Promise<void>
}

/**
 * Payload type mapping for each event
 */
export interface DicomEventPayloadMap {
  storeScp_onBeforeStore: OnBeforeStorePayload
  storeScp_onFileStored: OnFileStoredPayload
  storeScp_onStudyCompleted: OnStudyCompletedPayload
  storeScp_onServerStarted: OnServerStartedPayload
  storeScp_onError: OnErrorPayload
}

/**
 * Registry to store event handlers by service and event type
 */
interface EventRegistry {
  [serviceName: string]: {
    [eventType in DicomEventType]?: DicomEventHandler[]
  }
}

class DicomEventEmitter {
  private handlers: EventRegistry = {}
  private allHandlers: Map<string, DicomEventHandler> = new Map()

  /**
   * Register a named handler for global access
   */
  registerNamedHandler(name: string, handler: DicomEventHandler): void {
    this.allHandlers.set(name, handler)
  }

  /**
   * Get a named handler
   */
  getNamedHandler(name: string): DicomEventHandler | undefined {
    return this.allHandlers.get(name)
  }

  /**
   * Register an event handler for a service
   */
  on(
    serviceName: string,
    eventType: DicomEventType,
    handler: DicomEventHandler,
  ): void {
    if (!this.handlers[serviceName]) {
      this.handlers[serviceName] = {}
    }

    if (!this.handlers[serviceName][eventType]) {
      this.handlers[serviceName][eventType] = []
    }

    this.handlers[serviceName][eventType]!.push(handler)
  }

  /**
   * Emit an event to all registered handlers for a specific service
   */
  async emit(
    serviceName: string,
    eventType: DicomEventType,
    data: unknown,
  ): Promise<void> {
    const handlers = this.handlers[serviceName]?.[eventType] || []

    for (const handler of handlers) {
      try {
        await handler(data)
      }
      catch (error) {
        console.error(
          `Error in DICOM event handler for ${serviceName}.${eventType}:`,
          error,
        )
      }
    }
  }

  /**
   * Remove all handlers for a service
   */
  clear(serviceName?: string): void {
    if (serviceName) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete this.handlers[serviceName]
    }
    else {
      this.handlers = {}
    }
  }

  /**
   * Get all registered handlers (for debugging)
   */
  getHandlers(serviceName?: string): EventRegistry | object {
    if (serviceName) {
      return this.handlers[serviceName] || {}
    }
    return this.handlers
  }
}

export const dicomEventEmitter = new DicomEventEmitter()

/**
 * Event payload types
 * These are derived from node-dicom-rs and extend ScpEventDetails with serviceName
 */

/**
 * Payload for OnFileStored event
 * Emitted when a DICOM file has been successfully stored
 */
export interface OnFileStoredPayload extends ScpEventDetails {
  serviceName: string
  file: string
  sopInstanceUid: string
  sopClassUid: string
  transferSyntaxUid: string
  studyInstanceUid: string
  seriesInstanceUid: string
  tags?: Record<string, string>
}

/**
 * Payload for OnStudyCompleted event
 * Emitted when all files for a study have been received and stored
 */
export interface OnStudyCompletedPayload extends ScpEventDetails {
  serviceName: string
  studyInstanceUid: string
  tags?: Record<string, string>
  series: SeriesHierarchyData[]
  study?: StudyHierarchyData
}

/**
 * Payload for OnServerStarted event
 * Emitted when the DICOM C-STORE SCP server has started
 */
export interface OnServerStartedPayload extends ScpEventDetails {
  serviceName: string
  message: string
}

/**
 * Payload for OnError event
 * Emitted when an error occurs during file storage or processing
 */
export interface OnErrorPayload extends Omit<ScpEventDetails, 'error'> {
  serviceName: string
  error: string | Error
  context?: string
}

/**
 * Payload for OnBeforeStore callback
 * Invoked synchronously before each DICOM file is saved to disk
 * Allows modification of extracted tags before storage
 */
export interface OnBeforeStorePayload {
  serviceName: string
  tags: Record<string, string>
  sopInstanceUid: string
  sopClassUid: string
  transferSyntaxUid: string
  studyInstanceUid: string
  seriesInstanceUid: string
}
