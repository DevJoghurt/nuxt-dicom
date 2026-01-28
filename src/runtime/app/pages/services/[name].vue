<template>
  <div class="h-full flex flex-col overflow-hidden">
    <!-- Header with Back Button and Actions -->
    <div class="border-b border-gray-200 dark:border-gray-800 px-6 py-4 shrink-0">
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            size="sm"
            square
            @click="goBack"
          />
          <div>
            <h1 class="text-lg font-semibold">
              {{ service?.name || 'Service Details' }}
            </h1>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {{ service?.callingAETitle }} • Port {{ service?.port }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <UBadge
            :color="service?.isRunning ? 'success' : 'neutral'"
            variant="solid"
            size="lg"
          >
            <UIcon
              :name="service?.isRunning ? 'i-lucide-check-circle-2' : 'i-lucide-circle'"
              class="w-3.5 h-3.5 mr-1.5"
            />
            {{ service?.isRunning ? 'Running' : 'Stopped' }}
          </UBadge>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 min-h-0 overflow-y-auto">
      <div class="max-w-7xl mx-auto p-6">
        <!-- Loading State -->
        <div
          v-if="loading"
          class="flex items-center justify-center py-12"
        >
          <div class="text-center">
            <UIcon
              name="i-lucide-loader-2"
              class="w-12 h-12 animate-spin mx-auto mb-3 opacity-50"
            />
            <p class="text-gray-500 dark:text-gray-400">
              Loading service details...
            </p>
          </div>
        </div>

        <!-- Service Not Found -->
        <div
          v-else-if="!service"
          class="flex items-center justify-center py-12"
        >
          <div class="text-center">
            <UIcon
              name="i-lucide-alert-circle"
              class="w-12 h-12 mx-auto mb-3 opacity-50"
            />
            <p class="text-gray-500 dark:text-gray-400">
              Service not found
            </p>
          </div>
        </div>

        <!-- Service Content -->
        <div
          v-else
          class="space-y-6"
        >
          <!-- Service Stats -->
          <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
              <p class="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">
                Port
              </p>
              <p class="text-2xl font-bold mt-2">
                {{ service.port }}
              </p>
            </div>
            <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
              <p class="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">
                AE Title
              </p>
              <p class="text-lg font-semibold mt-2 truncate">
                {{ service.callingAETitle }}
              </p>
            </div>
            <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
              <p class="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">
                Status
              </p>
              <div class="mt-2 flex items-center gap-2">
                <div
                  :class="[
                    'w-2 h-2 rounded-full',
                    service.isRunning ? 'bg-green-500' : 'bg-gray-400',
                  ]"
                />
                <span class="font-semibold">{{ service.isRunning ? 'Running' : 'Stopped' }}</span>
              </div>
            </div>
            <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
              <p class="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">
                Auto Start
              </p>
              <div class="mt-2">
                <UBadge
                  :color="service.autoStart ? 'success' : 'neutral'"
                  variant="subtle"
                  size="sm"
                >
                  {{ service.autoStart ? 'Enabled' : 'Disabled' }}
                </UBadge>
              </div>
            </div>
            <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
              <p class="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">
                Storage
              </p>
              <p
                class="text-sm font-semibold mt-2 truncate"
                :title="service.outDir"
              >
                {{ service.outDir.split('/').pop() || service.outDir }}
              </p>
            </div>
          </div>

          <!-- Service Actions -->
          <div class="flex gap-2">
            <UButton
              v-if="!service.isRunning"
              icon="i-lucide-play"
              label="Start"
              color="success"
              :loading="actionLoading"
              @click="startService"
            />
            <UButton
              v-else
              icon="i-lucide-square"
              label="Stop"
              color="error"
              :loading="actionLoading"
              @click="stopService"
            />
            <UButton
              icon="i-lucide-rotate-cw"
              label="Restart"
              color="warning"
              :loading="actionLoading"
              @click="restartService"
            />
            <UButton
              icon="i-lucide-refresh-cw"
              label="Refresh"
              color="neutral"
              variant="ghost"
              @click="() => refreshService()"
            />
          </div>

          <!-- Tabs -->
          <div class="mb-4">
            <UTabs
              v-model="activeTab"
              :items="tabs"
              size="sm"
              variant="link"
              :ui="{ root: 'w-full', list: 'w-full border-b', trigger: 'justify-start' }"
              :default-value="'configuration'"
            />
          </div>

          <!-- Configuration Tab -->
          <div
            v-if="activeTab === 'configuration'"
            class="space-y-4"
          >
            <!-- Full Path Section -->
            <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
              <div class="flex items-center gap-2 mb-4">
                <UIcon
                  name="i-lucide-folder"
                  class="w-5 h-5"
                />
                <h3 class="font-semibold">
                  Storage Directory
                </h3>
              </div>
              <div class="bg-gray-50 dark:bg-gray-800 rounded p-3 font-mono text-sm break-all">
                {{ service.outDir }}
              </div>
            </div>

            <!-- Configuration Details -->
            <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
              <div class="flex items-center gap-2 mb-4">
                <UIcon
                  name="i-lucide-settings"
                  class="w-5 h-5"
                />
                <h3 class="font-semibold">
                  Configuration
                </h3>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="border-b border-gray-200 dark:border-gray-800 pb-4 last:border-b-0">
                  <p class="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mb-1">
                    Service Name
                  </p>
                  <p class="font-mono">
                    {{ service.name }}
                  </p>
                </div>
                <div class="border-b border-gray-200 dark:border-gray-800 pb-4 last:border-b-0">
                  <p class="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mb-1">
                    Calling AE Title
                  </p>
                  <p class="font-mono">
                    {{ service.callingAETitle }}
                  </p>
                </div>
                <div class="border-b border-gray-200 dark:border-gray-800 pb-4 last:border-b-0">
                  <p class="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mb-1">
                    Port
                  </p>
                  <p class="font-mono">
                    {{ service.port }}
                  </p>
                </div>
                <div class="border-b border-gray-200 dark:border-gray-800 pb-4 last:border-b-0">
                  <p class="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mb-1">
                    Auto Start
                  </p>
                  <p class="font-mono">
                    {{ service.autoStart ? 'Yes' : 'No' }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Timestamps -->
            <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
              <div class="flex items-center gap-2 mb-4">
                <UIcon
                  name="i-lucide-clock"
                  class="w-5 h-5"
                />
                <h3 class="font-semibold">
                  Timestamps
                </h3>
              </div>
              <div class="space-y-3">
                <div
                  v-if="service.createdAt"
                  class="flex justify-between items-start"
                >
                  <span class="text-sm text-gray-600 dark:text-gray-400">Created:</span>
                  <span class="text-sm font-mono">{{ formatDate(service.createdAt) }}</span>
                </div>
                <div
                  v-if="service.startedAt && service.isRunning"
                  class="flex justify-between items-start"
                >
                  <span class="text-sm text-gray-600 dark:text-gray-400">Started:</span>
                  <span class="text-sm font-mono">{{ formatDate(service.startedAt) }}</span>
                </div>
              </div>
            </div>

            <!-- Event Handlers -->
            <div
              v-if="service.eventHandlers && Object.keys(service.eventHandlers).length > 0"
              class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6"
            >
              <div class="flex items-center gap-2 mb-4">
                <UIcon
                  name="i-lucide-zap"
                  class="w-5 h-5"
                />
                <h3 class="font-semibold">
                  Event Handlers
                </h3>
              </div>
              <div class="space-y-4">
                <div
                  v-for="(handlers, eventType) in service.eventHandlers"
                  :key="eventType"
                  class="border-b border-gray-200 dark:border-gray-800 pb-3 last:border-b-0"
                >
                  <p class="text-sm font-medium mb-2">
                    {{ eventType }}
                  </p>
                  <div class="flex flex-wrap gap-2">
                    <UBadge
                      v-for="handler in handlers"
                      :key="handler"
                      color="info"
                      variant="subtle"
                      size="sm"
                    >
                      {{ handler }}
                    </UBadge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Files Tab -->
          <div
            v-if="activeTab === 'files'"
            class="space-y-4"
          >
            <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
              <div class="flex items-center justify-between gap-2 mb-4">
                <div class="flex items-center gap-2">
                  <UIcon
                    name="i-lucide-folder-tree"
                    class="w-5 h-5"
                  />
                  <h3 class="font-semibold">
                    Stored Files
                  </h3>
                  <UBadge
                    v-if="!fileManager.isLoading.value && fileManager.tree.value.length > 0"
                    color="info"
                    variant="subtle"
                    size="sm"
                  >
                    {{ countFiles(fileManager.tree.value) }} files
                  </UBadge>
                </div>
                <div class="flex items-center gap-2">
                  <UButton
                    icon="i-lucide-trash-2"
                    label="Cleanup Old Files"
                    color="warning"
                    variant="ghost"
                    size="sm"
                    @click="showCleanupDialog = true"
                  />
                  <UButton
                    icon="i-lucide-refresh-cw"
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    :loading="fileManager.isLoading.value"
                    @click="fileManager.fetchFiles()"
                  />
                </div>
              </div>

              <!-- Error Message -->
              <div
                v-if="fileManager.error.value"
                class="mb-4"
              >
                <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3 text-sm text-red-700 dark:text-red-400">
                  {{ fileManager.error.value }}
                </div>
              </div>

              <!-- Loading State -->
              <div
                v-if="fileManager.isLoading.value"
                class="flex items-center justify-center py-12"
              >
                <div class="text-center">
                  <UIcon
                    name="i-lucide-loader-2"
                    class="w-8 h-8 animate-spin mx-auto mb-2 opacity-50"
                  />
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    Loading files...
                  </p>
                </div>
              </div>

              <!-- Empty State -->
              <div
                v-else-if="!fileManager.error.value && fileManager.tree.value.length === 0"
                class="flex items-center justify-center py-12"
              >
                <div class="text-center">
                  <UIcon
                    name="i-lucide-folder-open"
                    class="w-12 h-12 mx-auto mb-3 opacity-50"
                  />
                  <p class="text-gray-500 dark:text-gray-400">
                    No files stored yet
                  </p>
                  <p class="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    Files will appear here after receiving DICOM data
                  </p>
                </div>
              </div>

              <!-- File Tree -->
              <div
                v-else
                class="border border-gray-200 dark:border-gray-800 rounded-lg p-4 max-h-[600px] overflow-y-auto"
              >
                <UTree
                  :items="fileManager.tree.value"
                  color="neutral"
                  size="sm"
                  expanded-icon="i-lucide-folder-open"
                  collapsed-icon="i-lucide-folder"
                >
                  <template #item-trailing="{ item }">
                    <div class="flex items-center gap-3">
                      <div
                        v-if="!item.isDirectory"
                        class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"
                      >
                        <span v-if="item.mtime">
                          {{ fileManager.formatDate(item.mtime) }}
                        </span>
                        <span v-if="item.size">
                          {{ fileManager.formatFileSize(item.size) }}
                        </span>
                      </div>
                      <div
                        v-if="!item.isDirectory"
                        class="flex gap-1"
                        @click.stop
                      >
                        <UButton
                          icon="i-lucide-download"
                          color="neutral"
                          variant="ghost"
                          size="xs"
                          @click="fileManager.downloadFile(item.path)"
                        />
                        <UButton
                          icon="i-lucide-trash-2"
                          color="error"
                          variant="ghost"
                          size="xs"
                          @click="confirmDelete(item.path, item.label)"
                        />
                      </div>
                    </div>
                  </template>
                </UTree>
              </div>
            </div>
          </div>

          <!-- Logs Tab -->
          <div
            v-if="activeTab === 'logs'"
            class="space-y-4"
          >
            <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
              <div class="flex items-center justify-between gap-2 mb-4">
                <div class="flex items-center gap-2">
                  <UIcon
                    name="i-lucide-terminal"
                    class="w-5 h-5"
                  />
                  <h3 class="font-semibold">
                    Service Logs
                  </h3>
                  <UBadge
                    :color="liveLogs.isConnected.value ? 'success' : 'neutral'"
                    variant="subtle"
                    size="sm"
                  >
                    {{ liveLogs.isConnected.value ? 'Live' : 'Offline' }}
                  </UBadge>
                </div>
                <div class="flex items-center gap-2">
                  <!-- Log Level Selector -->
                  <USelectMenu
                    v-model="selectedLogLevel"
                    :items="logLevelOptions"
                    size="sm"
                    color="neutral"
                    variant="outline"
                    icon="i-lucide-filter"
                    class="w-32"
                    @update:model-value="updateLogLevel"
                  >
                    <template #item-leading="{ item }">
                      <UIcon
                        :name="item.icon"
                        class="w-4 h-4"
                      />
                    </template>
                  </USelectMenu>
                  <UButton
                    icon="i-lucide-trash-2"
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    @click="liveLogs.clearLogs()"
                  />
                  <UButton
                    icon="i-lucide-download"
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    @click="downloadLogs"
                  />
                </div>
              </div>

              <!-- Error Message -->
              <div
                v-if="liveLogs.error.value"
                class="mb-4"
              >
                <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3 text-sm text-red-700 dark:text-red-400">
                  {{ liveLogs.error.value }}
                </div>
              </div>

              <!-- Logs Display -->
              <div class="bg-gray-900 rounded p-4 text-gray-300 font-mono text-sm h-96 overflow-y-auto space-y-1">
                <div
                  v-if="liveLogs.logs.value.length === 0"
                  class="text-gray-500"
                >
                  <p>Waiting for logs...</p>
                </div>
                <div
                  v-for="(entry, index) in liveLogs.logs.value"
                  :key="index"
                  class="group"
                >
                  <div :class="['whitespace-pre-wrap break-words', liveLogs.getLevelClass(entry.level)]">
                    {{ liveLogs.formatLogEntry(entry) }}
                  </div>
                  <details
                    v-if="liveLogs.hasMetadata(entry)"
                    class="ml-4 mt-0.5 text-xs"
                  >
                    <summary class="cursor-pointer text-gray-500 hover:text-gray-400 select-none">
                      <span class="inline-block w-3 text-center">▸</span> metadata
                    </summary>
                    <pre class="mt-1 p-2 bg-gray-800 rounded text-gray-400 overflow-x-auto">{{ JSON.stringify(entry.metadata, null, 2) }}</pre>
                  </details>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Cleanup Dialog -->
  <UModal
    v-model:open="showCleanupDialog"
    title="Cleanup Old Files"
    description="This will permanently delete all files older than the specified number of days."
  >
    <template #body>
      <div class="mb-6">
        <label class="block text-sm font-medium mb-2">Delete files older than:</label>
        <div class="flex items-center gap-2">
          <input
            v-model.number="cleanupDays"
            type="number"
            min="1"
            class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          >
          <span class="text-sm text-gray-600 dark:text-gray-400">days</span>
        </div>
      </div>
    </template>

    <template #footer="{ close }">
      <UButton
        label="Cancel"
        color="neutral"
        variant="outline"
        @click="close"
      />
      <UButton
        label="Delete Files"
        color="warning"
        icon="i-lucide-trash-2"
        :loading="fileManager.isLoading.value"
        @click="performCleanup"
      />
    </template>
  </UModal>

  <!-- Confirm Modal -->
  <NUtilsConfirmModal />
</template>

<script setup lang="ts">
import {
  computed,
  ref,
  useComponentRouter,
  useLiveServiceLogs,
  useServiceFiles,
  useLogLevel,
  useConfirmModal,
  onMounted,
  watch,
  useFetch } from '#imports'

interface DicomService {
  name: string
  status: 'running' | 'stopped'
  port: number
  callingAETitle: string
  outDir: string
  autoStart: boolean
  isRunning: boolean
  createdAt?: string
  startedAt?: string
  eventHandlers?: Record<string, string[]>
}

const componentRouter = useComponentRouter()
const activeTab = ref('configuration')
const actionLoading = ref(false)
const showCleanupDialog = ref(false)
const cleanupDays = ref(30)

const tabs = [
  { label: 'Configuration', value: 'configuration' },
  { label: 'Files', value: 'files' },
  { label: 'Logs', value: 'logs' },
]

const serviceName = computed(() => {
  return componentRouter.route.value.params.name as string
})

// Initialize live logs composable
const liveLogs = useLiveServiceLogs(serviceName.value)

// Initialize file manager composable
const fileManager = useServiceFiles(serviceName.value)

// Initialize log level composable
const logLevelManager = useLogLevel()

// Initialize confirm modal
const confirm = useConfirmModal()

// Count total files in tree
function countFiles(items: Array<{ isDirectory?: boolean, children?: unknown[] }>): number {
  let count = 0
  for (const item of items) {
    if (!item.isDirectory) {
      count++
    }
    if (item.children) {
      count += countFiles(item.children)
    }
  }
  return count
}

// Log level options with icons
const logLevelOptions = [
  { label: 'Debug', value: 'debug', icon: 'i-lucide-bug' },
  { label: 'Info', value: 'info', icon: 'i-lucide-info' },
  { label: 'Warning', value: 'warn', icon: 'i-lucide-triangle-alert' },
  { label: 'Error', value: 'error', icon: 'i-lucide-circle-x' },
]

const selectedLogLevel = ref(logLevelOptions[1]) // Default to 'info'

// Fetch current log levels on mount
onMounted(async () => {
  await logLevelManager.fetchLogLevels()
  const effectiveLevel = logLevelManager.getEffectiveLevel(serviceName.value)
  selectedLogLevel.value = logLevelOptions.find(opt => opt.value === effectiveLevel) || logLevelOptions[1]

  // Fetch files when Files tab is active or when switching to it
  if (activeTab.value === 'files') {
    await fileManager.fetchFiles()
  }
})

// Watch for tab changes to load files on demand
watch(activeTab, async (newTab) => {
  if (newTab === 'files' && fileManager.tree.value.length === 0 && !fileManager.error.value) {
    await fileManager.fetchFiles()
  }
})

// Update log level
async function updateLogLevel(option: typeof logLevelOptions[0]) {
  try {
    await logLevelManager.setServiceLevel(serviceName.value, option.value as 'debug' | 'info' | 'warn' | 'error')
  }
  catch {
    // Error is already logged and set in the composable
  }
}

// Transform function for service data
const transformService = (data: unknown): DicomService => {
  const s = (data as Record<string, unknown>) || {}
  return {
    name: String(s.name || ''),
    status: (s.isRunning ? 'running' : 'stopped') as 'running' | 'stopped',
    port: Number(s.port || 0),
    callingAETitle: String(s.callingAETitle || 'STORESCP'),
    outDir: String(s.outDir || ''),
    autoStart: Boolean(s.autoStart),
    isRunning: Boolean(s.isRunning),
    createdAt: s.createdAt as string | undefined,
    startedAt: s.startedAt as string | undefined,
    eventHandlers: (s.eventHandlers as Record<string, string[]>) || {},
  }
}

// Fetch service data using useFetch
const { data: service, pending: loading, refresh: refreshService } = useFetch(
  () => `/api/dicom/services/${serviceName.value}`,
  {
    transform: transformService,
    watch: [serviceName],
  },
)

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleString()
  }
  catch {
    return dateString
  }
}

async function startService() {
  if (!serviceName.value) return
  actionLoading.value = true

  try {
    await $fetch(`/api/dicom/services/${serviceName.value}/start`, { method: 'POST' })
    await new Promise(resolve => setTimeout(resolve, 500))
    await refreshService()
  }
  catch (err) {
    console.error('Error starting service:', err)
  }
  finally {
    actionLoading.value = false
  }
}

async function stopService() {
  if (!serviceName.value) return
  actionLoading.value = true

  try {
    await $fetch(`/api/dicom/services/${serviceName.value}/stop`, { method: 'POST' })
    await new Promise(resolve => setTimeout(resolve, 500))
    await refreshService()
  }
  catch (err) {
    console.error('Error stopping service:', err)
  }
  finally {
    actionLoading.value = false
  }
}

async function restartService() {
  if (!serviceName.value) return
  actionLoading.value = true

  try {
    // Stop service
    if (service.value?.isRunning) {
      await $fetch(`/api/dicom/services/${serviceName.value}/stop`, { method: 'POST' })
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    // Start service
    await $fetch(`/api/dicom/services/${serviceName.value}/start`, { method: 'POST' })
    await new Promise(resolve => setTimeout(resolve, 500))
    await refreshService()
  }
  catch (err) {
    console.error('Error restarting service:', err)
  }
  finally {
    actionLoading.value = false
  }
}

function goBack() {
  componentRouter.push('/services')
}

async function confirmDelete(path: string, name: string) {
  const result = await confirm({
    title: 'Delete File',
    description: `Are you sure you want to delete "${name}"?`,
    dangerous: true,
    icon: 'i-lucide-trash-2',
    iconColor: 'error',
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
  })

  if (result.confirmed) {
    try {
      await fileManager.deleteFile(path)
    }
    catch {
      // Error is already logged and set in the composable
    }
  }
}

async function performCleanup() {
  try {
    await fileManager.cleanupOldFiles(cleanupDays.value)
    showCleanupDialog.value = false
  }
  catch {
    // Error is already logged and set in the composable
  }
}

function downloadLogs() {
  const content = liveLogs.exportLogs()
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `${serviceName.value}-logs-${timestamp}.txt`

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
