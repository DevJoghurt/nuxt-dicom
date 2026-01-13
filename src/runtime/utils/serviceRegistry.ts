import type { StoreScpConfig } from './schema'

/**
 * Registered DICOM service metadata
 */
export interface RegisteredDicomService {
  id: string // Unique service identifier
  type: 'storeScp' // Service type
  name: string // Display name
  config: StoreScpConfig
  eventHandlers: Map<string, string[]> // Maps event IDs to handler names
  status: 'initialized' | 'running' | 'stopped' | 'error'
  createdAt: Date
  startedAt?: Date
}

/**
 * DICOM handler metadata from scanned files
 */
export interface DicomHandlerMetadata {
  serviceName: string
  eventType: string
  eventId: string
  name: string
  description?: string
}

/**
 * Global service registry
 * Stores all registered DICOM services and manages event handler mapping
 */
class ServiceRegistry {
  private services = new Map<string, RegisteredDicomService>()
  private handlerMetadata: Map<string, DicomHandlerMetadata> = new Map()

  /**
   * Initialize registry with scanned handlers
   */
  initializeWithHandlers(handlers: DicomHandlerMetadata[]): void {
    for (const handler of handlers) {
      this.handlerMetadata.set(handler.name, handler)
    }
  }

  /**
   * Register a new DICOM service
   */
  registerService(
    id: string,
    type: 'storeScp',
    name: string,
    config: StoreScpConfig,
    eventHandlers?: Record<string, string[]>,
  ): RegisteredDicomService {
    const handlersMap = new Map<string, string[]>()

    // If eventHandlers provided, add them directly
    if (eventHandlers) {
      for (const [eventId, handlerNames] of Object.entries(eventHandlers)) {
        handlersMap.set(eventId, handlerNames)
      }
    }

    const service: RegisteredDicomService = {
      id,
      type,
      name,
      config,
      eventHandlers: handlersMap,
      status: 'initialized',
      createdAt: new Date(),
    }

    this.services.set(id, service)
    return service
  }

  /**
   * Get a registered service by ID
   */
  getService(id: string): RegisteredDicomService | undefined {
    return this.services.get(id)
  }

  /**
   * Get all registered services
   */
  getAllServices(): RegisteredDicomService[] {
    return Array.from(this.services.values())
  }

  /**
   * Get handlers for a specific service and event
   */
  getHandlersForEvent(serviceId: string, eventId: string): DicomHandlerMetadata[] {
    const service = this.services.get(serviceId)
    if (!service) return []

    const handlerNames = service.eventHandlers.get(eventId) || []
    return handlerNames
      .map(name => this.handlerMetadata.get(name))
      .filter((h): h is DicomHandlerMetadata => h !== undefined)
  }

  /**
   * Get all handlers for a service
   */
  getServiceHandlers(serviceId: string): DicomHandlerMetadata[] {
    const service = this.services.get(serviceId)
    if (!service) return []

    const handlers: DicomHandlerMetadata[] = []
    for (const handlerNames of service.eventHandlers.values()) {
      for (const name of handlerNames) {
        const handler = this.handlerMetadata.get(name)
        if (handler && !handlers.some(h => h.name === handler.name)) {
          handlers.push(handler)
        }
      }
    }
    return handlers
  }

  /**
   * Update service status
   */
  updateServiceStatus(
    id: string,
    status: RegisteredDicomService['status'],
    startedAt?: Date,
  ): void {
    const service = this.services.get(id)
    if (service) {
      service.status = status
      if (startedAt) {
        service.startedAt = startedAt
      }
    }
  }

  /**
   * Add event handler to service
   */
  addEventHandler(serviceId: string, eventId: string, handlerName: string): void {
    const service = this.services.get(serviceId)
    if (service) {
      const handlers = service.eventHandlers.get(eventId) || []
      if (!handlers.includes(handlerName)) {
        handlers.push(handlerName)
        service.eventHandlers.set(eventId, handlers)
      }
    }
  }

  /**
   * Remove event handler from service
   */
  removeEventHandler(serviceId: string, eventId: string, handlerName: string): void {
    const service = this.services.get(serviceId)
    if (service) {
      const handlers = service.eventHandlers.get(eventId) || []
      const idx = handlers.indexOf(handlerName)
      if (idx !== -1) {
        handlers.splice(idx, 1)
        if (handlers.length === 0) {
          service.eventHandlers.delete(eventId)
        }
        else {
          service.eventHandlers.set(eventId, handlers)
        }
      }
    }
  }

  /**
   * Remove a registered service
   */
  removeService(id: string): boolean {
    return this.services.delete(id)
  }

  /**
   * Clear all services and handlers
   */
  clear(): void {
    this.services.clear()
    this.handlerMetadata.clear()
  }
}

// Export singleton instance
export const dicomServiceRegistry = new ServiceRegistry()
