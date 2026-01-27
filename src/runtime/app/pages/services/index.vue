<template>
  <div class="h-full flex flex-col overflow-hidden">
    <!-- Header -->
    <div class="border-b border-gray-200 dark:border-gray-800 px-6 py-3 shrink-0">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <h1 class="text-lg font-semibold">
            DICOM Services
          </h1>
        </div>
        <div class="flex items-center gap-3">
          <UButton
            icon="i-lucide-plus"
            label="New Service"
            color="primary"
            size="sm"
            @click="handleNewService"
          />
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 min-h-0 overflow-y-auto">
      <div class="max-w-7xl mx-auto p-6">
        <!-- Stats Overview -->
        <div
          v-if="stats"
          class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <NUtilsStatCard
            icon="i-lucide-server"
            :value="stats.total"
            label="Total Services"
            variant="gray"
          />
          <NUtilsStatCard
            icon="i-lucide-check-circle"
            :value="stats.running"
            label="Running Services"
            variant="success"
          />
          <NUtilsStatCard
            icon="i-lucide-zap"
            :value="stats.registeredHandlers"
            label="Registered Handlers"
            variant="primary"
          />
          <NUtilsStatCard
            icon="i-lucide-plug"
            :value="stats.usedHandlers"
            label="Used Handlers"
            variant="info"
          />
        </div>

        <!-- Tabs - Left Aligned, Smaller Size with Full Width Bottom Border -->
        <div class="mb-6">
          <UTabs
            v-model="activeTab"
            :items="tabs"
            size="sm"
            variant="link"
            :ui="{ root: 'w-full', list: 'w-full border-b', trigger: 'justify-start' }"
            :default-value="'services'"
          />
        </div>

        <!-- Tab Content -->
        <div class="space-y-6">
          <!-- Services Tab -->
          <ServiceItem
            v-if="activeTab === 'services'"
            :services="services"
            @start-service="handleStartService"
            @stop-service="handleStopService"
          />

          <!-- Event Handlers Tab -->
          <EventHandlerItem
            v-if="activeTab === 'handlers'"
            :handlers="handlers"
            :services="services"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useComponentRouter, ref, computed, onMounted, useFetch } from '#imports'
import ServiceItem from '../../components/ServiceItem.vue'
import EventHandlerItem from '../../components/EventHandlerItem.vue'

const componentRouter = useComponentRouter()
const activeTab = ref('services')

// Transform function for services
const transformServices = (data: unknown): Array<{
  name: string
  status: 'running' | 'stopped'
  port: number
  callingAETitle: string
  fileCount: number
  eventCount: number
  lastActivityAt?: string
  isRunning: boolean
  eventHandlers: Record<string, string[]>
}> => {
  const arr = Array.isArray(data) ? data : []
  return arr.map(s => ({
    name: String((s as Record<string, unknown>).name || ''),
    status: ((s as Record<string, unknown>).status as 'running' | 'stopped') || 'stopped',
    port: Number((s as Record<string, unknown>).port || 0),
    callingAETitle: String((s as Record<string, unknown>).callingAETitle || 'STORESCP'),
    fileCount: Number((s as Record<string, unknown>).fileCount || 0),
    eventCount: Number((s as Record<string, unknown>).eventCount || 0),
    lastActivityAt: (s as Record<string, unknown>).lastActivityAt as string | undefined,
    isRunning: Boolean((s as Record<string, unknown>).isRunning),
    eventHandlers: ((s as Record<string, unknown>).eventHandlers as Record<string, string[]>) || {},
  }))
}

// Transform function for handlers
const transformHandlers = (data: unknown): Array<{
  serviceName: string
  eventType: string
  eventId: string
  name: string
  description: string
}> => {
  const response = (typeof data === 'object' && data !== null) ? (data as Record<string, unknown>) : {}
  const handlers = Array.isArray(response.handlers) ? response.handlers : []
  return handlers.map(h => ({
    serviceName: String((h as Record<string, unknown>).serviceName || ''),
    eventType: String((h as Record<string, unknown>).eventType || ''),
    eventId: String((h as Record<string, unknown>).eventId || ''),
    name: String((h as Record<string, unknown>).name || ''),
    description: String((h as Record<string, unknown>).description || ''),
  }))
}

// Fetch services using useFetch with transform and default
const { data: services, refresh: refreshServices } = await useFetch('/api/dicom/services', {
  transform: transformServices,
  default: () => [],
})

// Fetch handlers using useFetch with transform and default
const { data: handlers } = await useFetch('/api/dicom/handlers', {
  transform: transformHandlers,
  default: () => [],
})

// Handle start service with refresh
async function handleStartService(serviceName: string) {
  try {
    await $fetch(`/api/dicom/services/${serviceName}/start`, { method: 'POST' })
    // Wait a brief moment for the service to start, then refresh
    await new Promise(resolve => setTimeout(resolve, 500))
    await refreshServices()
  }
  catch (err) {
    console.error('Error starting service:', err)
  }
}

// Handle stop service with refresh
async function handleStopService(serviceName: string) {
  try {
    await $fetch(`/api/dicom/services/${serviceName}/stop`, { method: 'POST' })
    // Wait a brief moment for the service to stop, then refresh
    await new Promise(resolve => setTimeout(resolve, 500))
    await refreshServices()
  }
  catch (err) {
    console.error('Error stopping service:', err)
  }
}

// Navigate to create new service
function handleNewService() {
  componentRouter.push('/services/new')
}

// Computed stats with live updates
const stats = computed(() => {
  const servicesList = services.value || []

  // Count running services using isRunning flag
  const runningCount = servicesList.filter((s: { isRunning?: boolean }) => s.isRunning === true).length

  // Calculate total event handlers used across all services
  const usedHandlers = new Set<string>()
  servicesList.forEach((s: { eventHandlers?: Record<string, unknown> }) => {
    if (s.eventHandlers) {
      Object.values(s.eventHandlers).forEach((handlers: unknown) => {
        if (Array.isArray(handlers)) {
          handlers.forEach((h: string) => usedHandlers.add(h))
        }
      })
    }
  })

  return {
    total: servicesList.length,
    running: runningCount,
    registeredHandlers: handlers.value?.length || 0,
    usedHandlers: usedHandlers.size,
  }
})

// Tabs configuration with dynamic counts
const tabs = computed(() => [
  {
    label: 'Services',
    icon: 'i-lucide-server',
    value: 'services',
  },
  {
    label: `Event Handlers (${handlers.value?.length || 0})`,
    icon: 'i-lucide-zap',
    value: 'handlers',
  },
])

// Refresh services on mount and set interval
onMounted(async () => {
  // Refresh every 5 seconds
  setInterval(() => refreshServices(), 5000)
})
</script>
