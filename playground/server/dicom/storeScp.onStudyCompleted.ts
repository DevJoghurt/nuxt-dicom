import { defineDicomEvent, defineDicomEventConfig } from '#imports'

/**
 * Example handler for OnStudyCompleted event
 * Triggered when a study is marked complete (no new files for studyTimeout seconds)
 *
 * File location: playground/server/dicom/storeScp.onStudyCompleted.ts
 */
export const config = defineDicomEventConfig({
  name: 'handleStudyCompletion',
  description: 'Processes completed DICOM studies',
})

export default defineDicomEvent('storeScp_onStudyCompleted', async (payload) => {
  const studyInfo = {
    studyUid: payload.studyInstanceUid,
    seriesCount: payload.series.length,
    instanceCount: payload.series.reduce((sum: number, s: any) => sum + s.instances.length, 0),
    patientName: payload.tags?.PatientName,
    studyDate: payload.tags?.StudyDate,
  }

  console.log('[StoreSCP] Study completed:', studyInfo)

  // Example: Trigger post-processing
  // await $fetch('/api/dicom/process-study', {
  //   method: 'POST',
  //   body: { studyUid: payload.studyInstanceUid }
  // })

  // Example: Archive to long-term storage
  // if (studyInfo.instanceCount > 1000) {
  //   await archiveStudyToS3(payload)
  // }
})
