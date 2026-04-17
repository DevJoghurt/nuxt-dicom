<template>
  <div>
    <!-- Row -->
    <div
      class="flex items-center gap-1.5 py-1 px-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/60 cursor-pointer group select-none"
      :style="{ paddingLeft: `${8 + depth * 16}px` }"
      @click="toggle"
    >
      <!-- Chevron / spacer -->
      <div class="w-4 h-4 shrink-0 flex items-center justify-center">
        <UIcon
          v-if="node.isDirectory"
          :name="node.isLoading ? 'i-lucide-loader-2' : (isExpanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right')"
          :class="['w-3.5 h-3.5 text-gray-400', node.isLoading && 'animate-spin']"
        />
      </div>

      <!-- File / folder icon -->
      <UIcon
        :name="node.isDirectory
          ? (isExpanded ? 'i-lucide-folder-open' : 'i-lucide-folder')
          : (isDcm ? 'i-lucide-file-image' : 'i-lucide-file')"
        class="w-4 h-4 shrink-0"
        :class="node.isDirectory ? 'text-primary-400 dark:text-primary-500' : 'text-gray-400 dark:text-gray-500'"
      />

      <!-- Name -->
      <span class="text-sm text-gray-700 dark:text-gray-300 truncate flex-1 font-mono text-xs leading-5">
        {{ node.name }}
      </span>

      <!-- Directory actions (hover) -->
      <template v-if="node.isDirectory && sourceName">
        <DicomSendButton
          :source-name="sourceName"
          :study-uid="node.key.split(':')[0]"
          :display-name="node.name"
          button-class="opacity-0 group-hover:opacity-100 shrink-0"
        />
      </template>

      <!-- File meta + actions (hover) -->
      <template v-if="!node.isDirectory">
        <span
          v-if="node.size"
          class="text-[11px] text-gray-400 shrink-0 hidden group-hover:inline"
        >
          {{ browser.formatFileSize(node.size) }}
        </span>
        <!-- View button (only when viewer is available) -->
        <UButton
          v-if="onViewFile"
          icon="i-lucide-eye"
          color="primary"
          variant="ghost"
          size="xs"
          square
          class="opacity-0 group-hover:opacity-100 shrink-0"
          title="View file"
          @click.stop="onViewFile(node.key, node.name)"
        />
        <!-- Send button -->
        <DicomSendButton
          v-if="sourceName"
          :source-name="sourceName"
          :paths="[node.key]"
          :display-name="node.name"
          button-class="opacity-0 group-hover:opacity-100 shrink-0"
        />
        <!-- Download button -->
        <UButton
          icon="i-lucide-download"
          color="neutral"
          variant="ghost"
          size="xs"
          square
          class="opacity-0 group-hover:opacity-100 shrink-0"
          title="Download file"
          @click.stop="browser.downloadFile(node.key)"
        />
      </template>
    </div>

    <!-- Children -->
    <div v-if="isExpanded && node.children">
      <BrowserNode
        v-for="child in node.children"
        :key="child.key"
        :node="child"
        :depth="depth + 1"
        :browser="browser"
        :on-view-file="onViewFile"
        :source-name="sourceName"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from '#imports'
import BrowserNode from './BrowserNode.vue'
import DicomSendButton from '../dicom/SendButton.vue'
import type { TreeNode } from '../../composables/useStorageFiles'
import type { useStorageFiles } from '../../composables/useStorageFiles'

const props = defineProps<{
  node: TreeNode
  depth: number
  browser: ReturnType<typeof useStorageFiles>
  onViewFile?: (key: string, name: string) => void
  sourceName?: string
}>()

const isExpanded = ref(false)

const isDcm = computed(() => props.node.name.toLowerCase().endsWith('.dcm'))

async function toggle() {
  if (!props.node.isDirectory) {
    // File click: open in viewer if available, otherwise download
    if (props.onViewFile) {
      props.onViewFile(props.node.key, props.node.name)
    }
    else {
      await props.browser.downloadFile(props.node.key)
    }
    return
  }
  isExpanded.value = !isExpanded.value
  if (isExpanded.value && !props.node.isLoaded) {
    await props.browser.expandNode(props.node)
  }
}
</script>
