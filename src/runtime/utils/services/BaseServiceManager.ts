/**
 * Base interface for service instances
 */
export interface ServiceInstance {
  start(): void | Promise<void>
  stop(): void | Promise<void>
}

/**
 * Base configuration for any service
 */
export interface ServiceConfig {
  name?: string
  port?: number
  verbose?: boolean
  autoStart?: boolean
}

/**
 * Base class for service managers
 * Provides common interface for starting, stopping, and managing service instances
 */
export abstract class BaseServiceManager<
  TInstance extends ServiceInstance = ServiceInstance,
  TConfig extends ServiceConfig = ServiceConfig,
> {
  protected instances: Map<string, TInstance> = new Map()
  protected started: Set<string> = new Set()
  protected serviceConfigs: Map<string, TConfig> = new Map()

  /**
   * Create and configure a service instance
   */
  abstract createService(serviceName: string, config: TConfig): Promise<TInstance>

  /**
   * Start a service
   */
  abstract startService(serviceName: string): Promise<void>

  /**
   * Stop a service
   */
  abstract stopService(serviceName: string): Promise<void>

  /**
   * Get a service instance
   */
  getService(serviceName: string): TInstance | undefined {
    return this.instances.get(serviceName)
  }

  /**
   * Check if a service is running
   */
  isRunning(serviceName: string): boolean {
    return this.started.has(serviceName)
  }

  /**
   * Get all service instances
   */
  getAllServices(): Record<string, TInstance> {
    const result: Record<string, TInstance> = {}
    for (const [name, instance] of this.instances) {
      result[name] = instance
    }
    return result
  }

  /**
   * Get all running service names
   */
  getRunningServices(): string[] {
    return Array.from(this.started)
  }

  /**
   * Get service configuration
   */
  getServiceConfig(serviceName: string): TConfig | undefined {
    return this.serviceConfigs.get(serviceName)
  }

  /**
   * Restart a service (stop then start)
   */
  async restartService(serviceName: string): Promise<void> {
    if (this.isRunning(serviceName)) {
      await this.stopService(serviceName)
    }
    await this.startService(serviceName)
  }

  /**
   * Stop all running services
   */
  async stopAllServices(): Promise<void> {
    const serviceNames = Array.from(this.started)
    for (const serviceName of serviceNames) {
      try {
        await this.stopService(serviceName)
      }
      catch (error) {
        console.error(`Failed to stop service "${serviceName}":`, error)
      }
    }
  }

  /**
   * Delete a service instance
   */
  deleteService(serviceName: string): boolean {
    if (this.started.has(serviceName)) {
      console.warn(
        `Cannot delete running service "${serviceName}". Stop it first.`,
      )
      return false
    }
    this.instances.delete(serviceName)
    this.serviceConfigs.delete(serviceName)
    return true
  }
}
