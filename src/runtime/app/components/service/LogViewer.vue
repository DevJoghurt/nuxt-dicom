<template>
  <div class="h-full flex flex-col overflow-hidden">
    <!-- Header bar -->
    <div class="shrink-0 flex items-center justify-between gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-terminal" class="w-3.5 h-3.5 text-gray-400" />
        <span class="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-widest">Logs</span>
        <UBadge
          :color="liveLogs.isConnected.value ? 'success' : 'neutral'"
          variant="subtle"
          size="xs"
        >
          {{ liveLogs.isConnected.value ? 'Live' : 'Offline' }}
        </UBadge>
      </div>
      <div class="flex items-center gap-1">
        <USelectMenu
          v-model="selectedLogLevel"
          :items="logLevelOptions"
          size="xs"
          color="neutral"
          variant="ghost"
          icon="i-lucide-filter"
          class="w-28"
          @update:model-value="updateLogLevel"
        >
          <template #item-leading="{ item }">
            <UIcon :name="item.icon" class="w-3.5 h-3.5" />
          </template>
        </USelectMenu>
        <UButton
          icon="i-lucide-trash-2"
          color="neutral"
          variant="ghost"
          size="xs"
          @click="liveLogs.clearLogs()"
        />
        <UButton
          icon="i-lucide-download"
          color="neutral"
          variant="ghost"
          size="xs"
          @click="downloadLogs"
        />
      </div>
    </div>

    <!-- Connection error -->
    <div
      v-if="liveLogs.error.value"
      class="shrink-0 px-4 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-400"
    >
      {{ liveLogs.error.value }}
    </div>

    <!-- Log output -->
    <div class="flex-1 min-h-0 overflow-y-auto bg-gray-950 px-4 py-3 font-mono text-xs text-gray-300 space-y-0.5">
      <div
        v-if="liveLogs.logs.value.length === 0"
        class="text-gray-600 pt-1"
      >
        Waiting for logs…
      </div>
      <div
        v-for="(entry, index) in liveLogs.logs.value"
        :key="index"
      >
        <div :class="['whitespace-pre-wrap break-words leading-relaxed', liveLogs.getLevelClass(entry.level)]">
          {{ liveLogs.formatLogEntry(entry) }}
        </div>
        <details
          v-if="liveLogs.hasMetadata(entry)"
          class="ml-4 mt-0.5"
        >
          <summary class="cursor-pointer text-gray-600 hover:text-gray-400 select-none">
            <span class="inline-block w-3 text-center">▸</span> metadata
          </summary>
          <pre class="mt-1 p-2 bg-gray-900 rounded text-gray-400 overflow-x-auto text-[11px]">{{ JSON.stringify(entry.metadata, null, 2) }}</pre>
        </details>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, useLiveServiceLogs, useLogLevel } from '#imports'

const props = defineProps<{
  serviceName: string
}>()

const liveLogs = useLiveServiceLogs(props.serviceName)
const logLevelManager = useLogLevel()

const logLevelOptions = [
  { label: 'Debug', value: 'debug', icon: 'i-lucide-bug' },
  { label: 'Info', value: 'info', icon: 'i-lucide-info' },
  { label: 'Warning', value: 'warn', icon: 'i-lucide-triangle-alert' },
  { label: 'Error', value: 'error', icon: 'i-lucide-circle-x' },
]

const selectedLogLevel = ref(logLevelOptions[1])

onMounted(async () => {
  await logLevelManager.fetchLogLevels()
  const effectiveLevel = logLevelManager.getEffectiveLevel(props.serviceName)
  selectedLogLevel.value = logLevelOptions.find(opt => opt.value === effectiveLevel) || logLevelOptions[1]
})

async function updateLogLevel(option: typeof logLevelOptions[0]) {
  try {
    await logLevelManager.setServiceLevel(props.serviceName, option.value as 'debug' | 'info' | 'warn' | 'error')
  }
  catch {
    // Error is handled by the composable
  }
}

function downloadLogs() {
  const content = liveLogs.exportLogs()
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `${props.serviceName}-logs-${timestamp}.txt`

  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
</script>
