<template>
  <div class="h-full flex flex-col overflow-hidden">
    <!-- Loading -->
    <div
      v-if="pending"
      class="flex-1 flex items-center justify-center"
    >
      <div class="text-center">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto mb-2 opacity-40" />
        <p class="text-xs text-gray-400">
          Loading…
        </p>
      </div>
    </div>

    <!-- Error -->
    <div
      v-else-if="error"
      class="flex-1 flex items-center justify-center px-6"
    >
      <div class="w-full max-w-sm">
        <div class="rounded-xl border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-900/20 overflow-hidden">
          <!-- Header -->
          <div class="flex items-center gap-2.5 px-4 py-3 border-b border-red-200 dark:border-red-800/60">
            <UIcon name="i-lucide-circle-x" class="w-4 h-4 text-red-500 shrink-0" />
            <span class="text-sm font-semibold text-red-700 dark:text-red-400">
              {{ errorTitle }}
            </span>
            <UBadge
              color="error"
              variant="subtle"
              size="xs"
              class="ml-auto shrink-0"
            >
              {{ errorStatusCode }}
            </UBadge>
          </div>
          <!-- Message -->
          <div class="px-4 py-3">
            <p class="text-xs text-red-700 dark:text-red-300 leading-relaxed">
              {{ errorDetails }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Content -->
    <template v-else-if="data">
      <!-- DICOM JSON viewer -->
      <div
        v-if="data.type === 'dicom'"
        class="flex-1 min-h-0 overflow-hidden"
      >
        <DicomJsonViewer
          :tags="(data.tags as Record<string, string>)"
          :file-name="data.fileName"
          :size="data.size ?? 0"
        />      </div>

      <!-- Text viewer -->
      <div
        v-else-if="data.type === 'text'"
        class="flex-1 min-h-0 overflow-auto p-4"
      >
        <pre class="text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words leading-relaxed">{{ data.content }}</pre>
      </div>

      <!-- Unsupported -->
      <div
        v-else
        class="flex-1 flex items-center justify-center px-6"
      >
        <div class="text-center">
          <UIcon name="i-lucide-file-question" class="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ data.message }}
          </p>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {{ formatFileSize(data.size) }}
          </p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, useFetch } from '#imports'
import DicomJsonViewer from '../DicomJsonViewer.vue'

const props = defineProps<{
  storageName: string
  fileKey: string
}>()

interface ViewResult {
  type: 'dicom' | 'text' | 'unsupported'
  fileName: string
  size?: number
  tags?: Record<string, string>
  content?: string
  message?: string
}

const url = computed(
  () => `/api/dicom/storages/${props.storageName}/files/view?key=${encodeURIComponent(props.fileKey)}`,
)

const { data, pending, error } = useFetch<ViewResult>(url, { watch: [url] })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const errorData = computed(() => (error.value as any)?.data ?? null)

const errorStatusCode = computed<string | number>(() =>
  errorData.value?.statusCode ?? (error.value as any)?.statusCode ?? 'Error',
)

const errorTitle = computed<string>(() => {
  const code = errorStatusCode.value
  if (code === 500) return 'Server Error'
  if (code === 404) return 'File Not Found'
  if (code === 501) return 'Not Implemented'
  return errorData.value?.statusMessage ?? 'Request Failed'
})

const errorDetails = computed<string>(() =>
  errorData.value?.message ?? error.value?.message ?? 'An unexpected error occurred.',
)

function formatFileSize(bytes?: number): string {
  if (!bytes) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unit = 0
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024
    unit++
  }
  return `${size.toFixed(unit > 0 ? 1 : 0)} ${units[unit]}`
}
</script>
