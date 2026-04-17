import { defineEventHandler, getRouterParam, createError, getQuery, useStorage, getStorageByName } from '#imports'
import { DicomFile, getCommonTagSets } from '@nuxthealth/node-dicom'
import type { StorageConfig } from '@nuxthealth/node-dicom'
import { resolve } from 'node:path'
import { homedir } from 'node:os'

const TEXT_EXTENSIONS = new Set(['.txt', '.log', '.json', '.xml', '.csv', '.yaml', '.yml', '.md', '.ini', '.cfg'])

/**
 * GET /api/dicom/storages/:name/files/view?key=KEY
 *
 * Intelligent file viewer: detects the file type by extension and returns
 * the appropriate representation.
 *
 * Response: { type: 'dicom'|'text'|'unsupported', fileName, size?, tags?, content? }
 *
 * Note: DicomFile.open() should natively handle dataset-only files (stored without
 * Part-10 preamble via DIMSE with storeWithFileMeta: false) per the v0.3 docs, but
 * the published package still throws for such files. We return a graceful parseError
 * response until the fix ships.
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

    const resolvedOutDir = storageInfo.outDir.startsWith('~/')
      ? resolve(homedir(), storageInfo.outDir.slice(2))
      : resolve(storageInfo.outDir)

    const dicomStorageConfig =
      storageInfo.storageBackend === 'S3'
        ? null // S3 not yet wired; fall through to error below
        : { backend: 'Filesystem', rootDir: resolvedOutDir } as StorageConfig

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

      // Detect whether there is any renderable pixel / document content.
      // This drives the "View pixel data" button visibility for all cases,
      // including encapsulated text/PDF (which have no Rows/Columns tags).
      let hasRenderable = false
      try {
        dicomFile.getTagInfo('PixelData')
        hasRenderable = true
      }
      catch {
        try { dicomFile.getEncapsulatedDocument(); hasRenderable = true }
        catch { /* nothing renderable */ }
      }

      return {
        type: 'dicom' as const,
        fileName,
        tags: { ...baseTags, ...modalityTags } as Record<string, string>,
        hasRenderable,
      }
    }
    catch (err) {
      if (err && typeof err === 'object' && 'statusCode' in err) throw err
      // Most likely cause: file stored via DIMSE without a Part-10 preamble
      // (storeWithFileMeta: false). Return a graceful response so the UI can
      // still display the file name and show an informative message.
      return {
        type: 'dicom' as const,
        fileName,
        tags: {} as Record<string, string>,
        hasRenderable: false,
        parseError: err instanceof Error ? err.message : 'Unknown DICOM parse error',
      }
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
