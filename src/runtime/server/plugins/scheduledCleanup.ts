import { defineNitroPlugin, useRuntimeConfig } from '#imports'
import { cleanupAllServices } from '../utils/cleanupFiles'

export default defineNitroPlugin((nitroApp) => {
  const config = useRuntimeConfig()
  const autoDeleteAfterDays = config.public.dicom?.autoDeleteAfterDays || 0

  if (autoDeleteAfterDays > 0) {
    console.log(`[cleanup] Scheduled cleanup enabled: files older than ${autoDeleteAfterDays} days will be deleted daily`)

    // Run cleanup once on startup
    setTimeout(async () => {
      console.log('[cleanup] Running initial cleanup...')
      await cleanupAllServices(autoDeleteAfterDays)
    }, 5000) // Wait 5 seconds after startup

    // Schedule daily cleanup at midnight
    const scheduleDailyCleanup = () => {
      const now = new Date()
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)

      const timeUntilMidnight = tomorrow.getTime() - now.getTime()

      setTimeout(async () => {
        console.log('[cleanup] Running scheduled cleanup...')
        await cleanupAllServices(autoDeleteAfterDays)

        // Schedule next cleanup
        scheduleDailyCleanup()
      }, timeUntilMidnight)
    }

    scheduleDailyCleanup()
  }
  else {
    console.log('[cleanup] Automatic file cleanup is disabled')
  }
})
