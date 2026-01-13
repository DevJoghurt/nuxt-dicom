<template>
  <div class="h-full flex flex-col overflow-hidden">
    <!-- Header with Back Button -->
    <div class="border-b border-gray-200 dark:border-gray-800 px-6 py-3 shrink-0">
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            size="sm"
            square
            @click="goBack"
          />
          <h1 class="text-lg font-semibold">Service Details</h1>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 min-h-0 overflow-y-auto">
      <div class="max-w-4xl mx-auto p-6">
        <div v-if="loading" class="text-center py-12">
          <UIcon
            name="i-lucide-loader-2"
            class="w-12 h-12 animate-spin mx-auto mb-3 opacity-50"
          />
          <p class="text-gray-500 dark:text-gray-400">Loading service details...</p>
        </div>

        <div v-else-if="service" class="space-y-6">
          <!-- Service Header -->
          <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1">
                <h2 class="text-2xl font-bold mb-2">{{ service.name }}</h2>
                <p class="text-gray-600 dark:text-gray-400">
                  {{ service.callingAETitle }} • Port {{ service.port }}
                </p>
              </div>
              <UBadge
                :color="service.isRunning ? 'success' : 'neutral'"
                variant="solid"
                size="lg"
              >
                {{ service.isRunning ? 'Running' : 'Stopped' }}
              </UBadge>
            </div>

            <!-- Quick Stats -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">Port</p>
                <p class="font-semibold">{{ service.port }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">Storage Path</p>
                <p class="font-semibold text-sm truncate">{{ service.outDir }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">Auto Start</p>
                <p class="font-semibold">{{ service.autoStart ? 'Yes' : 'No' }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">Status</p>
                <p class="font-semibold">{{ service.isRunning ? 'Running' : 'Stopped' }}</p>
              </div>
            </div>
          </div>

          <!-- Service Actions -->
          <div class="flex gap-2">
            <UButton
              v-if="!service.isRunning"
              icon="i-lucide-play"
              label="Start Service"
              color="success"
              @click="startService"
            />
            <UButton
              v-else
              icon="i-lucide-square"
              label="Stop Service"
              color="error"
              @click="stopService"
            />
            <UButton
              icon="i-lucide-refresh-cw"
              label="Refresh"
              color="neutral"
              variant="ghost"
              @click="() => refreshService()"
            />
          </div>

          <!-- Configuration Details -->
          <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <h3 class="text-lg font-semibold mb-4">Configuration</h3>
            <div class="space-y-3">
              <div class="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-800 last:border-b-0">
                <span class="text-gray-600 dark:text-gray-400">Service Name:</span>
                <code class="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded text-sm">{{ service.name }}</code>
              </div>
              <div class="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-800 last:border-b-0">
                <span class="text-gray-600 dark:text-gray-400">Calling AE Title:</span>
                <code class="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded text-sm">{{ service.callingAETitle }}</code>
              </div>
              <div class="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-800 last:border-b-0">
                <span class="text-gray-600 dark:text-gray-400">Port:</span>
                <code class="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded text-sm">{{ service.port }}</code>
              </div>
              <div class="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-800 last:border-b-0">
                <span class="text-gray-600 dark:text-gray-400">Storage Directory:</span>
                <code class="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded text-sm">{{ service.outDir }}</code>
              </div>
              <div class="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-800 last:border-b-0">
                <span class="text-gray-600 dark:text-gray-400">Auto Start:</span>
                <UBadge :color="service.autoStart ? 'success' : 'neutral'" variant="soft" size="sm">
                  {{ service.autoStart ? 'Enabled' : 'Disabled' }}
                </UBadge>
              </div>
              <div v-if="service.createdAt" class="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-800 last:border-b-0">
                <span class="text-gray-600 dark:text-gray-400">Created At:</span>
                <span class="text-sm">{{ new Date(service.createdAt).toLocaleString() }}</span>
              </div>
              <div v-if="service.startedAt && service.isRunning" class="flex justify-between items-center">
                <span class="text-gray-600 dark:text-gray-400">Started At:</span>
                <span class="text-sm">{{ new Date(service.startedAt).toLocaleString() }}</span>
              </div>
            </div>
          </div>

          <!-- Event Handlers -->
          <div v-if="service.eventHandlers && Object.keys(service.eventHandlers).length > 0" class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <h3 class="text-lg font-semibold mb-4">Event Handlers</h3>
            <div class="space-y-3">
              <div
                v-for="(handlers, eventType) in service.eventHandlers"
                :key="eventType"
                class="pb-3 border-b border-gray-200 dark:border-gray-800 last:border-b-0"
              >
                <div class="flex items-center gap-2 mb-2">
                  <UIcon name="i-lucide-zap" class="w-4 h-4 text-amber-400" />
                  <span class="font-medium">{{ eventType }}</span>
                </div>
                <div class="flex flex-wrap gap-2 ml-6">
                  <UBadge
                    v-for="handler in handlers"
                    :key="handler"
                    color="info"
                    variant="subtle"
                    size="sm"
                  >
                    {{ handler }}
                  </UBadge>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="text-center py-12">
          <p class="text-gray-500">Service not found</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface DicomService {
  name: string
  status: 'running' | 'stopped'
  port: number
  callingAETitle: string
  outDir: string
  autoStart: boolean
  isRunning: boolean
  createdAt?: string
  startedAt?: string
  eventHandlers?: Record<string, string[]>
}

const componentRouter = useComponentRouter()

const serviceName = computed(() => {
  return componentRouter.route.value.params.name as string
})

// Transform function for service data
const transformService = (data: unknown): DicomService => {
  const s = (data as Record<string, unknown>) || {}
  return {
    name: String(s.name || ''),
    status: (s.isRunning ? 'running' : 'stopped') as 'running' | 'stopped',
    port: Number(s.port || 0),
    callingAETitle: String(s.callingAETitle || 'STORESCP'),
    outDir: String(s.outDir || ''),
    autoStart: Boolean(s.autoStart),
    isRunning: Boolean(s.isRunning),
    createdAt: s.createdAt as string | undefined,
    startedAt: s.startedAt as string | undefined,
    eventHandlers: (s.eventHandlers as Record<string, string[]>) || {},
  }
}

// Fetch service data using useFetch
const { data: service, pending: loading, refresh: refreshService } = useFetch(
  () => `/api/dicom/services/${serviceName.value}`,
  {
    transform: transformService,
    watch: [serviceName],
  },
)

async function startService() {
  if (!serviceName.value) return

  try {
    await $fetch(`/api/dicom/services/${serviceName.value}/start`, { method: 'POST' })
    await new Promise(resolve => setTimeout(resolve, 500))
    await refreshService()
  }
  catch (err) {
    console.error('Error starting service:', err)
  }
}

async function stopService() {
  if (!serviceName.value) return

  try {
    await $fetch(`/api/dicom/services/${serviceName.value}/stop`, { method: 'POST' })
    await new Promise(resolve => setTimeout(resolve, 500))
    await refreshService()
  }
  catch (err) {
    console.error('Error stopping service:', err)
  }
}

function goBack() {
  componentRouter.push('/services')
}
</script>
