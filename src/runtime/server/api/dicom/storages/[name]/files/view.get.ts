import { defineEventHandler, getRouterParam, createError, getQuery, useStorage, getStorageByName } from '#imports'
import { DicomFile, getCommonTagSets } from '@nuxthealth/node-dicom'
import type { StorageConfig } from '@nuxthealth/node-dicom'

const TEXT_EXTENSIONS = new Set(['.txt', '.log', '.json', '.xml', '.csv', '.yaml', '.yml', '.md', '.ini', '.cfg'])

/**
 * GET /api/dicom/storages/:name/files/view?key=KEY
 *
 * Intelligent file viewer: detects the file type by extension and returns
 * the appropriate representation.
 *
 * Response: { type: 'dicom'|'text'|'unsupported', fileName, size?, tags?, content? }
 *
 * TODO(node-dicom): DicomFile.open() in v0.2.1 does not yet handle DICOM files
 * that were stored without a Part-10 preamble (dataset-only files received via
 * DIMSE/StoreScp). The docs say both formats are supported, but in practice the
 * library throws "Could not parse meta group data set" for such files.
 * Once DicomFile handles implicit-VR / meta-less datasets natively, this works
 * for all files. Until then, meta-less files will return a 500 with that message.
 * → Please add preamble auto-detection / implicit-VR fallback to DicomFile.open().
 */
export default defineEventHandler(async (event) => {
  const storageName = getRouterParam(event, 'name')
  if (!storageName) {
    throw createError({ statusCode: 400, message: 'Storage name is required' })
  }

  const { key } = getQuery(event) as { key?: string }
  if (!key) {
    throw createError({ statusCode: 400, message: 'Query parameter "key" is required' })
  }

  const storageInfo = getStorageByName(storageName)
  if (!storageInfo) {
    throw createError({ statusCode: 404, message: `Storage "${storageName}" not found` })
  }

  const fileName = key.split(':').pop() ?? key
  const ext = fileName.includes('.') ? `.${fileName.split('.').pop()!.toLowerCase()}` : ''

  // DICOM file — use DicomFile with the configured backend directly (no temp files)
  if (ext === '.dcm') {
    // unstorage uses ':' as path-segment separator; DicomFile expects '/'
    const filePath = key.replace(/:/g, '/')

    const dicomStorageConfig =
      storageInfo.storageBackend === 'S3'
        ? null // S3 not yet wired; fall through to error below
        : { backend: 'Filesystem', rootDir: storageInfo.outDir } as StorageConfig

    if (!dicomStorageConfig) {
      throw createError({ statusCode: 501, message: 'S3 backend not yet supported for file preview' })
    }

    const dicomFile = new DicomFile(dicomStorageConfig)
    try {
      await dicomFile.open(filePath)

      const tagSets = getCommonTagSets()
      const baseTags = dicomFile.extract(tagSets.default as Parameters<typeof dicomFile.extract>[0])

      // Add modality-specific tags
      const modality = baseTags.Modality
      let modalityTags: Record<string, string> = {}
      if (modality === 'CT') modalityTags = dicomFile.extract(tagSets.ct as Parameters<typeof dicomFile.extract>[0])
      else if (modality === 'MR') modalityTags = dicomFile.extract(tagSets.mr as Parameters<typeof dicomFile.extract>[0])
      else if (modality === 'US') modalityTags = dicomFile.extract(tagSets.ultrasound as Parameters<typeof dicomFile.extract>[0])
      else if (modality === 'PT' || modality === 'NM') modalityTags = dicomFile.extract(tagSets.petNm as Parameters<typeof dicomFile.extract>[0])
      else if (modality === 'XA' || modality === 'RF') modalityTags = dicomFile.extract(tagSets.xa as Parameters<typeof dicomFile.extract>[0])
      else if (modality === 'RTIMAGE' || modality === 'RTPLAN' || modality === 'RTDOSE') modalityTags = dicomFile.extract(tagSets.rt as Parameters<typeof dicomFile.extract>[0])

      return {
        type: 'dicom' as const,
        fileName,
        tags: { ...baseTags, ...modalityTags } as Record<string, string>,
      }
    }
    catch (err) {
      if (err && typeof err === 'object' && 'statusCode' in err) throw err
      throw createError({
        statusCode: 500,
        message: `Failed to parse DICOM file: ${err instanceof Error ? err.message : 'Unknown error'}`,
      })
    }
    finally {
      dicomFile.close()
    }
  }

  // Text and binary files — read via unstorage
  const storage = useStorage(`dicom-storage:${storageName}`)
  const rawBytes = await storage.getItemRaw(key)

  if (!rawBytes) {
    throw createError({ statusCode: 404, message: 'File not found' })
  }

  const size = (rawBytes as Buffer).byteLength

  if (TEXT_EXTENSIONS.has(ext)) {
    const content = (rawBytes as Buffer).toString('utf-8')
    return { type: 'text' as const, fileName, size, content }
  }

  return {
    type: 'unsupported' as const,
    fileName,
    size,
    message: `Preview is not available for files with extension "${ext || '(none)'}".`,
  }
})
