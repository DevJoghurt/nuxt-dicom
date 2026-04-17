<template>
  <div class="h-full flex flex-col overflow-hidden">
    <!-- Header bar -->
    <div class="shrink-0 h-9 flex items-center justify-between gap-2 px-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-folder-tree" class="w-3.5 h-3.5 text-gray-400" />
        <span class="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-widest">Files</span>
      </div>
      <UButton
        icon="i-lucide-refresh-cw"
        color="neutral"
        variant="ghost"
        size="xs"
        square
        :loading="browser.isLoading.value"
        @click="browser.fetchRoot()"
      />
    </div>

    <!-- Error -->
    <div
      v-if="browser.error.value"
      class="shrink-0 px-4 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-400"
    >
      {{ browser.error.value }}
    </div>

    <!-- Loading -->
    <div
      v-if="browser.isLoading.value && browser.rootNodes.value.length === 0"
      class="flex-1 flex items-center justify-center"
    >
      <div class="text-center">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto mb-2 opacity-40" />
        <p class="text-xs text-gray-400">
          Loading…
        </p>
      </div>
    </div>

    <!-- Empty -->
    <div
      v-else-if="!browser.isLoading.value && browser.rootNodes.value.length === 0 && !browser.error.value"
      class="flex-1 flex items-center justify-center"
    >
      <div class="text-center py-12">
        <UIcon name="i-lucide-folder-open" class="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p class="text-sm text-gray-400 dark:text-gray-500">
          No files yet
        </p>
      </div>
    </div>

    <!-- Tree -->
    <div
      v-else
      class="flex-1 min-h-0 overflow-y-auto p-2"
    >
      <BrowserNode
        v-for="node in browser.rootNodes.value"
        :key="node.key"
        :node="node"
        :depth="0"
        :browser="browser"
        :on-view-file="onViewFile"
        :source-name="sourceName"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from '#imports'
import { useStorageFiles } from '../../composables/useStorageFiles'
import BrowserNode from './BrowserNode.vue'

const props = defineProps<{
  storageName: string
  sourceName?: string
  onViewFile?: (key: string, name: string) => void
}>()

const browser = useStorageFiles(props.storageName)

onMounted(() => browser.fetchRoot())
</script>
