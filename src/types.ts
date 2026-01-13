/**
 * DICOM event types - combined service_eventType format
 * Format: {serviceName}_{eventTypeName}
 */
export const DICOM_EVENTS = {
  storeScp_onBeforeStore: 'storeScp_onBeforeStore',
  storeScp_onFileStored: 'storeScp_onFileStored',
  storeScp_onStudyCompleted: 'storeScp_onStudyCompleted',
  storeScp_onServerStarted: 'storeScp_onServerStarted',
  storeScp_onError: 'storeScp_onError',
} as const

export type DicomEventType = (typeof DICOM_EVENTS)[keyof typeof DICOM_EVENTS]

// Legacy enum for backward compatibility
export enum DicomEventTypeEnum {
  OnFileStored = 'storeScp_onFileStored',
  OnStudyCompleted = 'storeScp_onStudyCompleted',
  OnServerStarted = 'storeScp_onServerStarted',
  OnError = 'storeScp_onError',
}
