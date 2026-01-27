import { ref, readonly } from '#imports'

export function useLogLevel() {
  const currentLevel = ref<'debug' | 'info' | 'warn' | 'error'>('info')
  const serviceLevels = ref<Record<string, 'debug' | 'info' | 'warn' | 'error'>>({})
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Fetch current log levels
   */
  async function fetchLogLevels() {
    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch('/api/dicom/logger/level')
      currentLevel.value = response.globalLevel
      serviceLevels.value = response.services.reduce((acc, item) => {
        acc[item.serviceName] = item.level
        return acc
      }, {} as Record<string, 'debug' | 'info' | 'warn' | 'error'>)
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch log levels'
      console.error('Error fetching log levels:', err)
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * Set global log level
   */
  async function setGlobalLevel(level: 'debug' | 'info' | 'warn' | 'error') {
    isLoading.value = true
    error.value = null

    try {
      await $fetch('/api/dicom/logger/level', {
        method: 'PUT',
        body: { level },
      })
      currentLevel.value = level
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to set log level'
      console.error('Error setting log level:', err)
      throw err
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * Set log level for specific service
   */
  async function setServiceLevel(serviceName: string, level: 'debug' | 'info' | 'warn' | 'error') {
    isLoading.value = true
    error.value = null

    try {
      await $fetch('/api/dicom/logger/level', {
        method: 'PUT',
        body: { serviceName, level },
      })
      serviceLevels.value[serviceName] = level
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to set service log level'
      console.error('Error setting service log level:', err)
      throw err
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * Get effective log level for a service
   */
  function getEffectiveLevel(serviceName: string): 'debug' | 'info' | 'warn' | 'error' {
    return serviceLevels.value[serviceName] || currentLevel.value
  }

  return {
    currentLevel: readonly(currentLevel),
    serviceLevels: readonly(serviceLevels),
    isLoading: readonly(isLoading),
    error: readonly(error),
    fetchLogLevels,
    setGlobalLevel,
    setServiceLevel,
    getEffectiveLevel,
  }
}
