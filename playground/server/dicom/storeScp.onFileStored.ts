import { defineDicomEvent, defineDicomEventConfig } from '#imports'

/**
 * Example handler for OnFileStored event
 * This handler is automatically discovered and registered when placed in server/dicom/
 *
 * File naming: serviceName.eventType.ts
 * Example: storeScp.onFileStored.ts
 *
 * This file should be in: playground/server/dicom/storeScp.onFileStored.ts
 */
export const config = defineDicomEventConfig({
  name: 'logFileStorage',
  description: 'Logs received DICOM files',
})

export default defineDicomEvent('storeScp_onFileStored', async (payload, { logger }) => {
  logger.info(`File received: ${payload.sopInstanceUid} (Study: ${payload.studyInstanceUid})`)

  // Example: Store file metadata in database
  // const db = useDatabase('dicom')
  // await db.query(`
  //   INSERT INTO files (sopInstanceUid, filePath, studyUid, tags)
  //   VALUES (?, ?, ?, ?)
  // `, [payload.sopInstanceUid, payload.file, payload.studyInstanceUid, JSON.stringify(payload.tags)])

  // Example: Send webhook notification
  // await $fetch('https://example.com/dicom-webhook', {
  //   method: 'POST',
  //   body: payload
  // })
})
