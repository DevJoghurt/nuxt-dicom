import { defineNitroPlugin, useRuntimeConfig } from '#imports'
import { cleanupAllServices } from '../utils/cleanupFiles'

export default defineNitroPlugin(() => {
  const config = useRuntimeConfig()
  const storages = (config.dicom?.storages as Array<{ autoDeleteAfterDays?: number }>) || []
  const hasCleanup = storages.some(s => (s.autoDeleteAfterDays ?? 0) > 0)

  if (hasCleanup) {
    console.log('[cleanup] Per-service file cleanup is enabled')

    // Run cleanup once on startup
    setTimeout(async () => {
      console.log('[cleanup] Running initial cleanup...')
      await cleanupAllServices()
    }, 5000)

    // Schedule daily cleanup at midnight
    const scheduleDailyCleanup = () => {
      const now = new Date()
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)

      const timeUntilMidnight = tomorrow.getTime() - now.getTime()

      setTimeout(async () => {
        console.log('[cleanup] Running scheduled cleanup...')
        await cleanupAllServices()

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
