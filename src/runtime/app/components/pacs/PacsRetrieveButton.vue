<template>
  <!-- Trigger button -->
  <UButton
    icon="i-lucide-download"
    :color="color ?? 'neutral'"
    :variant="variant ?? 'ghost'"
    :size="size ?? 'xs'"
    :square="!label"
    :label="label"
    :title="title ?? 'Retrieve study from PACS'"
    :class="buttonClass"
    @click.stop="openModal"
  />

  <!-- Retrieve modal -->
  <UModal
    v-model:open="isOpen"
    :ui="{ footer: 'justify-end', body: 'p-0' }"
    :title="undefined"
  >
    <template #body>
      <!-- ── Source → Destination header ─────────────────────────────── -->
      <div class="flex items-stretch gap-3 px-5 pt-5 pb-4 border-b border-gray-200 dark:border-gray-800">
        <!-- Source card (PACS) -->
        <div class="flex-1 min-w-0 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 px-3 py-2.5">
          <p class="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
            From (PACS)
          </p>
          <div class="flex items-center gap-2 min-w-0">
            <UIcon name="i-lucide-database" class="w-4 h-4 shrink-0 text-violet-500" />
            <span class="text-sm font-mono font-medium text-gray-800 dark:text-gray-200 truncate">{{ pacsName }}</span>
          </div>
          <div class="flex items-center gap-1.5 mt-1.5">
            <UIcon name="i-lucide-folder-open" class="w-3 h-3 shrink-0 text-gray-400" />
            <span class="text-xs text-gray-500 dark:text-gray-400 font-mono truncate" :title="studyUid">{{ truncateUid(studyUid) }}</span>
          </div>
        </div>

        <!-- Arrow -->
        <div class="flex items-center shrink-0 text-gray-400 dark:text-gray-500">
          <UIcon name="i-lucide-arrow-right" class="w-5 h-5" />
        </div>

        <!-- Destination card (dynamic) -->
        <div
          class="flex-1 min-w-0 rounded-lg border px-3 py-2.5 transition-colors"
          :class="selectedName
            ? 'border-primary-400 dark:border-primary-600 bg-primary-50 dark:bg-primary-900/20'
            : 'border-dashed border-gray-300 dark:border-gray-600 bg-transparent'"
        >
          <p class="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
            To
          </p>
          <template v-if="selectedDest">
            <div class="flex items-center gap-2 min-w-0">
              <UIcon
                :name="selectedDest.kind === 'storage' ? 'i-lucide-hard-drive' : 'i-lucide-server'"
                class="w-4 h-4 shrink-0 text-primary-500"
              />
              <span class="text-sm font-mono font-medium text-gray-800 dark:text-gray-200 truncate">{{ selectedDest.name }}</span>
            </div>
            <div class="mt-1.5">
              <UBadge size="xs" color="neutral" variant="subtle">
                {{ selectedDest.kind === 'storage' ? 'storage' : 'StoreSCP' }}
              </UBadge>
            </div>
          </template>
          <template v-else>
            <p class="text-sm text-gray-400 dark:text-gray-500 italic">Select destination…</p>
          </template>
        </div>
      </div>

      <!-- ── Method selector ──────────────────────────────────────────── -->
      <div class="px-5 pt-4">
        <p class="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
          Method
        </p>
        <div class="flex gap-2">
          <button
            v-for="m in methods"
            :key="m.value"
            type="button"
            class="flex-1 flex flex-col gap-1 rounded-lg border px-3 py-2.5 text-left transition-colors"
            :class="method === m.value
              ? 'border-primary-400 dark:border-primary-600 bg-primary-50 dark:bg-primary-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/40'"
            @click="onMethodChange(m.value)"
          >
            <div class="flex items-center gap-2">
              <UIcon :name="m.icon" class="w-4 h-4 shrink-0" :class="method === m.value ? 'text-primary-500' : 'text-gray-400'" />
              <span class="text-xs font-semibold" :class="method === m.value ? 'text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'">{{ m.label }}</span>
              <UIcon v-if="method === m.value" name="i-lucide-check" class="w-3 h-3 ml-auto shrink-0 text-primary-500" />
            </div>
            <p class="text-[11px] text-gray-400 dark:text-gray-500 leading-snug">{{ m.description }}</p>
          </button>
        </div>

        <!-- C-MOVE warning -->
        <div
          v-if="method === 'c-move'"
          class="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/20 px-3 py-2"
        >
          <UIcon name="i-lucide-triangle-alert" class="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <p class="text-[11px] text-amber-700 dark:text-amber-400 leading-snug">
            The destination AE title must be pre-configured in the source PACS.
          </p>
        </div>
      </div>

      <!-- ── Destination picker ───────────────────────────────────────── -->
      <div class="px-5 pt-4 pb-2">
        <p class="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
          {{ method === 'c-get' ? 'Retrieve to' : 'Forward to (StoreSCP)' }}
        </p>

        <!-- Loading -->
        <div v-if="isLoading" class="flex items-center justify-center py-6">
          <UIcon name="i-lucide-loader-2" class="w-5 h-5 animate-spin text-gray-400" />
        </div>

        <!-- No destinations -->
        <div v-else-if="destinations.length === 0" class="text-center py-6">
          <UIcon name="i-lucide-server-off" class="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p class="text-sm text-gray-400">No destinations available</p>
          <p class="text-xs text-gray-400 mt-1">
            {{ method === 'c-get'
              ? 'Configure a storage or start a StoreSCP service.'
              : 'Start a StoreSCP service to receive moved studies.' }}
          </p>
        </div>

        <!-- Destination list -->
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
              :name="dest.kind === 'storage' ? 'i-lucide-hard-drive' : 'i-lucide-server'"
              class="w-4 h-4 shrink-0"
              :class="dest.kind === 'storage' ? 'text-primary-500' : 'text-violet-500'"
            />
            <div class="flex-1 min-w-0">
              <span class="block text-sm font-mono font-medium text-gray-800 dark:text-gray-200 truncate">{{ dest.name }}</span>
              <span v-if="dest.aeTitle" class="block text-[11px] text-gray-400 font-mono">AE: {{ dest.aeTitle }}</span>
            </div>
            <UBadge size="xs" :color="dest.kind === 'storage' ? 'neutral' : 'success'" variant="subtle">
              {{ dest.kind === 'storage' ? 'storage' : 'running' }}
            </UBadge>
            <UIcon v-if="selectedName === dest.name" name="i-lucide-check" class="w-4 h-4 shrink-0 text-primary-500" />
          </button>
        </div>
      </div>
    </template>

    <template #footer>
      <UButton color="neutral" variant="ghost" label="Cancel" @click="isOpen = false" />
      <UButton
        label="Retrieve"
        icon="i-lucide-download"
        :disabled="!selectedName || isPending"
        :loading="isPending"
        @click="confirmRetrieve"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, computed, useToast } from '#imports'

const props = defineProps<{
  /** PACS server name */
  pacsName: string
  /** Study Instance UID to retrieve */
  studyUid: string
  /** Human-readable label (auto-derived if omitted) */
  displayName?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'ghost' | 'soft' | 'outline' | 'solid' | 'link'
  color?: 'info' | 'error' | 'success' | 'primary' | 'secondary' | 'warning' | 'neutral'
  label?: string
  title?: string
  buttonClass?: string
}>()

const emit = defineEmits<{
  retrieved: [jobId: string]
}>()

interface Destination {
  name: string
  kind: 'storage' | 'service'
  aeTitle?: string
}

const toast = useToast()
const isOpen = ref(false)
const isPending = ref(false)
const isLoading = ref(false)
const method = ref<'c-get' | 'c-move'>('c-get')
const selectedName = ref('')
const allStorages = ref<Destination[]>([])
const allServices = ref<Destination[]>([])

const methods = [
  {
    value: 'c-get' as const,
    label: 'C-GET',
    icon: 'i-lucide-download',
    description: 'This application fetches files directly from the PACS.',
  },
  {
    value: 'c-move' as const,
    label: 'C-MOVE',
    icon: 'i-lucide-arrow-right-left',
    description: 'PACS pushes files to a pre-configured destination AE.',
  },
]

/** Destinations shown depend on method:
 * - C-GET: storages (Filesystem) + running StoreSCP services (forward)
 * - C-MOVE: running StoreSCP services only (must be registered in PACS)
 */
const destinations = computed<Destination[]>(() => {
  if (method.value === 'c-move') return allServices.value
  return [...allStorages.value, ...allServices.value]
})

const selectedDest = computed<Destination | null>(() =>
  destinations.value.find(d => d.name === selectedName.value) ?? null,
)

function truncateUid(uid: string): string {
  if (uid.length <= 32) return uid
  return `…${uid.slice(-32)}`
}

function onMethodChange(m: 'c-get' | 'c-move') {
  method.value = m
  // Clear selection if the currently selected dest is no longer available
  if (selectedName.value && !destinations.value.find(d => d.name === selectedName.value)) {
    selectedName.value = ''
  }
}

function openModal() {
  method.value = 'c-get'
  selectedName.value = ''
  isPending.value = false
  isOpen.value = true
  loadDestinations()
}

async function loadDestinations() {
  isLoading.value = true
  try {
    const [storagesData, servicesData] = await Promise.all([
      $fetch<Array<Record<string, unknown>>>('/api/dicom/storages'),
      $fetch<Array<Record<string, unknown>>>('/api/dicom/services'),
    ])
    allStorages.value = storagesData.map(s => ({
      name: s.name as string,
      kind: 'storage' as const,
    }))
    allServices.value = servicesData
      .filter(s => s.kind === 'storeScp' && s.isRunning === true)
      .map(s => ({
        name: s.name as string,
        kind: 'service' as const,
        aeTitle: s.callingAETitle as string | undefined,
      }))
  }
  catch {
    allStorages.value = []
    allServices.value = []
  }
  finally {
    isLoading.value = false
  }
}

async function confirmRetrieve() {
  if (!selectedName.value) return
  isPending.value = true
  try {
    const dest = selectedDest.value
    const destinationType: 'storage' | 'service' = dest?.kind === 'storage' ? 'storage' : 'service'

    const result = await $fetch<{ jobId: string }>(
      `/api/dicom/pacs/${encodeURIComponent(props.pacsName)}/retrieve`,
      {
        method: 'POST',
        body: {
          studyUid: props.studyUid,
          method: method.value,
          destinationName: selectedName.value,
          destinationType,
        },
      },
    )

    isOpen.value = false
    emit('retrieved', result.jobId)
    toast.add({
      title: 'Retrieve job queued',
      description: `Job ${result.jobId} — ${method.value.toUpperCase()} to ${selectedName.value}`,
      color: 'success',
    })
  }
  catch (err) {
    toast.add({
      title: 'Retrieve failed',
      description: err instanceof Error ? err.message : String(err),
      color: 'error',
    })
  }
  finally {
    isPending.value = false
  }
}
</script>
