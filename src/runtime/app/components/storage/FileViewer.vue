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
        class="flex-1 min-h-0 overflow-hidden flex flex-col"
      >
        <!-- Tag viewer (button injected into the sticky header via slot) -->
        <div
          v-if="!showPixelViewer"
          class="flex-1 min-h-0 overflow-hidden"
        >
          <!-- Parse error banner -->
          <div
            v-if="data.parseError"
            class="flex items-start gap-2.5 px-4 py-3 border-b border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/20"
          >
            <UIcon name="i-lucide-triangle-alert" class="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div>
              <p class="text-xs font-semibold text-amber-700 dark:text-amber-400">
                DICOM tags unavailable
              </p>
              <p class="text-xs text-amber-600 dark:text-amber-500 mt-0.5 font-mono break-all">
                {{ data.parseError }}
              </p>
              <p class="text-xs text-amber-600/80 dark:text-amber-500/80 mt-1">
                This file was likely stored without a DICOM Part&#8209;10 preamble.
              </p>
            </div>
          </div>

          <DicomJsonViewer
            :tags="(data.tags as Record<string, string>)"
            :file-name="data.fileName"
            :size="data.size ?? 0"
          >
            <template v-if="hasPixelData" #actions>
              <UButton
                size="xs"
                icon="i-lucide-image"
                variant="soft"
                class="mt-2"
                @click="togglePixelViewer"
              >
                View pixel data
              </UButton>
            </template>
          </DicomJsonViewer>
        </div>

        <!-- Pixel data viewer -->
        <div
          v-else
          class="flex-1 min-h-0 overflow-hidden flex flex-col items-center justify-center bg-black dark:bg-gray-950 relative"
        >
          <!-- Loading spinner -->
          <div
            v-if="imgLoading"
            class="absolute inset-0 flex items-center justify-center"
          >
            <div class="text-center">
              <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto mb-2 text-white/40" />
              <p class="text-xs text-white/30">
                Rendering image…
              </p>
            </div>
          </div>

          <!-- Text content (non-imaging pixel data returned as text/plain) -->
          <div
            v-if="pixelText"
            class="flex-1 w-full overflow-auto p-4"
          >
            <pre class="text-xs font-mono text-gray-200 whitespace-pre-wrap break-words leading-relaxed">{{ pixelText }}</pre>
          </div>

          <!-- PDF content (encapsulated document returned as application/pdf) -->
          <iframe
            v-else-if="pixelPdfUrl"
            :src="pixelPdfUrl"
            class="flex-1 w-full h-full border-0"
            title="Encapsulated PDF document"
          />

          <!-- Error state (not text, not image, not PDF) -->
          <div
            v-else-if="imgError"
            class="text-center px-6"
          >
            <UIcon name="i-lucide-image-off" class="w-10 h-10 mx-auto mb-3 text-white/30" />
            <p class="text-sm text-white/50">
              {{ imgError }}
            </p>
          </div>

          <!-- The image -->
          <img
            v-show="!imgLoading && !imgError && !pixelText && !pixelPdfUrl"
            :key="pixelDataUrl"
            :src="pixelDataUrl"
            class="max-w-full max-h-full object-contain"
            :alt="`Frame ${currentFrame + 1}`"
            @load="imgLoading = false"
            @error="handleImgError"
          >

          <!-- Top overlay: back button + frame count -->
          <div class="absolute top-3 left-0 right-0 flex items-center justify-between px-3 pointer-events-none">
            <UButton
              size="xs"
              icon="i-lucide-tag"
              variant="soft"
              class="pointer-events-auto"
              @click="togglePixelViewer"
            >
              Show tags
            </UButton>
            <span
              v-if="totalFrames > 1 && !pixelText && !pixelPdfUrl"
              class="text-xs text-white/60 bg-black/40 rounded-full px-2 py-0.5"
            >
              {{ totalFrames }} frames
            </span>
          </div>

          <!-- Bottom frame navigation -->
          <div
            v-if="totalFrames > 1 && !imgLoading && !imgError"
            class="absolute bottom-4 flex items-center gap-3 bg-black/60 backdrop-blur-sm rounded-full px-4 py-1.5"
          >
            <UButton
              size="xs"
              icon="i-lucide-chevron-left"
              variant="ghost"
              :disabled="currentFrame === 0"
              @click="stepFrame(-1)"
            />
            <span class="text-white/80 text-xs tabular-nums min-w-16 text-center">
              {{ currentFrame + 1 }} / {{ totalFrames }}
            </span>
            <UButton
              size="xs"
              icon="i-lucide-chevron-right"
              variant="ghost"
              :disabled="currentFrame >= totalFrames - 1"
              @click="stepFrame(1)"
            />
          </div>
        </div>
      </div>

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
import { computed, ref, watch, useFetch } from '#imports'
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
  hasRenderable?: boolean
  /** Set when DICOM parsing failed (e.g. file stored without Part-10 preamble) */
  parseError?: string
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

// ── Pixel data viewer ─────────────────────────────────────────────────────────

const showPixelViewer = ref(false)
const currentFrame = ref(0)
const imgLoading = ref(false)
const imgError = ref<string | null>(null)
/** Non-null when the pixel data response was text/plain instead of an image. */
const pixelText = ref<string | null>(null)
/** Non-null when the pixel data response was application/pdf (encapsulated document). */
const pixelPdfUrl = ref<string | null>(null)

/**
 * True when the DICOM tags indicate the file contains pixel data.
 * We show the button for any file that has Rows+Columns (imaging) OR
 * a PhotometricInterpretation (potentially non-imaging pixel data).
 */
const hasPixelData = computed(() => data.value?.hasRenderable ?? false)

/** Total number of frames — falls back to 1 for single-frame images. */
const totalFrames = computed(() => {
  const n = Number.parseInt(data.value?.tags?.NumberOfFrames ?? '1', 10)
  return Number.isFinite(n) && n > 0 ? n : 1
})

const pixelDataUrl = computed(
  () =>
    `/api/dicom/storages/${props.storageName}/files/pixeldata`
    + `?key=${encodeURIComponent(props.fileKey)}&frame=${currentFrame.value}`,
)

// Reset viewer state when the displayed file changes
watch(url, () => {
  showPixelViewer.value = false
  currentFrame.value = 0
  imgLoading.value = false
  imgError.value = null
  pixelText.value = null
  pixelPdfUrl.value = null
})

// Show spinner whenever the frame URL changes (image path only)
watch(pixelDataUrl, () => {
  if (showPixelViewer.value && !pixelText.value && !pixelPdfUrl.value) {
    imgLoading.value = true
    imgError.value = null
  }
})

function togglePixelViewer() {
  if (!showPixelViewer.value) {
    imgLoading.value = true
    imgError.value = null
    pixelText.value = null
    pixelPdfUrl.value = null
  }
  showPixelViewer.value = !showPixelViewer.value
}

function stepFrame(delta: number) {
  const next = currentFrame.value + delta
  if (next >= 0 && next < totalFrames.value) {
    currentFrame.value = next
  }
}

/**
 * Called when the <img> element fails to load the pixel data URL.
 * The response may be text/plain (e.g. encapsulated document) rather than
 * an image — try fetching it as text first before showing an error.
 */
async function handleImgError() {
  imgLoading.value = false
  try {
    const res = await fetch(pixelDataUrl.value)
    const ct = res.headers.get('content-type') ?? ''
    if (res.ok && ct.startsWith('text/')) {
      pixelText.value = await res.text()
      imgLoading.value = false
      return
    }
    if (res.ok && ct.startsWith('application/pdf')) {
      pixelPdfUrl.value = pixelDataUrl.value
      imgLoading.value = false
      return
    }
  }
  catch { /* ignore — fall through to error state */ }
  imgError.value = 'Could not render pixel data — the transfer syntax may not be supported.'
}
</script>
