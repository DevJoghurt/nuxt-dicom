import type { DicomEventType } from '../../types'
import { dicomEventEmitter, type DicomEventHandler, type DicomEventPayloadMap } from './dicomEvents'

/**
 * Configuration for a DICOM event handler
 */
export interface DefineDicomEventConfig {
  /**
   * Human-readable name to identify this handler
   * Used in debugging and error messages
   */
  name?: string
  /**
   * Description of what this handler does
   */
  description?: string
}

/**
 * Define a DICOM event handler configuration
 * This can be used to add metadata to handlers
 *
 * @example
 * ```ts
 * export const config = defineDicomEventConfig({
 *   name: 'handleFileStored',
 *   description: 'Processes incoming DICOM files'
 * })
 * ```
 */
export function defineDicomEventConfig(config: DefineDicomEventConfig): DefineDicomEventConfig {
  return config
}

/**
 * Define a DICOM event handler with combined service_eventType
 * Handlers must be exported as default and wrapped with this function
 * The payload type is automatically inferred from the eventId
 *
 * @example
 * ```ts
 * // server/dicom/storeScp.onFileStored.ts
 * export const config = defineDicomEventConfig({
 *   name: 'logFileStorage',
 *   description: 'Logs received DICOM files'
 * })
 *
 * export default defineDicomEvent('storeScp_onFileStored', async (payload) => {
 *   // payload is typed as OnFileStoredPayload with full autocomplete
 *   console.log('File:', payload.file, 'SOP:', payload.sopInstanceUid)
 * })
 * ```
 */
export function defineDicomEvent<EventId extends DicomEventType>(
  eventId: EventId,
  handler: DicomEventHandler<DicomEventPayloadMap[EventId]>,
) {
  // Extract service and eventType from combined format (e.g., 'storeScp_onFileStored')
  const [service, ...eventParts] = eventId.split('_')
  const eventType = eventParts.join('_')

  return {
    __dicomEvent: true,
    eventId,
    service,
    eventType,
    handler,
  }
}

/**
 * Helper to register a DICOM event handler at runtime
 */
export function registerDicomEvent(
  serviceName: string,
  eventType: DicomEventType,
  handler: DicomEventHandler,
) {
  dicomEventEmitter.on(serviceName, eventType, handler)
}

/**
 * Helper to emit a DICOM event
 */
export async function emitDicomEvent(
  serviceName: string,
  eventType: DicomEventType,
  data: unknown,
) {
  await dicomEventEmitter.emit(serviceName, eventType, data)
}
