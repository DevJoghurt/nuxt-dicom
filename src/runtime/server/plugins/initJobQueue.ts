import { defineNitroPlugin, storeSCUJobManager } from '#imports'

/**
 * Nitro plugin: Job queue lifecycle management.
 *
 * Startup:
 *   - Confirms the queue is ready and logs concurrency configuration
 *   - Schedules hourly cleanup of completed/failed job records from memory
 *
 * Shutdown (SIGTERM / SIGINT / hot-reload):
 *   1. Stops accepting new jobs
 *   2. Waits for all running and queued jobs to finish via fastq's `drained()`
 *   3. Resolves the `close` hook only when the queue is fully idle
 *
 * This ensures in-flight C-STORE transfers and other background operations are
 * never cut off mid-way by an abrupt process exit.
 */
export default defineNitroPlugin((nitro) => {
  // ── Init ──────────────────────────────────────────────────────────────────

  console.log(
    `[dicom-jobs] Job queue ready (concurrency: ${storeSCUJobManager.concurrency})`,
  )

  // Periodically purge completed/failed job records from memory (hourly).
  // This prevents unbounded growth when the server runs for a long time.
  const cleanupInterval = setInterval(() => {
    storeSCUJobManager.cleanup()
  }, 3_600_000)

  // ── Shutdown ───────────────────────────────────────────────────────────────

  nitro.hooks.hook('close', async () => {
    // Stop the periodic cleanup timer first.
    clearInterval(cleanupInterval)

    const running = storeSCUJobManager.running()
    const queued = storeSCUJobManager.queued()
    const total = running + queued

    if (total === 0) {
      console.log('[dicom-jobs] No active jobs — shutting down immediately')
      return
    }

    console.log(
      `[dicom-jobs] Waiting for ${running} running + ${queued} queued job(s) to finish before shutdown…`,
    )

    await storeSCUJobManager.shutdown()

    console.log('[dicom-jobs] All jobs completed — shutdown proceeds')
  })
})
