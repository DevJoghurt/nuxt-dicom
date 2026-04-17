import { defineEventHandler, getRouterParam, createError, getQuery, setResponseHeaders, getStorageByName } from '#imports'
import { DicomFile, PixelDataFormat } from '@nuxthealth/node-dicom'
import type { StorageConfig } from '@nuxthealth/node-dicom'

/**
 * Heuristic MIME-type sniffer used as a fallback when a vendor stores arbitrary
 * data in the PixelData tag without providing a MIME type in the dataset.
 * Uses UTF-8 decoding rather than ASCII-only byte inspection so that text
 * containing non-ASCII characters (e.g. Prometheus metrics with umlauts) is
 * correctly identified as text/plain.
 */
function sniffMimeType(data: Buffer): string {
  if (data.length >= 4 && data.subarray(0, 4).toString('ascii') === '%PDF')
    return 'application/pdf'

  // Decode the first 4 KB as UTF-8 (replacement mode).
  // Valid UTF-8 text produces no U+FFFD replacement characters.
  const sample = new TextDecoder('utf-8', { fatal: false }).decode(
    data.subarray(0, Math.min(4096, data.length)),
  )
  return sample.includes('\uFFFD') ? 'application/octet-stream' : 'text/plain; charset=utf-8'
}

/**
 * GET /api/dicom/storages/:name/files/pixeldata?key=KEY&frame=N
 *
 * Returns the pixel / document payload from a DICOM file with zero disk I/O:
 *
 * 1. PixelData tag present + isImage → PNG encoded in-memory by the library
 * 2. PixelData tag present + !isImage → raw blob (vendor attachment / text)
 *    with MIME type from tag (0042,0012) or byte-sniffing as a fallback
 * 3. Encapsulated document (0042,0011) → data with its proper MIME type
 * 4. None of the above → 422
 *
 * Query parameters:
 *   key   – unstorage key of the DICOM file (required)
 *   frame – 0-based frame index for multi-frame images (default: 0)
 *
 * Response headers (imaging only):
 *   X-Dicom-Frames, X-Dicom-Width, X-Dicom-Height, X-Dicom-Photometric
 */
export default defineEventHandler(async (event) => {
  const storageName = getRouterParam(event, 'name')
  if (!storageName) {
    throw createError({ statusCode: 400, message: 'Storage name is required' })
  }

  const { key, frame } = getQuery(event) as { key?: string; frame?: string }
  if (!key) {
    throw createError({ statusCode: 400, message: 'Query parameter "key" is required' })
  }

  const storageInfo = getStorageByName(storageName)
  if (!storageInfo) {
    throw createError({ statusCode: 404, message: `Storage "${storageName}" not found` })
  }

  if (storageInfo.storageBackend === 'S3') {
    throw createError({ statusCode: 501, message: 'S3 backend not yet supported for pixel data extraction' })
  }

  const filePath = key.replace(/:/g, '/')
  const dicomFile = new DicomFile({ backend: 'Filesystem', rootDir: storageInfo.outDir } as StorageConfig)
  const frameNumber = Math.max(0, Number.parseInt(frame ?? '0', 10) || 0)

  try {
    await dicomFile.open(filePath)

    // ── 1 & 2: PixelData tag ─────────────────────────────────────────────────
    let tagInfo
    try { tagInfo = dicomFile.getTagInfo('PixelData') }
    catch { /* tag absent — fall through */ }

    if (tagInfo) {
      if (tagInfo.isImage) {
        // Real imaging data: library encodes PNG in-memory via Rust — no temp files
        const info = dicomFile.getPixelDataInfo()

        if (frameNumber >= info.frames) {
          throw createError({
            statusCode: 400,
            message: `Frame ${frameNumber} out of range — file has ${info.frames} frame(s)`,
          })
        }

        const png = dicomFile.getImageBuffer({
          format: PixelDataFormat.Png,
          applyVoiLut: true,
          convertTo8Bit: true,
          frameNumber,
        })

        setResponseHeaders(event, {
          'Content-Type': 'image/png',
          'Content-Length': String(png.byteLength),
          'Cache-Control': 'private, max-age=300',
          'X-Dicom-Frames': String(info.frames),
          'X-Dicom-Width': String(info.width),
          'X-Dicom-Height': String(info.height),
          'X-Dicom-Photometric': info.photometricInterpretation ?? '',
        })
        return png
      }

      // Non-image blob stored in PixelData (vendor attachment, raw text, …)
      const raw = dicomFile.getTagBytes('PixelData')
      const mimeType = tagInfo.mimeType ?? sniffMimeType(raw)

      setResponseHeaders(event, {
        'Content-Type': mimeType,
        'Content-Length': String(raw.byteLength),
        'Cache-Control': 'private, max-age=300',
      })
      return raw
    }

    // ── 3: Encapsulated document (PDF, CDA, text/plain, …) ───────────────────
    try {
      const doc = dicomFile.getEncapsulatedDocument()

      setResponseHeaders(event, {
        'Content-Type': doc.mimeType,
        'Content-Length': String(doc.byteLength),
        'Cache-Control': 'private, max-age=300',
      })
      return doc.data
    }
    catch { /* no encapsulated document either */ }

    throw createError({ statusCode: 422, message: 'This DICOM file contains no renderable pixel or document data' })
  }
  catch (err) {
    if (err && typeof err === 'object' && 'statusCode' in err) throw err
    throw createError({
      statusCode: 500,
      message: `Failed to extract pixel data: ${err instanceof Error ? err.message : 'Unknown error'}`,
    })
  }
  finally {
    dicomFile.close()
  }
})

