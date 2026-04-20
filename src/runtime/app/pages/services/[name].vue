<template>
  <div class="h-full flex flex-col overflow-hidden">
    <!-- Header -->
    <div class="border-b border-gray-200 dark:border-gray-800 px-6 py-3 shrink-0">
      <div class="flex items-center justify-between gap-4">
        <!-- Left: back + name + status dot -->
        <div class="flex items-center gap-3 min-w-0">
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            size="sm"
            square
            @click="goBack"
          />
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <h1 class="text-base font-semibold truncate">
                {{ service?.name || 'Service Details' }}
              </h1>
              <div
                :class="[
                  'w-1.5 h-1.5 rounded-full shrink-0 transition-colors duration-300',
                  service?.isRunning ? 'bg-green-500' : 'bg-gray-400 dark:bg-gray-600',
                ]"
              />
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
              {{ service?.callingAETitle }} · Port {{ service?.port }}
            </p>
          </div>
        </div>

        <!-- Right: actions -->
        <div class="flex items-center gap-1.5 shrink-0">
          <UButton
            icon="i-lucide-rotate-cw"
            label="Restart"
            color="neutral"
            variant="soft"
            size="sm"
            :disabled="!service"
            :loading="actionLoading"
            @click="restartService"
          />
          <UButton
            v-if="!service?.isRunning"
            icon="i-lucide-play"
            label="Start"
            color="success"
            size="sm"
            :disabled="!service"
            :loading="actionLoading"
            @click="startService"
          />
          <UButton
            v-else
            icon="i-lucide-square"
            label="Stop"
            color="error"
            variant="soft"
            size="sm"
            :loading="actionLoading"
            @click="stopService"
          />
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div
      v-if="loading"
      class="flex-1 flex items-center justify-center"
    >
      <div class="text-center">
        <UIcon
          name="i-lucide-loader-2"
          class="w-10 h-10 animate-spin mx-auto mb-3 opacity-40"
        />
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Loading service details...
        </p>
      </div>
    </div>

    <!-- Not found -->
    <div
      v-else-if="!service"
      class="flex-1 flex items-center justify-center"
    >
      <div class="text-center">
        <UIcon
          name="i-lucide-alert-circle"
          class="w-10 h-10 mx-auto mb-3 opacity-40"
        />
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Service not found
        </p>
      </div>
    </div>

    <!-- Two-column layout -->
    <div
      v-else
      class="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden"
    >
      <!-- Left: Logs (2/3) -->
      <div class="flex-[2] min-h-0 flex flex-col border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-800">
        <ServiceLogViewer :service-name="serviceName" />
      </div>

      <!-- Right: Config inspector (1/3) -->
      <div class="flex-[1] min-h-0 overflow-y-auto p-6 space-y-5">
        <!-- Service -->
        <section>
          <h4 class="text-[11px] font-semibold tracking-widest uppercase text-gray-400 dark:text-gray-500 mb-3">
            Service
          </h4>
          <dl class="space-y-2.5">
            <div class="flex items-center justify-between gap-2">
              <dt class="text-sm text-gray-500 dark:text-gray-400">
                Name
              </dt>
              <dd class="text-sm font-mono font-medium text-gray-900 dark:text-gray-100 truncate max-w-[60%]">
                {{ service.name }}
              </dd>
            </div>
            <div class="flex items-center justify-between gap-2">
              <dt class="text-sm text-gray-500 dark:text-gray-400">
                AE Title
              </dt>
              <dd class="text-sm font-mono font-medium text-gray-900 dark:text-gray-100">
                {{ service.callingAETitle }}
              </dd>
            </div>
            <div class="flex items-center justify-between gap-2">
              <dt class="text-sm text-gray-500 dark:text-gray-400">
                Port
              </dt>
              <dd class="text-sm font-mono font-medium text-gray-900 dark:text-gray-100">
                {{ service.port }}
              </dd>
            </div>
            <div class="flex items-center justify-between gap-2">
              <dt class="text-sm text-gray-500 dark:text-gray-400">
                Auto Start
              </dt>
              <dd>
                <UBadge
                  :color="service.autoStart ? 'success' : 'neutral'"
                  variant="subtle"
                  size="xs"
                >
                  {{ service.autoStart ? 'Enabled' : 'Disabled' }}
                </UBadge>
              </dd>
            </div>
          </dl>
        </section>

        <div class="border-t border-gray-100 dark:border-gray-800" />

        <!-- Storage -->
        <section>
          <h4 class="text-[11px] font-semibold tracking-widest uppercase text-gray-400 dark:text-gray-500 mb-3">
            Storage
          </h4>
          <!-- Storage key link -->
          <div
            v-if="service.storage.key"
            class="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60 cursor-pointer hover:border-primary-300 dark:hover:border-primary-700 transition-colors mb-3"
            @click="openStorage(service.storage.key)"
          >
            <UIcon name="i-lucide-database" class="w-3.5 h-3.5 text-primary-500 shrink-0" />
            <span class="text-sm font-mono text-gray-700 dark:text-gray-300">{{ service.storage.key }}</span>
            <UIcon name="i-lucide-arrow-right" class="w-3 h-3 text-gray-400 ml-auto" />
          </div>
          <div
            v-else
            class="bg-gray-50 dark:bg-gray-800/60 rounded-lg px-3 py-2.5 font-mono text-xs break-all text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700/60 leading-relaxed mb-3"
          >
            {{ service.storage.outDir }}
          </div>
          <!-- Storage detail rows -->
          <dl class="space-y-2.5">
            <div class="flex items-center justify-between gap-2">
              <dt class="text-sm text-gray-500 dark:text-gray-400">
                Backend
              </dt>
              <dd>
                <UBadge color="neutral" variant="subtle" size="xs">
                  {{ service.storage.backend }}
                </UBadge>
              </dd>
            </div>
            <div class="flex items-center justify-between gap-2">
              <dt class="text-sm text-gray-500 dark:text-gray-400">
                File Meta
              </dt>
              <dd>
                <UBadge
                  :color="service.storage.storeWithFileMeta ? 'success' : 'neutral'"
                  variant="subtle"
                  size="xs"
                >
                  {{ service.storage.storeWithFileMeta ? 'Included' : 'Excluded' }}
                </UBadge>
              </dd>
            </div>
            <div class="flex items-center justify-between gap-2">
              <dt class="text-sm text-gray-500 dark:text-gray-400">
                Auto Delete
              </dt>
              <dd>
                <UBadge
                  :color="service.storage.autoDeleteAfterDays > 0 ? 'warning' : 'neutral'"
                  variant="subtle"
                  size="xs"
                >
                  {{ service.storage.autoDeleteAfterDays > 0 ? `After ${service.storage.autoDeleteAfterDays}d` : 'Disabled' }}
                </UBadge>
              </dd>
            </div>
          </dl>
        </section>

        <div class="border-t border-gray-100 dark:border-gray-800" />

        <!-- Protocol -->
        <section>
          <h4 class="text-[11px] font-semibold tracking-widest uppercase text-gray-400 dark:text-gray-500 mb-3">
            Protocol
          </h4>
          <dl class="space-y-2.5">
            <div class="flex items-center justify-between gap-2">
              <dt class="text-sm text-gray-500 dark:text-gray-400">
                Max PDU
              </dt>
              <dd class="text-sm font-mono font-medium text-gray-900 dark:text-gray-100">
                {{ (service.maxPduLength / 1024).toFixed(0) }} KB
              </dd>
            </div>
            <div class="flex items-center justify-between gap-2">
              <dt class="text-sm text-gray-500 dark:text-gray-400">
                Study Timeout
              </dt>
              <dd class="text-sm font-mono font-medium text-gray-900 dark:text-gray-100">
                {{ service.studyTimeout }}s
              </dd>
            </div>
            <div class="flex items-center justify-between gap-2">
              <dt class="text-sm text-gray-500 dark:text-gray-400">
                SOP Classes
              </dt>
              <dd>
                <UBadge color="neutral" variant="subtle" size="xs">
                  {{ service.abstractSyntaxMode }}
                </UBadge>
              </dd>
            </div>
            <div
              v-if="service.abstractSyntaxMode === 'Custom' && service.abstractSyntaxes?.length"
              class="pt-1"
            >
              <dt class="text-xs text-gray-400 dark:text-gray-500 mb-1.5">
                Custom SOP Classes ({{ service.abstractSyntaxes.length }})
              </dt>
              <dd class="bg-gray-50 dark:bg-gray-800/60 rounded-lg px-2.5 py-2 border border-gray-200 dark:border-gray-700/60 max-h-24 overflow-y-auto">
                <p
                  v-for="uid in service.abstractSyntaxes"
                  :key="uid"
                  class="text-xs font-mono text-gray-600 dark:text-gray-300 leading-relaxed"
                >
                  {{ uid }}
                </p>
              </dd>
            </div>
            <div class="flex items-center justify-between gap-2">
              <dt class="text-sm text-gray-500 dark:text-gray-400">
                Transfer Syntaxes
              </dt>
              <dd>
                <UBadge color="neutral" variant="subtle" size="xs">
                  {{ service.transferSyntaxMode }}
                </UBadge>
              </dd>
            </div>
            <div
              v-if="service.transferSyntaxMode === 'Custom' && service.transferSyntaxes?.length"
              class="pt-1"
            >
              <dt class="text-xs text-gray-400 dark:text-gray-500 mb-1.5">
                Custom Transfer Syntaxes ({{ service.transferSyntaxes.length }})
              </dt>
              <dd class="bg-gray-50 dark:bg-gray-800/60 rounded-lg px-2.5 py-2 border border-gray-200 dark:border-gray-700/60 max-h-24 overflow-y-auto">
                <p
                  v-for="uid in service.transferSyntaxes"
                  :key="uid"
                  class="text-xs font-mono text-gray-600 dark:text-gray-300 leading-relaxed"
                >
                  {{ uid }}
                </p>
              </dd>
            </div>
            <div class="flex items-center justify-between gap-2">
              <dt class="text-sm text-gray-500 dark:text-gray-400">
                Strict PDU
              </dt>
              <dd>
                <UBadge
                  :color="service.strict ? 'warning' : 'neutral'"
                  variant="subtle"
                  size="xs"
                >
                  {{ service.strict ? 'Strict' : 'Relaxed' }}
                </UBadge>
              </dd>
            </div>
            <div class="flex items-center justify-between gap-2">
              <dt class="text-sm text-gray-500 dark:text-gray-400">
                Verbose
              </dt>
              <dd>
                <UBadge
                  :color="service.verbose ? 'info' : 'neutral'"
                  variant="subtle"
                  size="xs"
                >
                  {{ service.verbose ? 'On' : 'Off' }}
                </UBadge>
              </dd>
            </div>
          </dl>
        </section>
        <!-- Extract Tags -->
        <template v-if="service.extractTags.length > 0">
          <div class="border-t border-gray-100 dark:border-gray-800" />
          <section>
            <h4 class="text-[11px] font-semibold tracking-widest uppercase text-gray-400 dark:text-gray-500 mb-3">
              Tag Extraction ({{ service.extractTags.length }})
            </h4>
            <div class="flex flex-wrap gap-1.5">
              <UBadge
                v-for="tag in service.extractTags"
                :key="tag"
                color="neutral"
                variant="subtle"
                size="xs"
              >
                {{ tag }}
              </UBadge>
            </div>
          </section>
        </template>

        <!-- Runtime -->
        <template v-if="service.createdAt || (service.startedAt && service.isRunning)">
          <div class="border-t border-gray-100 dark:border-gray-800" />
          <section>
            <h4 class="text-[11px] font-semibold tracking-widest uppercase text-gray-400 dark:text-gray-500 mb-3">
              Runtime
            </h4>
            <dl class="space-y-2.5">
              <div
                v-if="service.createdAt"
                class="flex items-center justify-between gap-2"
              >
                <dt class="text-sm text-gray-500 dark:text-gray-400">
                  Created
                </dt>
                <dd class="text-xs font-mono text-gray-700 dark:text-gray-300">
                  {{ formatDate(service.createdAt) }}
                </dd>
              </div>
              <div
                v-if="service.startedAt && service.isRunning"
                class="flex items-center justify-between gap-2"
              >
                <dt class="text-sm text-gray-500 dark:text-gray-400">
                  Started
                </dt>
                <dd class="text-xs font-mono text-gray-700 dark:text-gray-300">
                  {{ formatDate(service.startedAt) }}
                </dd>
              </div>
            </dl>
          </section>
        </template>

        <!-- Event Handlers -->
        <template v-if="service.eventHandlers && Object.keys(service.eventHandlers).length > 0">
          <div class="border-t border-gray-100 dark:border-gray-800" />
          <section>
            <h4 class="text-[11px] font-semibold tracking-widest uppercase text-gray-400 dark:text-gray-500 mb-3">
              Event Handlers
            </h4>
            <div class="space-y-3">
              <div
                v-for="(handlers, eventType) in service.eventHandlers"
                :key="eventType"
              >
                <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  {{ eventType }}
                </p>
                <div class="flex flex-wrap gap-1.5">
                  <UBadge
                    v-for="handler in handlers"
                    :key="handler"
                    color="info"
                    variant="subtle"
                    size="xs"
                  >
                    {{ handler }}
                  </UBadge>
                </div>
              </div>
            </div>
          </section>
        </template>
      </div>
    </div>
  </div>

  <NUtilsConfirmModal />
</template>

<script setup lang="ts">
import {
  computed,
  ref,
  useComponentRouter,
  useFetch,
} from '#imports'
import ServiceLogViewer from '../../components/service/LogViewer.vue'

interface DicomServiceStorage {
  key?: string
  backend: string
  outDir: string
  storeWithFileMeta: boolean
  autoDeleteAfterDays: number
}

interface DicomService {
  name: string
  status: 'running' | 'stopped'
  port: number
  callingAETitle: string
  autoStart: boolean
  maxPduLength: number
  strict: boolean
  verbose: boolean
  studyTimeout: number
  abstractSyntaxMode: string
  abstractSyntaxes?: string[]
  transferSyntaxMode: string
  transferSyntaxes?: string[]
  extractTags: string[]
  storage: DicomServiceStorage
  isRunning: boolean
  createdAt?: string
  startedAt?: string
  eventHandlers?: Record<string, string[]>
}

const componentRouter = useComponentRouter()
const actionLoading = ref(false)

const serviceName = computed(() => {
  return componentRouter.route.value.params.name as string
})

const transformService = (data: unknown): DicomService => {
  const s = (data as Record<string, unknown>) || {}
  const st = (s.storage as Record<string, unknown>) || {}
  return {
    name: String(s.name || ''),
    status: (s.isRunning ? 'running' : 'stopped') as 'running' | 'stopped',
    port: Number(s.port || 0),
    callingAETitle: String(s.callingAETitle || 'STORESCP'),
    autoStart: Boolean(s.autoStart !== false),
    maxPduLength: Number(s.maxPduLength || 16384),
    strict: Boolean(s.strict),
    verbose: Boolean(s.verbose),
    studyTimeout: Number(s.studyTimeout || 30),
    abstractSyntaxMode: String(s.abstractSyntaxMode || 'AllStorage'),
    abstractSyntaxes: s.abstractSyntaxes as string[] | undefined,
    transferSyntaxMode: String(s.transferSyntaxMode || 'All'),
    transferSyntaxes: s.transferSyntaxes as string[] | undefined,
    extractTags: (s.extractTags as string[]) || [],
    storage: {
      key: st.key as string | undefined,
      backend: String(st.backend || 'Filesystem'),
      outDir: String(st.outDir || ''),
      storeWithFileMeta: Boolean(st.storeWithFileMeta),
      autoDeleteAfterDays: Number(st.autoDeleteAfterDays ?? 0),
    },
    isRunning: Boolean(s.isRunning),
    createdAt: s.createdAt as string | undefined,
    startedAt: s.startedAt as string | undefined,
    eventHandlers: (s.eventHandlers as Record<string, string[]>) || {},
  }
}

const { data: service, pending: loading, refresh: refreshService } = useFetch(
  () => `/api/dicom/services/${serviceName.value}`,
  { transform: transformService, watch: [serviceName] },
)

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleString()
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
    if (service.value?.isRunning) {
      await $fetch(`/api/dicom/services/${serviceName.value}/stop`, { method: 'POST' })
      await new Promise(resolve => setTimeout(resolve, 500))
    }
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

function openStorage(name: string) {
  componentRouter.push(`/storages/${name}`)
}
</script>
