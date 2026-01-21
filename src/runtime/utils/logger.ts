/**
 * Log entry representing a single log message
 */
export interface LogEntry {
  timestamp: Date
  serviceName: string
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  metadata?: Record<string, unknown>
}

/**
 * Log listener callback type
 */
export type LogListener = (entry: LogEntry) => void

/**
 * Centralized logging service
 * Manages logs for all services and notifies listeners of new entries
 */
class DicomLogger {
  private logs: Map<string, LogEntry[]> = new Map()
  private listeners: Map<string, Set<LogListener>> = new Map() // service -> listeners
  private globalListeners: Set<LogListener> = new Set()
  private maxLogsPerService = 1000
  private maxGlobalLogs = 5000

  /**
   * Subscribe to logs for a specific service
   */
  subscribe(serviceName: string, listener: LogListener): () => void {
    if (!this.listeners.has(serviceName)) {
      this.listeners.set(serviceName, new Set())
    }
    this.listeners.get(serviceName)!.add(listener)

    // Return unsubscribe function
    return () => {
      this.listeners.get(serviceName)?.delete(listener)
    }
  }

  /**
   * Subscribe to all logs globally
   */
  subscribeGlobal(listener: LogListener): () => void {
    this.globalListeners.add(listener)

    // Return unsubscribe function
    return () => {
      this.globalListeners.delete(listener)
    }
  }

  /**
   * Log a message
   */
  log(
    serviceName: string,
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    metadata?: Record<string, unknown>,
  ): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      serviceName,
      level,
      message,
      metadata,
    }

    // Store in service-specific logs
    if (!this.logs.has(serviceName)) {
      this.logs.set(serviceName, [])
    }
    const serviceLogs = this.logs.get(serviceName)!
    serviceLogs.push(entry)

    // Prune old logs if exceeding max
    if (serviceLogs.length > this.maxLogsPerService) {
      serviceLogs.splice(0, serviceLogs.length - this.maxLogsPerService)
    }

    // Notify service-specific listeners
    const serviceListeners = this.listeners.get(serviceName)
    if (serviceListeners) {
      for (const listener of serviceListeners) {
        try {
          listener(entry)
        }
        catch (error) {
          console.error('Error in log listener:', error)
        }
      }
    }

    // Notify global listeners
    for (const listener of this.globalListeners) {
      try {
        listener(entry)
      }
      catch (error) {
        console.error('Error in global log listener:', error)
      }
    }
  }

  /**
   * Log at debug level
   */
  debug(serviceName: string, message: string, metadata?: Record<string, unknown>): void {
    this.log(serviceName, 'debug', message, metadata)
  }

  /**
   * Log at info level
   */
  info(serviceName: string, message: string, metadata?: Record<string, unknown>): void {
    this.log(serviceName, 'info', message, metadata)
  }

  /**
   * Log at warn level
   */
  warn(serviceName: string, message: string, metadata?: Record<string, unknown>): void {
    this.log(serviceName, 'warn', message, metadata)
  }

  /**
   * Log at error level
   */
  error(serviceName: string, message: string, metadata?: Record<string, unknown>): void {
    this.log(serviceName, 'error', message, metadata)
  }

  /**
   * Get all logs for a service
   */
  getLogs(serviceName: string): LogEntry[] {
    return this.logs.get(serviceName) || []
  }

  /**
   * Get last N logs for a service
   */
  getRecentLogs(serviceName: string, count: number = 100): LogEntry[] {
    const logs = this.logs.get(serviceName) || []
    return logs.slice(Math.max(0, logs.length - count))
  }

  /**
   * Clear logs for a service
   */
  clearLogs(serviceName: string): void {
    this.logs.delete(serviceName)
  }

  /**
   * Clear all logs
   */
  clearAllLogs(): void {
    this.logs.clear()
  }

  /**
   * Get all services that have logs
   */
  getServices(): string[] {
    return Array.from(this.logs.keys())
  }

  /**
   * Format log entry for display
   */
  formatLogEntry(entry: LogEntry): string {
    const time = entry.timestamp.toLocaleTimeString()
    const levelTag = `[${entry.level.toUpperCase()}]`
    const meta = entry.metadata ? ` ${JSON.stringify(entry.metadata)}` : ''
    return `${time} ${levelTag} ${entry.message}${meta}`
  }
}

/**
 * Global logger instance
 */
export const dicomLogger = new DicomLogger()
