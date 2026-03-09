<template>
  <div class="h-full flex flex-col overflow-hidden">
    <!-- Header -->
    <div class="border-b border-gray-200 dark:border-gray-800 px-6 py-3 shrink-0">
      <div class="flex items-center justify-between">
        <h1 class="text-lg font-semibold">
          Event Handlers
        </h1>
        <UButton
          icon="i-lucide-plus"
          label="Add Handler"
          color="primary"
          size="sm"
          @click="handleAddHandler"
        />
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 min-h-0 overflow-y-auto">
      <div class="px-4 py-6">
        <!-- Filter toolbar -->
        <div class="mb-5">
          <UInput
            v-model="filter"
            icon="i-lucide-search"
            placeholder="Filter handlers…"
            size="sm"
            class="w-64"
          />
        </div>

        <EventHandlerItem
          :handlers="filteredHandlers"
          :services="services"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, useFetch } from '#imports'
import EventHandlerItem from '../../components/EventHandlerItem.vue'

const filter = ref('')

const { data: handlers } = await useFetch('/api/dicom/handlers', {
  transform: (data: unknown) => {
    const response = (typeof data === 'object' && data !== null) ? (data as Record<string, unknown>) : {}
    const list = Array.isArray(response.handlers) ? response.handlers : []
    return list.map(h => ({
      serviceName: String((h as Record<string, unknown>).serviceName || ''),
      eventType: String((h as Record<string, unknown>).eventType || ''),
      eventId: String((h as Record<string, unknown>).eventId || ''),
      name: String((h as Record<string, unknown>).name || ''),
      description: String((h as Record<string, unknown>).description || ''),
    }))
  },
  default: () => [],
})

const { data: services } = await useFetch('/api/dicom/services', {
  transform: (data: unknown) => {
    const arr = Array.isArray(data) ? data : []
    return arr.map(s => ({
      name: String((s as Record<string, unknown>).name || ''),
      eventHandlers: ((s as Record<string, unknown>).eventHandlers as Record<string, string[]>) || {},
    }))
  },
  default: () => [],
})

const filteredHandlers = computed(() => {
  const q = filter.value.toLowerCase()
  return (handlers.value || []).filter(h =>
    !q || h.name.toLowerCase().includes(q) || h.serviceName.toLowerCase().includes(q),
  )
})

function handleAddHandler() {
  // TODO: open handler creation form
}
</script>
