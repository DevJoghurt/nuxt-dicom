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

export default defineDicomEvent('storeScp_onStudyCompleted', async (payload, { logger }) => {
  // Calculate metadata for logging
  const seriesCount = payload.series.length
  const instanceCount = payload.series.reduce((sum: number, s: any) => sum + s.instances.length, 0)

  logger.info(
    'storeScp_1',
    `Study completed: ${payload.studyInstanceUid} (${seriesCount} series, ${instanceCount} instances)`,
    { seriesCount, instanceCount },
  )

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
