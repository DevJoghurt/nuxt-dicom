<template>
  <div>
    <div
      v-if="!services || services.length === 0"
      class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-8 text-center text-gray-500"
    >
      <UIcon
        name="i-lucide-server-off"
        class="w-12 h-12 mx-auto mb-3 opacity-50"
      />
      <p>No services configured</p>
      <UButton
        size="xs"
        color="primary"
        class="mt-4"
        @click="handleNewService"
      >
        Create Service
      </UButton>
    </div>

    <div
      v-else
      class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden"
    >
      <div class="divide-y divide-gray-100 dark:divide-gray-800">
        <div
          v-for="service in services"
          :key="service.name"
          class="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors cursor-pointer"
          @click="selectService(service.name)"
        >
          <div class="flex items-start justify-between gap-4">
            <!-- Left: Service Info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <UIcon
                  name="i-lucide-server"
                  class="w-4 h-4 text-gray-400"
                />
                <h3 class="font-medium truncate">
                  {{ service.name }}
                </h3>
                <UBadge
                  :color="service.isRunning ? 'success' : 'neutral'"
                  variant="subtle"
                  size="xs"
                >
                  {{ service.isRunning ? 'running' : 'stopped' }}
                </UBadge>
              </div>
              <p class="text-sm text-gray-500 truncate">
                {{ service.callingAETitle }} • Port {{ service.port }}
              </p>
            </div>

            <!-- Right: Stats & Actions -->
            <div class="flex items-center gap-4 shrink-0">
              <UButton
                v-if="!service.isRunning"
                icon="i-lucide-play"
                size="xs"
                color="success"
                variant="ghost"
                square
                @click.stop="startService(service.name)"
              />
              <UButton
                v-else
                icon="i-lucide-square"
                size="xs"
                color="error"
                variant="ghost"
                square
                @click.stop="stopService(service.name)"
              />
              <UButton
                icon="i-lucide-arrow-right"
                size="xs"
                color="neutral"
                variant="ghost"
                square
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useComponentRouter } from '#imports'

const componentRouter = useComponentRouter()

interface ServiceInfo {
  name: string
  status: 'running' | 'stopped'
  port: number
  callingAETitle: string
  fileCount: number
  eventCount: number
  lastActivityAt?: string
  isRunning: boolean
  eventHandlers: Record<string, string[]>
}

defineProps<{
  services: ServiceInfo[] | null
}>()

const emit = defineEmits<{
  startService: [serviceName: string]
  stopService: [serviceName: string]
}>()

async function startService(serviceName: string) {
  emit('startService', serviceName)
}

async function stopService(serviceName: string) {
  emit('stopService', serviceName)
}

function selectService(name: string) {
  componentRouter.push(`/services/${encodeURIComponent(name)}`)
}

function handleNewService() {
  componentRouter.push('/services/new')
}
</script>
