<template>
  <!-- Trigger button -->
  <UButton
    icon="i-lucide-send"
    :color="color ?? 'neutral'"
    :variant="variant ?? 'ghost'"
    :size="size ?? 'xs'"
    :square="!label"
    :label="label"
    :title="title ?? 'Send to destination'"
    :class="buttonClass"
    @click.stop="openModal"
  />

  <!-- Send destination modal -->
  <UModal
    v-model:open="isOpen"
    :ui="{ footer: 'justify-end', body: 'p-0' }"
    :title="undefined"
  >
    <template #body>
      <!-- ── Source → Destination header ─────────────────────────────── -->
      <div class="flex items-stretch gap-3 px-5 pt-5 pb-4 border-b border-gray-200 dark:border-gray-800">
        <!-- Source card -->
        <div class="flex-1 min-w-0 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 px-3 py-2.5">
          <p class="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
            From
          </p>
          <div class="flex items-center gap-2 min-w-0">
            <UIcon
              :name="isStudy ? 'i-lucide-folder-open' : 'i-lucide-file-image'"
              class="w-4 h-4 shrink-0 text-primary-500"
            />
            <span class="text-sm font-mono font-medium text-gray-800 dark:text-gray-200 truncate">{{ displayLabel }}</span>
          </div>
          <div class="flex items-center gap-1.5 mt-1.5">
            <UIcon name="i-lucide-server" class="w-3 h-3 shrink-0 text-gray-400" />
            <span class="text-xs text-gray-500 dark:text-gray-400 truncate">{{ sourceName }}</span>
            <UBadge
              size="xs"
              color="neutral"
              variant="subtle"
              class="ml-auto shrink-0"
            >
              {{ isStudy ? 'study' : paths && paths.length > 1 ? `${paths.length} files` : 'file' }}
            </UBadge>
          </div>
        </div>

        <!-- Arrow -->
        <div class="flex items-center shrink-0 text-gray-400 dark:text-gray-500">
          <UIcon name="i-lucide-arrow-right" class="w-5 h-5" />
        </div>

        <!-- Destination card (dynamic — shows selected or placeholder) -->
        <div
          class="flex-1 min-w-0 rounded-lg border px-3 py-2.5 transition-colors"
          :class="selectedDest
            ? 'border-primary-400 dark:border-primary-600 bg-primary-50 dark:bg-primary-900/20'
            : 'border-dashed border-gray-300 dark:border-gray-600 bg-transparent'"
        >
          <p class="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
            To
          </p>
          <template v-if="selectedDest">
            <div class="flex items-center gap-2 min-w-0">
              <UIcon
                :name="selectedDest.kind === 'storeScp' ? 'i-lucide-server' : 'i-lucide-globe'"
                class="w-4 h-4 shrink-0"
                :class="selectedDest.kind === 'storeScp' ? 'text-primary-500' : 'text-sky-500'"
              />
              <span class="text-sm font-mono font-medium text-gray-800 dark:text-gray-200 truncate">{{ selectedDest.name }}</span>
            </div>
            <div class="flex items-center gap-1.5 mt-1.5">
              <UBadge
                v-if="selectedDest.kind === 'storeScp'"
                size="xs"
                :color="selectedDest.isRunning ? 'success' : 'neutral'"
                variant="subtle"
              >
                {{ selectedDest.isRunning ? 'running' : 'stopped' }}
              </UBadge>
              <UBadge
                v-else
                size="xs"
                color="info"
                variant="subtle"
              >
                {{ selectedDest.protocol }}
              </UBadge>
            </div>
          </template>
          <template v-else>
            <p class="text-sm text-gray-400 dark:text-gray-500 italic">
              Select destination…
            </p>
          </template>
        </div>
      </div>

      <!-- ── Destination picker ───────────────────────────────────────── -->
      <div class="px-5 pt-4 pb-2">
        <p class="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
          Send to
        </p>

        <!-- Loading -->
        <div v-if="isLoadingServices" class="flex items-center justify-center py-6">
          <UIcon name="i-lucide-loader-2" class="w-5 h-5 animate-spin text-gray-400" />
        </div>

        <!-- No destinations -->
        <div
          v-else-if="destinations.length === 0"
          class="text-center py-6"
        >
          <UIcon name="i-lucide-server-off" class="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p class="text-sm text-gray-400">
            No destinations available
          </p>
          <p class="text-xs text-gray-400 mt-1">
            Start a StoreSCP service or configure an external destination.
          </p>
        </div>

        <!-- List -->
        <div v-else class="space-y-1">
          <button
            v-for="dest in destinations"
            :key="dest.name"
            type="button"
            class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors text-left"
            :class="selectedName === dest.name
              ? 'border-primary-400 dark:border-primary-600 bg-primary-50 dark:bg-primary-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/40'"
            @click="selectedName = dest.name"
          >
            <UIcon
              :name="dest.kind === 'storeScp' ? 'i-lucide-server' : 'i-lucide-globe'"
              class="w-4 h-4 shrink-0"
              :class="dest.kind === 'storeScp' ? 'text-primary-500' : 'text-sky-500'"
            />
            <span class="flex-1 text-sm font-mono font-medium text-gray-800 dark:text-gray-200 truncate">{{ dest.name }}</span>
            <UBadge
              v-if="dest.kind === 'storeScp'"
              size="xs"
              :color="dest.isRunning ? 'success' : 'neutral'"
              variant="subtle"
            >
              {{ dest.isRunning ? 'running' : 'stopped' }}
            </UBadge>
            <UBadge
              v-else
              size="xs"
              color="info"
              variant="subtle"
            >
              {{ dest.protocol }}
            </UBadge>
            <UIcon
              v-if="selectedName === dest.name"
              name="i-lucide-check"
              class="w-4 h-4 shrink-0 text-primary-500"
            />
          </button>
        </div>
      </div>

      <!-- ── Advanced options ────────────────────────────────────────── -->
      <div class="border-t border-gray-200 dark:border-gray-800 mt-2">
        <button
          type="button"
          class="w-full flex items-center gap-2 px-5 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
          @click="showAdvanced = !showAdvanced"
        >
          <UIcon
            :name="showAdvanced ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
            class="w-4 h-4 shrink-0 text-gray-400"
          />
          <span class="text-xs font-medium text-gray-500 dark:text-gray-400">Advanced options</span>
        </button>

        <div v-if="showAdvanced" class="px-5 pb-5 space-y-4">
          <!-- File send delay -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="text-xs font-medium text-gray-700 dark:text-gray-300">File send delay</label>
              <span class="text-xs font-mono text-gray-500 dark:text-gray-400">{{ delayLabel }}</span>
            </div>
            <input
              v-model.number="delayBetweenFiles"
              type="range"
              min="0"
              max="5000"
              step="50"
              class="w-full h-1.5 rounded-full accent-primary-500 cursor-pointer"
            >
            <p class="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
              Pause between each file. Useful when the target StoreSCP is overwhelmed by fast transfers.
            </p>
          </div>

          <!-- Calling AE title -->
          <div>
            <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Calling AE title
            </label>
            <UInput
              v-model="callingAeTitle"
              placeholder="STORE-SCU (default)"
              size="sm"
              :ui="{ base: 'font-mono' }"
            />
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <UButton color="neutral" variant="ghost" label="Cancel" @click="isOpen = false" />
      <UButton
        label="Send"
        :disabled="!selectedName || isPending"
        :loading="isPending"
        icon="i-lucide-send"
        @click="confirmSend"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, computed, useToast } from '#imports'
import { useDicomSend } from '../../composables/useDicomSend'

const props = defineProps<{
  /** Name of the source StoreSCP service that owns the files */
  sourceName: string
  /** Send entire study by UID */
  studyUid?: string
  /** Send specific files by their storage key paths */
  paths?: string[]
  /** Human-readable label shown inside the modal (auto-derived if omitted) */
  displayName?: string
  /** Button appearance */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'ghost' | 'soft' | 'outline' | 'solid' | 'link'
  color?: 'info' | 'error' | 'success' | 'primary' | 'secondary' | 'warning' | 'neutral'
  /** Text label on the button (when omitted the button is icon-only / square) */
  label?: string
  title?: string
  /** Extra CSS classes forwarded to the trigger button */
  buttonClass?: string
}>()

const emit = defineEmits<{
  sent: [jobId: string]
}>()

interface ServiceDest {
  name: string
  kind: 'storeScp' | 'external'
  isRunning?: boolean
  protocol?: string
}

const toast = useToast()
const { send, reset } = useDicomSend()

const isOpen = ref(false)
const isPending = ref(false)
const destinations = ref<ServiceDest[]>([])
const selectedName = ref('')
const isLoadingServices = ref(false)

// Advanced options state
const showAdvanced = ref(false)
const delayBetweenFiles = ref(0)
const callingAeTitle = ref('')

const isStudy = computed(() => !!props.studyUid)

const displayLabel = computed(() => {
  if (props.displayName) return props.displayName
  if (props.studyUid) return props.studyUid
  if (props.paths && props.paths.length === 1) {
    const first = props.paths[0] ?? ''
    return first.split(':').pop() ?? first
  }
  if (props.paths && props.paths.length > 1) return `${props.paths.length} files`
  return '—'
})

const selectedDest = computed<ServiceDest | null>(() =>
  destinations.value.find(d => d.name === selectedName.value) ?? null,
)

const delayLabel = computed(() => {
  if (delayBetweenFiles.value === 0) return 'Off'
  if (delayBetweenFiles.value < 1000) return `${delayBetweenFiles.value} ms`
  return `${(delayBetweenFiles.value / 1000).toFixed(1)} s`
})

function openModal() {
  selectedName.value = ''
  showAdvanced.value = false
  delayBetweenFiles.value = 0
  callingAeTitle.value = ''
  reset()
  isOpen.value = true
  loadDestinations()
}

async function loadDestinations() {
  isLoadingServices.value = true
  try {
    const all = await $fetch<Array<Record<string, unknown>>>('/api/dicom/services')
    destinations.value = all
      .filter(s => s.kind === 'storeScp' ? s.isRunning === true : true)
      .map(s => ({
        name: s.name as string,
        kind: s.kind as 'storeScp' | 'external',
        isRunning: s.isRunning as boolean | undefined,
        protocol: s.protocol as string | undefined,
      }))
  }
  catch {
    destinations.value = []
  }
  finally {
    isLoadingServices.value = false
  }
}

async function confirmSend() {
  if (!selectedName.value) return
  isPending.value = true
  try {
    const options = {
      ...(props.studyUid ? { studyUid: props.studyUid } : { paths: props.paths ?? [] }),
      ...(callingAeTitle.value ? { callingAeTitle: callingAeTitle.value } : {}),
      ...(delayBetweenFiles.value > 0 ? { delayBetweenFiles: delayBetweenFiles.value } : {}),
    }

    const jobId = await send(props.sourceName, selectedName.value, options)
    isOpen.value = false
    emit('sent', jobId)
    toast.add({
      title: 'Send job queued',
      description: `Job ${jobId} — sending to ${selectedName.value}`,
      icon: 'i-lucide-send',
      color: 'success',
    })
  }
  catch (err) {
    toast.add({
      title: 'Send failed',
      description: err instanceof Error ? err.message : String(err),
      icon: 'i-lucide-alert-circle',
      color: 'error',
    })
  }
  finally {
    isPending.value = false
  }
}
</script>
