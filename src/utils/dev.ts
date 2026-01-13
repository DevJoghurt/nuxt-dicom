import type { Nuxt } from '@nuxt/schema'

/**
 * Watch DICOM handler files for changes during dev mode
 * Uses Nuxt's built-in file watching
 */
export function watchDicomHandlers({
  nuxt,
  _dicomDir,
  onRefresh,
}: {
  nuxt: Nuxt
  _dicomDir: string
  onRefresh: (reason: string) => Promise<void>
}): void {
  // Use Nuxt's watcher hook for file changes
  nuxt.hook('builder:watch', async (event: string, path: string) => {
    // Only watch changes in the dicom directory
    if (!path.includes('server/dicom')) {
      return
    }

    // Ignore example files
    if (path.includes('.example')) {
      return
    }

    const reason = `${event}: ${path}`
    await onRefresh(reason)
  })
}
