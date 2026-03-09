import { defineEventHandler, getRouterParam, createError, getQuery, useStorage } from '#imports'
import { DicomFile } from '@nuxthealth/node-dicom'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { writeFile, unlink } from 'node:fs/promises'

/**
 * GET /api/dicom/services/:name/files/dump?path=KEY
 *
 * Return a structured JSON dump of a DICOM file stored by the given service.
 * The `path` query parameter is an unstorage key
 * (e.g. StudyUID:SeriesUID:InstanceUID.dcm).
 */
export default defineEventHandler(async (event) => {
  const serviceName = getRouterParam(event, 'name')
  if (!serviceName) {
    throw createError({ statusCode: 400, message: 'Service name is required' })
  }

  const query = getQuery(event)
  const path = query.path as string | undefined
  if (!path) {
    throw createError({ statusCode: 400, message: 'Query parameter "path" is required' })
  }

  const storage = useStorage(`dicom:${serviceName}`)
  const rawBytes = await storage.getItemRaw(path)

  if (!rawBytes) {
    throw createError({ statusCode: 404, message: 'File not found' })
  }

  // DicomFile.open() requires a filesystem path, so we write to a temp file.
  const tmpPath = join(tmpdir(), `dicom-dump-${randomUUID()}.dcm`)
  try {
    await writeFile(tmpPath, rawBytes as Buffer)

    const dicomFile = new DicomFile()
    await dicomFile.open(tmpPath)

    const json = dicomFile.toJson()
    dicomFile.close()

    return {
      serviceName,
      path,
      data: JSON.parse(json),
    }
  }
  catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) throw error
    throw createError({
      statusCode: 500,
      message: `Failed to dump DICOM file: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }
  finally {
    await unlink(tmpPath).catch(() => {})
  }
})
