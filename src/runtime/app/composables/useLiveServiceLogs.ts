/**
 * Log entry from the server
 */
export interface LogEntryDisplay {
  timestamp: string
  serviceName: string
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  metadata?: Record<string, unknown>
}

/**
 * Composable for managing live service logs via WebSocket
 */
export function useLiveServiceLogs(serviceName: string) {
  const logs = ref<LogEntryDisplay[]>([])
  const isConnected = ref(false)
  const error = ref<string | null>(null)
  let ws: WebSocket | null = null
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null

  /**
   * Format log entry for display
   */
  function formatLogEntry(entry: LogEntryDisplay): string {
    const time = new Date(entry.timestamp).toLocaleTimeString()
    const levelTag = `[${entry.level.toUpperCase()}]`
    const meta = entry.metadata ? ` ${JSON.stringify(entry.metadata)}` : ''
    return `${time} ${levelTag} ${entry.message}${meta}`
  }

  /**
   * Get CSS class for log level
   */
  function getLevelClass(level: string): string {
    const classes: Record<string, string> = {
      debug: 'text-gray-400',
      info: 'text-blue-400',
      warn: 'text-yellow-400',
      error: 'text-red-400',
    }
    return classes[level] || 'text-gray-400'
  }

  /**
   * Connect to WebSocket for live logs
   */
  function connect(): void {
    if (!serviceName) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/ws/dicom/logs/${serviceName}`

    try {
      ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        isConnected.value = true
        error.value = null
        console.log(`WebSocket connected to ${serviceName} logs`)

        // Send service name to server in case URL parameters aren't accessible
        ws?.send(JSON.stringify({
          type: 'identify',
          serviceName,
        }))
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          if (data.type === 'log' && data.entry) {
            // Add new logs at the beginning (latest first)
            logs.value.unshift(data.entry)

            // Keep only last 1000 logs in memory
            if (logs.value.length > 1000) {
              logs.value.pop()
            }
          }
          else if (data.type === 'ready') {
            console.log(`WebSocket ready for ${serviceName}`)
          }
        }
        catch (err) {
          console.error('Error parsing WebSocket message:', err)
        }
      }

      ws.onerror = (event) => {
        const errorMsg = `WebSocket error: ${event.type}`
        error.value = errorMsg
        console.error(errorMsg)
      }

      ws.onclose = () => {
        isConnected.value = false
        console.log(`WebSocket disconnected from ${serviceName} logs`)

        // Attempt to reconnect after 3 seconds
        reconnectTimeout = setTimeout(() => {
          connect()
        }, 3000)
      }
    }
    catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      error.value = errorMsg
      console.error('Failed to connect WebSocket:', errorMsg)
    }
  }

  /**
   * Disconnect from WebSocket
   */
  function disconnect(): void {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout)
      reconnectTimeout = null
    }

    if (ws) {
      ws.close()
      ws = null
    }

    isConnected.value = false
  }

  /**
   * Clear logs
   */
  function clearLogs(): void {
    logs.value = []
  }

  /**
   * Export logs as text
   */
  function exportLogs(): string {
    return logs.value.map(formatLogEntry).join('\n')
  }

  // Connect on mount
  onMounted(() => {
    connect()
  })

  // Disconnect on unmount
  onBeforeUnmount(() => {
    disconnect()
  })

  return {
    logs: readonly(logs),
    isConnected: readonly(isConnected),
    error: readonly(error),
    formatLogEntry,
    getLevelClass,
    clearLogs,
    exportLogs,
    connect,
    disconnect,
  }
}
