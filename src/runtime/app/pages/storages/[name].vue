<template>
  <div class="h-full flex flex-col overflow-hidden">
    <!-- Header -->
    <div class="border-b border-gray-200 dark:border-gray-800 px-6 py-3 shrink-0">
      <div class="flex items-center gap-3">
        <UButton
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="ghost"
          size="sm"
          square
          @click="goBack"
        />
        <div class="flex items-center gap-2.5 min-w-0">
          <div
            class="flex items-center justify-center w-7 h-7 rounded-lg shrink-0"
            :class="storage?.storageBackend === 'S3' ? 'bg-sky-50 dark:bg-sky-900/30' : 'bg-primary-50 dark:bg-primary-900/30'"
          >
            <UIcon
              :name="storage?.storageBackend === 'S3' ? 'i-lucide-cloud' : 'i-lucide-database'"
              class="w-3.5 h-3.5"
              :class="storage?.storageBackend === 'S3' ? 'text-sky-600 dark:text-sky-400' : 'text-primary-600 dark:text-primary-400'"
            />
          </div>
          <div class="min-w-0">
            <h1 class="text-base font-semibold truncate">
              {{ storageName }}
            </h1>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono truncate">
              {{ storage?.outDir }}
            </p>
          </div>
          <UBadge
            v-if="storage"
            :color="storage.storageBackend === 'S3' ? 'info' : 'primary'"
            variant="subtle"
            size="xs"
          >
            {{ storage.storageBackend }}
          </UBadge>
        </div>
      </div>
    </div>

    <!-- Not found -->
    <div
      v-if="!storage"
      class="flex-1 flex items-center justify-center"
    >
      <div class="text-center">
        <UIcon name="i-lucide-alert-circle" class="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p class="text-sm text-gray-500">
          Storage not found
        </p>
      </div>
    </div>

    <!-- Two-column layout -->
    <div
      v-else
      class="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden"
    >
      <!-- Left: File browser (2/3) -->
      <div class="flex-[2] min-h-0 flex flex-col border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-800">
        <StorageBrowser
          :storage-name="storageName"
          :source-name="storage.usedBy[0]"
          :on-view-file="openFileTab"
        />
      </div>

      <!-- Right: Tab panel (1/3) -->
      <div class="flex-[1] min-h-0 flex flex-col overflow-hidden">
        <!-- Tab bar -->
        <div
          ref="tabBarEl"
          class="shrink-0 h-9 flex items-stretch overflow-hidden border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60"
        >
          <!-- Visible tabs -->
          <button
            v-for="(tab, i) in tabs"
            v-show="i < overflowStartIdx"
            :key="tab.id"
            data-tab-btn
            class="group relative flex items-center gap-1.5 px-3 text-xs font-medium whitespace-nowrap shrink-0 border-b-2 transition-colors focus:outline-none"
            :class="activeTabId === tab.id
              ? 'border-primary-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60'"
            @click="activeTabId = tab.id"
          >
            <UIcon
              :name="tab.type === 'config' ? 'i-lucide-settings-2' : getFileIcon(tab.label)"
              class="w-3.5 h-3.5 shrink-0"
            />
            <span class="max-w-[120px] truncate">{{ tab.label }}</span>
            <span
              v-if="tab.canClose"
              class="ml-0.5 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity rounded p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700"
              @click.stop="closeTab(tab.id)"
            >
              <UIcon name="i-lucide-x" class="w-3 h-3" />
            </span>
          </button>

          <!-- Overflow "⋯" popover -->
          <UPopover
            v-if="overflowStartIdx < tabs.length"
            v-model:open="overflowOpen"
            :content="{ side: 'bottom', align: 'end', sideOffset: 1 }"
            :ui="{ content: 'p-0 min-w-52 rounded-t-none' }"
          >
            <!-- Trigger: same visual style as the other tabs -->
            <button
              class="h-full flex items-center gap-1 px-3 text-xs font-medium whitespace-nowrap shrink-0 border-b-2 transition-colors focus:outline-none"
              :class="overflowTabs.some(t => t.id === activeTabId)
                ? 'border-primary-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60'"
            >
              <span class="tracking-widest leading-none pb-px">···</span>
              <UIcon
                name="i-lucide-chevron-down"
                class="w-3 h-3 opacity-60 transition-transform"
                :class="{ 'rotate-180': overflowOpen }"
              />
            </button>

            <!-- Dropdown content -->
            <template #content="{ close }">
              <button
                v-for="tab in overflowTabs"
                :key="tab.id"
                class="group w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-left transition-colors"
                :class="activeTabId === tab.id
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800/60'"
                @click="activeTabId = tab.id; close()"
              >
                <UIcon
                  :name="tab.type === 'config' ? 'i-lucide-settings-2' : getFileIcon(tab.label)"
                  class="w-3.5 h-3.5 shrink-0"
                />
                <span class="flex-1 truncate">{{ tab.label }}</span>
                <span
                  v-if="tab.canClose"
                  class="p-0.5 rounded opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity hover:bg-gray-200 dark:hover:bg-gray-700"
                  @click.stop="closeTab(tab.id); close()"
                >
                  <UIcon name="i-lucide-x" class="w-3 h-3" />
                </span>
              </button>
            </template>
          </UPopover>
        </div>

        <!-- Tab content -->
        <div class="flex-1 min-h-0 overflow-hidden">
          <!-- Config tab -->
          <div
            v-if="activeTabId === 'config'"
            class="h-full overflow-y-auto p-6 space-y-5"
          >
            <!-- Configuration -->
            <section>
              <h4 class="text-[11px] font-semibold tracking-widest uppercase text-gray-400 dark:text-gray-500 mb-3">
                Configuration
              </h4>
              <dl class="space-y-2.5">
                <div class="flex items-center justify-between gap-2">
                  <dt class="text-sm text-gray-500 dark:text-gray-400">
                    Name
                  </dt>
                  <dd class="text-sm font-mono font-medium text-gray-900 dark:text-gray-100">
                    {{ storage.name }}
                  </dd>
                </div>
                <div class="flex items-center justify-between gap-2">
                  <dt class="text-sm text-gray-500 dark:text-gray-400">
                    Backend
                  </dt>
                  <dd>
                    <UBadge
                      :color="storage.storageBackend === 'S3' ? 'info' : 'primary'"
                      variant="subtle"
                      size="xs"
                    >
                      {{ storage.storageBackend }}
                    </UBadge>
                  </dd>
                </div>
                <div class="flex items-center justify-between gap-2">
                  <dt class="text-sm text-gray-500 dark:text-gray-400">
                    Auto-delete
                  </dt>
                  <dd class="text-sm font-mono font-medium text-gray-900 dark:text-gray-100">
                    {{ storage.autoDeleteAfterDays > 0 ? `${storage.autoDeleteAfterDays} days` : 'Disabled' }}
                  </dd>
                </div>
                <div class="flex items-center justify-between gap-2">
                  <dt class="text-sm text-gray-500 dark:text-gray-400">
                    File metadata
                  </dt>
                  <dd>
                    <UBadge
                      :color="storage.storeWithFileMeta ? 'success' : 'neutral'"
                      variant="subtle"
                      size="xs"
                    >
                      {{ storage.storeWithFileMeta ? 'Enabled' : 'Disabled' }}
                    </UBadge>
                  </dd>
                </div>
              </dl>
            </section>

            <div class="border-t border-gray-100 dark:border-gray-800" />

            <!-- Path -->
            <section>
              <h4 class="text-[11px] font-semibold tracking-widest uppercase text-gray-400 dark:text-gray-500 mb-3">
                Directory
              </h4>
              <div class="bg-gray-50 dark:bg-gray-800/60 rounded-lg px-3 py-2.5 font-mono text-xs break-all text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700/60 leading-relaxed">
                {{ storage.outDir }}
              </div>
            </section>

            <!-- Used by -->
            <template v-if="storage.usedBy.length > 0">
              <div class="border-t border-gray-100 dark:border-gray-800" />
              <section>
                <h4 class="text-[11px] font-semibold tracking-widest uppercase text-gray-400 dark:text-gray-500 mb-3">
                  Used by
                </h4>
                <div class="space-y-1.5">
                  <div
                    v-for="svc in storage.usedBy"
                    :key="svc"
                    class="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60 cursor-pointer hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
                    @click="openService(svc)"
                  >
                    <UIcon name="i-lucide-server" class="w-3.5 h-3.5 text-primary-500 shrink-0" />
                    <span class="text-sm font-mono text-gray-700 dark:text-gray-300">{{ svc }}</span>
                    <UIcon name="i-lucide-arrow-right" class="w-3 h-3 text-gray-400 ml-auto" />
                  </div>
                </div>
              </section>
            </template>
            <template v-else>
              <div class="border-t border-gray-100 dark:border-gray-800" />
              <section>
                <h4 class="text-[11px] font-semibold tracking-widest uppercase text-gray-400 dark:text-gray-500 mb-3">
                  Used by
                </h4>
                <p class="text-xs text-gray-400 dark:text-gray-500 italic">
                  No services attached
                </p>
              </section>
            </template>
          </div>

          <!-- File viewer tabs -->
          <template v-for="tab in fileTabs" :key="tab.id">
            <div
              v-show="activeTabId === tab.id"
              class="h-full overflow-hidden"
            >
              <StorageFileViewer
                :storage-name="storageName"
                :file-key="tab.fileKey!"
              />
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch, useFetch, useComponentRouter } from '#imports'
import StorageBrowser from '../../components/storage/Browser.vue'
import StorageFileViewer from '../../components/storage/FileViewer.vue'
import type { StorageInfo } from '../../components/storage/Card.vue'

interface Tab {
  id: string
  label: string
  type: 'config' | 'file'
  fileKey?: string
  canClose: boolean
}

const componentRouter = useComponentRouter()

const storageName = computed(() => componentRouter.route.value.params.name as string)

const { data: storage } = await useFetch<StorageInfo>(
  () => `/api/dicom/storages/${storageName.value}`,
  { watch: [storageName] },
)

const tabs = ref<Tab[]>([
  { id: 'config', label: 'Config', type: 'config', canClose: false },
])
const activeTabId = ref('config')

const fileTabs = computed(() => tabs.value.filter(t => t.type === 'file'))

// ── Overflow tab logic ────────────────────────────────────────────────────────

const tabBarEl = ref<HTMLElement>()
const overflowStartIdx = ref(tabs.value.length) // show all tabs initially
const overflowOpen = ref(false)

const overflowTabs = computed(() => tabs.value.slice(overflowStartIdx.value))

/**
 * Computes how many tabs fit in the tab bar.
 *
 * Tabs hidden via v-show have offsetWidth=0, so we temporarily un-hide them
 * all before measuring, then set the cut-off index.
 */
async function computeOverflow() {
  if (!tabBarEl.value) return

  // Reveal all tabs so we can read their natural widths
  overflowStartIdx.value = tabs.value.length
  await nextTick()

  const containerWidth = tabBarEl.value.clientWidth
  // Reserve room for the ··· button (px-3 × 2 + text + chevron ≈ 60px)
  const OVERFLOW_BTN_W = 60

  const els = tabBarEl.value.querySelectorAll<HTMLElement>('[data-tab-btn]')
  const widths = Array.from({ length: tabs.value.length }, (_, i) => els[i]?.offsetWidth ?? 0)

  // If everything fits without a ··· button, leave all visible
  if (widths.reduce((a, b) => a + b, 0) <= containerWidth) {
    // overflowStartIdx already set to tabs.value.length above
    return
  }

  // Find how many tabs fit alongside the ··· button
  let used = 0
  for (let i = 0; i < widths.length; i++) {
    const w = widths[i] ?? 0
    if (used + w + OVERFLOW_BTN_W > containerWidth) {
      overflowStartIdx.value = i
      return
    }
    used += w
  }
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  resizeObserver = new ResizeObserver(() => { computeOverflow() })
  if (tabBarEl.value) resizeObserver.observe(tabBarEl.value)
  computeOverflow()
})

onUnmounted(() => resizeObserver?.disconnect())

// Recompute whenever tabs are added or removed
watch(
  () => tabs.value.length,
  () => { computeOverflow() },
)

// ── Tab management ────────────────────────────────────────────────────────────

function openFileTab(key: string, name: string) {
  const existing = tabs.value.find(t => t.fileKey === key)
  if (existing) {
    activeTabId.value = existing.id
    return
  }
  const id = `file:${key}`
  tabs.value.push({ id, label: name, type: 'file', fileKey: key, canClose: true })
  activeTabId.value = id
}

function closeTab(id: string) {
  const idx = tabs.value.findIndex(t => t.id === id)
  if (idx === -1) return
  const wasActive = activeTabId.value === id
  tabs.value.splice(idx, 1)
  if (wasActive) {
    activeTabId.value = tabs.value[Math.max(0, idx - 1)]?.id ?? 'config'
  }
}

function getFileIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'dcm') return 'i-lucide-file-image'
  if (['txt', 'log', 'md', 'csv'].includes(ext ?? '')) return 'i-lucide-file-text'
  if (['json', 'xml', 'yaml', 'yml'].includes(ext ?? '')) return 'i-lucide-file-code'
  return 'i-lucide-file'
}

function goBack() {
  componentRouter.push('/storages')
}

function openService(name: string) {
  componentRouter.push(`/services/${name}`)
}
</script>
