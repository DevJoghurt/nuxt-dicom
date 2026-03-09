<template>
  <div class="h-full flex flex-col overflow-hidden">
    <!-- Header -->
    <div class="border-b border-gray-200 dark:border-gray-800 px-6 py-3 shrink-0">
      <div class="flex items-center justify-between">
        <h1 class="text-lg font-semibold">
          Services
        </h1>
        <UButton
          icon="i-lucide-plus"
          label="New Service"
          color="primary"
          size="sm"
          @click="handleNewService"
        />
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 min-h-0 overflow-y-auto">
      <div class="px-4 py-6">
        <!-- Stats Overview -->
        <div
          v-if="stats"
          class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
        >
          <NUtilsStatCard
            icon="i-lucide-server"
            :value="stats.internal"
            label="Internal"
            variant="gray"
          />
          <NUtilsStatCard
            icon="i-lucide-check-circle"
            :value="stats.running"
            label="Running"
            variant="gray"
          />
          <NUtilsStatCard
            icon="i-lucide-send"
            :value="stats.external"
            label="External"
            variant="gray"
          />
          <NUtilsStatCard
            icon="i-lucide-zap"
            :value="stats.registeredHandlers"
            label="Handlers"
            variant="gray"
          />
        </div>

        <!-- Filter toolbar -->
        <div class="mb-5">
          <UInput
            v-model="filter"
            icon="i-lucide-search"
            placeholder="Filter services…"
            size="sm"
            class="w-64"
          />
        </div>

        <!-- Services list -->
        <ServiceItem
          :services="filteredServices"
          @start-service="handleStartService"
          @stop-service="handleStopService"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useComponentRouter, ref, computed, onMounted, useFetch } from '#imports'
import ServiceItem from '../../components/service/Item.vue'
import type { UnifiedServiceInfo } from '../../components/service/Item.vue'

const componentRouter = useComponentRouter()
const filter = ref('')

const transformServices = (data: unknown): UnifiedServiceInfo[] => {
  const arr = Array.isArray(data) ? data : []
  return arr.map((s) => {
    const obj = s as Record<string, unknown>
    if (obj.kind === 'external') {
      return {
        kind: 'external' as const,
        name: String(obj.name || ''),
        label: String(obj.label || obj.name || ''),
        protocol: (obj.protocol as 'dimse' | 'dicomweb') || 'dimse',
        addr: String(obj.addr || ''),
        calledAeTitle: obj.calledAeTitle as string | undefined,
        callingAeTitle: obj.callingAeTitle as string | undefined,
        description: obj.description as string | undefined,
      }
    }
    return {
      kind: 'storeScp' as const,
      name: String(obj.name || ''),
      isRunning: Boolean(obj.isRunning),
      port: Number(obj.port || 0),
      callingAETitle: String(obj.callingAETitle || 'STORESCP'),
      eventHandlers: (obj.eventHandlers as Record<string, string[]>) || {},
    }
  })
}

const { data: services, refresh: refreshServices } = await useFetch('/api/dicom/services', {
  transform: transformServices,
  default: (): UnifiedServiceInfo[] => [],
})

const { data: handlers } = await useFetch('/api/dicom/handlers', {
  transform: (data: unknown) => {
    const response = (typeof data === 'object' && data !== null) ? (data as Record<string, unknown>) : {}
    return Array.isArray(response.handlers) ? response.handlers : []
  },
  default: () => [],
})

const filteredServices = computed(() => {
  const q = filter.value.toLowerCase()
  return (services.value || []).filter((s) => {
    if (!q) return true
    if (s.name.toLowerCase().includes(q)) return true
    if (s.kind === 'external' && s.label.toLowerCase().includes(q)) return true
    return false
  })
})

async function handleStartService(serviceName: string) {
  try {
    await $fetch(`/api/dicom/services/${serviceName}/start`, { method: 'POST' })
    await new Promise(resolve => setTimeout(resolve, 500))
    await refreshServices()
  }
  catch (err) {
    console.error('Error starting service:', err)
  }
}

async function handleStopService(serviceName: string) {
  try {
    await $fetch(`/api/dicom/services/${serviceName}/stop`, { method: 'POST' })
    await new Promise(resolve => setTimeout(resolve, 500))
    await refreshServices()
  }
  catch (err) {
    console.error('Error stopping service:', err)
  }
}

function handleNewService() {
  componentRouter.push('/services/new')
}

const stats = computed(() => {
  const list = services.value || []
  const internal = list.filter(s => s.kind === 'storeScp')
  const runningCount = internal.filter(s => s.kind === 'storeScp' && s.isRunning).length
  return {
    internal: internal.length,
    running: runningCount,
    external: list.filter(s => s.kind === 'external').length,
    registeredHandlers: handlers.value?.length || 0,
  }
})

onMounted(() => {
  setInterval(() => refreshServices(), 5000)
})
</script>


