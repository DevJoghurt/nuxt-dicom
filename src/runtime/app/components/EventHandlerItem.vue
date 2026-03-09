<template>
  <div>
    <div
      v-if="!enhancedHandlers || enhancedHandlers.length === 0"
      class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-8 text-center text-gray-500"
    >
      <UIcon
        name="i-lucide-zap-off"
        class="w-12 h-12 mx-auto mb-3 opacity-40"
      />
      <p class="font-medium mb-1">
        No event handlers registered
      </p>
    </div>

    <div
      v-else
      class="grid gap-4"
    >
      <div
        v-for="handler in enhancedHandlers"
        :key="handler.eventId"
        class="group bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-primary-300 dark:hover:border-primary-700 transition-all duration-150"
      >
        <div class="p-4">
          <!-- Header row: icon + name + badges -->
          <div class="flex items-start justify-between gap-3 mb-3">
            <div class="flex items-center gap-3 min-w-0">
              <!-- Event type icon -->
              <div
                class="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
                :class="eventTypeStyle(handler.eventType).bg"
              >
                <UIcon
                  :name="eventTypeStyle(handler.eventType).icon"
                  class="w-4 h-4"
                  :class="eventTypeStyle(handler.eventType).iconColor"
                />
              </div>
              <!-- Name + event type label -->
              <div class="min-w-0">
                <h3 class="font-semibold text-sm truncate">
                  {{ handler.name || 'Unnamed Handler' }}
                </h3>
                <p class="text-xs text-gray-400 dark:text-gray-500">
                  {{ eventTypeLabels[handler.eventType] || handler.eventType }}
                </p>
              </div>
            </div>

            <!-- Right badges -->
            <div class="flex items-center gap-2 shrink-0">
              <UBadge
                :color="handler.isUsed ? 'success' : 'neutral'"
                variant="subtle"
                size="xs"
              >
                {{ handler.isUsed ? 'In Use' : 'Unused' }}
              </UBadge>
              <UBadge
                :color="eventTypeStyle(handler.eventType).badgeColor"
                variant="soft"
                size="xs"
              >
                {{ eventTypeLabels[handler.eventType] || handler.eventType }}
              </UBadge>
            </div>
          </div>

          <!-- Description -->
          <p
            v-if="handler.description"
            class="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3"
          >
            {{ handler.description }}
          </p>

          <!-- Services using this handler -->
          <div
            v-if="handler.isUsed && handler.servicesUsing.length > 0"
            class="flex items-center gap-2 flex-wrap"
          >
            <span class="text-xs text-gray-400 shrink-0">Used by:</span>
            <UBadge
              v-for="service in handler.servicesUsing"
              :key="service.name"
              color="info"
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

        <!-- Footer: event ID -->
        <div class="px-4 py-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50 rounded-b-lg">
          <span class="text-xs text-gray-400 font-mono select-all">{{ handler.eventId }}</span>
          <span class="text-xs text-gray-400">Event Handler</span>
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

type BadgeColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'

type EventTypeStyle = { bg: string; icon: string; iconColor: string; badgeColor: BadgeColor }

const eventTypeStyles: Record<string, EventTypeStyle> = {
  onBeforeStore: {
    bg: 'bg-primary-100 dark:bg-primary-900/40',
    icon: 'i-lucide-shield-check',
    iconColor: 'text-primary-600 dark:text-primary-400',
    badgeColor: 'warning',
  },
  onFileStored: {
    bg: 'bg-primary-100 dark:bg-primary-900/40',
    icon: 'i-lucide-check-circle-2',
    iconColor: 'text-primary-600 dark:text-primary-400',
    badgeColor: 'success',
  },
  onStudyCompleted: {
    bg: 'bg-primary-100 dark:bg-primary-900/40',
    icon: 'i-lucide-check-circle',
    iconColor: 'text-primary-600 dark:text-primary-400',
    badgeColor: 'info',
  },
  onServerStarted: {
    bg: 'bg-primary-100 dark:bg-primary-900/40',
    icon: 'i-lucide-play-circle',
    iconColor: 'text-primary-600 dark:text-primary-400',
    badgeColor: 'primary',
  },
  onError: {
    bg: 'bg-red-100 dark:bg-red-900/40',
    icon: 'i-lucide-alert-circle',
    iconColor: 'text-red-600 dark:text-red-400',
    badgeColor: 'error',
  },
}

const fallbackStyle: EventTypeStyle = {
  bg: 'bg-gray-100 dark:bg-gray-800',
  icon: 'i-lucide-zap',
  iconColor: 'text-gray-500',
  badgeColor: 'neutral',
}

function eventTypeStyle(eventType: string): EventTypeStyle {
  return eventTypeStyles[eventType] ?? fallbackStyle
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
