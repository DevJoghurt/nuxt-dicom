<template>
  <div>
    <div
      v-if="!enhancedHandlers || enhancedHandlers.length === 0"
      class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-8 text-center text-gray-500"
    >
      <UIcon
        name="i-lucide-zap-off"
        class="w-12 h-12 mx-auto mb-3 opacity-50"
      />
      <p>No event handlers registered</p>
    </div>

    <div
      v-else
      class="grid gap-4"
    >
      <div
        v-for="handler in enhancedHandlers"
        :key="handler.eventId"
        class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors overflow-hidden"
      >
        <div class="p-4">
          <!-- Header: Name + Event Badge -->
          <div class="flex items-start justify-between gap-4 mb-3">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-3 mb-1">
                <div
                  class="flex items-center justify-center w-8 h-8 rounded bg-gradient-to-br"
                  :class="eventTypeColors[handler.eventType as keyof typeof eventTypeColors]?.bgClass || 'from-gray-400 to-gray-500'"
                >
                  <UIcon
                    :name="eventTypeIcons[handler.eventType as keyof typeof eventTypeIcons] || 'i-lucide-zap'"
                    class="w-4 h-4 text-white"
                  />
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="font-semibold text-base truncate">
                    {{ handler.name || 'Unnamed Handler' }}
                  </h3>
                </div>
              </div>
              <p
                v-if="handler.description"
                class="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2"
              >
                {{ handler.description }}
              </p>
            </div>
            <div class="shrink-0">
              <UBadge
                :color="handler.isUsed ? 'green' : 'gray'"
                variant="soft"
                size="sm"
              >
                {{ handler.isUsed ? 'In Use' : 'Unused' }}
              </UBadge>
            </div>
          </div>

          <!-- Event Type Badge -->
          <div class="mb-3">
            <UBadge
              :color="eventTypeColors[handler.eventType as keyof typeof eventTypeColors]?.color || 'gray'"
              variant="subtle"
              size="sm"
            >
              {{ eventTypeLabels[handler.eventType as keyof typeof eventTypeLabels] || handler.eventType }}
            </UBadge>
          </div>

          <!-- Services Using This Handler -->
          <div
            v-if="handler.isUsed && handler.servicesUsing.length > 0"
            class="border-t border-gray-200 dark:border-gray-800 pt-3"
          >
            <p class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
              Used by {{ handler.servicesUsing.length }} service(s):
            </p>
            <div class="flex flex-wrap gap-2">
              <UBadge
                v-for="service in handler.servicesUsing"
                :key="service.name"
                color="blue"
                variant="subtle"
                size="xs"
              >
                <UIcon
                  name="i-lucide-server"
                  class="w-3 h-3 mr-1"
                />
                {{ service.name }}
              </UBadge>
            </div>
          </div>

          <!-- Handler Info Footer -->
          <div class="border-t border-gray-200 dark:border-gray-800 mt-3 pt-3">
            <p class="text-xs text-gray-500 dark:text-gray-400">
              Event ID: <code class="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{{ handler.eventId }}</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from '#imports'

interface DicomEventHandler {
  serviceName: string
  eventType: string
  eventId: string
  name: string
  description: string
}

interface ServiceInfo {
  name: string
  eventHandlers: Record<string, string[]>
}

interface EnhancedHandler extends DicomEventHandler {
  isUsed: boolean
  servicesUsing: ServiceInfo[]
}

const props = defineProps<{
  handlers: DicomEventHandler[] | null
  services?: ServiceInfo[] | null
}>()

// Icon mapping for event types
const eventTypeIcons: Record<string, string> = {
  onBeforeStore: 'i-lucide-shield-check',
  onFileStored: 'i-lucide-check-circle-2',
  onStudyCompleted: 'i-lucide-flag-check',
  onServerStarted: 'i-lucide-play-circle',
  onError: 'i-lucide-alert-circle',
}

// Color and label mapping for event types
const eventTypeColors: Record<string, { color: string, bgClass: string }> = {
  onBeforeStore: { color: 'amber', bgClass: 'from-amber-400 to-amber-600' },
  onFileStored: { color: 'green', bgClass: 'from-green-400 to-green-600' },
  onStudyCompleted: { color: 'blue', bgClass: 'from-blue-400 to-blue-600' },
  onServerStarted: { color: 'purple', bgClass: 'from-purple-400 to-purple-600' },
  onError: { color: 'red', bgClass: 'from-red-400 to-red-600' },
}

const eventTypeLabels: Record<string, string> = {
  onBeforeStore: 'Before Store',
  onFileStored: 'File Stored',
  onStudyCompleted: 'Study Completed',
  onServerStarted: 'Server Started',
  onError: 'Error',
}

// Enhance handlers with usage information
const enhancedHandlers = computed((): EnhancedHandler[] => {
  if (!props.handlers) return []

  return props.handlers.map((handler) => {
    // Find which services use this handler
    const servicesUsing = (props.services || []).filter((service) => {
      const handlerNames = Object.values(service.eventHandlers || {}).flat()
      return handlerNames.includes(handler.name)
    })

    return {
      ...handler,
      isUsed: servicesUsing.length > 0,
      servicesUsing,
    }
  })
})
</script>
