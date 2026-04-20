import { useStorage, useRuntimeConfig } from '#imports'

export interface CleanupResult {
  serviceName: string
  deletedCount: number
  deletedFiles: string[]
  errors: string[]
}

/**
 * Delete files older than the specified number of days for a service
 */
export async function cleanupOldFiles(
  serviceName: string,
  days: number,
): Promise<CleanupResult> {
  const result: CleanupResult = {
    serviceName,
    deletedCount: 0,
    deletedFiles: [],
    errors: [],
  }

  if (days <= 0) {
    return result
  }

  try {
    const storage = useStorage(`dicom:${serviceName}`)
    const keys = await storage.getKeys()

    const now = Date.now()
    const cutoffTime = now - (days * 24 * 60 * 60 * 1000)

    for (const key of keys) {
      try {
        const meta = await storage.getMeta(key)

        if (meta?.mtime) {
          const fileTime = new Date(meta.mtime).getTime()

          if (fileTime < cutoffTime) {
            await storage.removeItem(key)
            result.deletedFiles.push(key)
            result.deletedCount++
          }
        }
      }
      catch (err) {
        const errorMsg = `Failed to process ${key}: ${err instanceof Error ? err.message : String(err)}`
        result.errors.push(errorMsg)
        console.error(`[cleanup] ${errorMsg}`)
      }
    }

    console.log(`[cleanup] Service ${serviceName}: Deleted ${result.deletedCount} files older than ${days} days`)
  }
  catch (err) {
    const errorMsg = `Failed to cleanup files for ${serviceName}: ${err instanceof Error ? err.message : String(err)}`
    result.errors.push(errorMsg)
    console.error(`[cleanup] ${errorMsg}`)
  }

  return result
}

/**
 * Cleanup old files for all storages that have autoDeleteAfterDays configured.
 * Reads retention period from the storage config, not the service config.
 */
export async function cleanupAllServices(): Promise<CleanupResult[]> {
  const config = useRuntimeConfig()
  const storageConfigs = (config.dicom?.storages as Array<{ name?: string, autoDeleteAfterDays?: number }>) || []

  const results: CleanupResult[] = []

  for (const storage of storageConfigs) {
    const days = storage.autoDeleteAfterDays ?? 0
    if (days > 0 && storage.name) {
      const result = await cleanupOldFiles(storage.name, days)
      results.push(result)
    }
  }

  return results
}
