<template>
  <div>
    <!-- Empty state -->
    <div
      v-if="!services || services.length === 0"
      class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-8 text-center text-gray-500"
    >
      <UIcon
        name="i-lucide-server-off"
        class="w-12 h-12 mx-auto mb-3 opacity-40"
      />
      <p class="font-medium mb-1">
        No services configured
      </p>
      <p class="text-sm text-gray-400 max-w-xs mx-auto mt-1">
        Add entries with <code class="text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">kind: 'storeScp'</code>,
        <code class="text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">'dimse'</code>, or
        <code class="text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">'dicomweb'</code> to the
        <code class="text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">services</code> array in your Nuxt config.
      </p>
    </div>

    <div
      v-else
      class="space-y-6"
    >
      <!-- ── Internal StoreSCP services ─────────────────────────────────── -->
      <section v-if="internalServices.length > 0">
        <div class="flex items-center gap-2 mb-3">
          <UIcon
            name="i-lucide-server"
            class="w-4 h-4 text-primary-500"
          />
          <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">Internal</span>
          <UBadge
            color="primary"
            variant="subtle"
            size="xs"
          >
            {{ internalServices.length }}
          </UBadge>
        </div>
        <div class="flex flex-col gap-3">
          <div
            v-for="service in internalServices"
            :key="service.name"
            class="group bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-primary-300 dark:hover:border-primary-700 transition-all duration-150 cursor-pointer"
            @click="selectService(service.name)"
          >
            <div class="p-4">
              <!-- Header row -->
              <div class="flex items-start justify-between gap-3 mb-3">
                <div class="flex items-center gap-3 min-w-0">
                  <div
                    class="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
                    :class="service.isRunning ? 'bg-primary-100 dark:bg-primary-900/40' : 'bg-gray-100 dark:bg-gray-800'"
                  >
                    <UIcon
                      name="i-lucide-server"
                      class="w-4 h-4"
                      :class="service.isRunning ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'"
                    />
                  </div>
                  <div class="min-w-0">
                    <h3 class="font-semibold text-sm truncate">
                      {{ service.name }}
                    </h3>
                    <p class="text-xs text-gray-400 dark:text-gray-500 truncate">
                      {{ service.callingAETitle }}
                    </p>
                  </div>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <UBadge
                    :color="service.isRunning ? 'success' : 'neutral'"
                    variant="subtle"
                    size="xs"
                  >
                    {{ service.isRunning ? 'Running' : 'Stopped' }}
                  </UBadge>
                  <UButton
                    v-if="!service.isRunning"
                    icon="i-lucide-play"
                    size="xs"
                    color="success"
                    variant="ghost"
                    square
                    @click.stop="emit('startService', service.name)"
                  />
                  <UButton
                    v-else
                    icon="i-lucide-square"
                    size="xs"
                    color="error"
                    variant="ghost"
                    square
                    @click.stop="emit('stopService', service.name)"
                  />
                  <UButton
                    icon="i-lucide-arrow-right"
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    square
                    @click.stop="selectService(service.name)"
                  />
                </div>
              </div>
              <!-- Stats row -->
              <div class="flex items-center gap-4">
                <span class="flex items-center gap-1 text-xs text-gray-500">
                  <UIcon name="i-lucide-zap" class="w-3 h-3" />
                  {{ Object.values(service.eventHandlers || {}).flat().length }} handlers
                </span>
              </div>
            </div>
            <div class="px-4 py-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50 rounded-b-lg">
              <span class="text-xs text-gray-500">
                <UIcon name="i-lucide-plug" class="w-3 h-3 inline mr-1 -mt-0.5" />
                Port {{ service.port }}
              </span>
              <span class="text-xs text-gray-400">C-STORE SCP</span>
            </div>
          </div>
        </div>
      </section>

      <!-- ── External services ───────────────────────────────────────────── -->
      <section v-if="externalServices.length > 0">
        <div class="flex items-center gap-2 mb-3">
          <UIcon
            name="i-lucide-send"
            class="w-4 h-4 text-slate-500"
          />
          <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">External</span>
          <UBadge
            color="neutral"
            variant="subtle"
            size="xs"
          >
            {{ externalServices.length }}
          </UBadge>
        </div>
        <div class="flex flex-col gap-3">
          <div
            v-for="service in externalServices"
            :key="service.name"
            class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 transition-all duration-150"
          >
            <div class="p-4">
              <!-- Header row -->
              <div class="flex items-start justify-between gap-3 mb-3">
                <div class="flex items-center gap-3 min-w-0">
                  <div
                    class="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
                    :class="service.protocol === 'dicomweb' ? 'bg-violet-100 dark:bg-violet-900/40' : 'bg-blue-100 dark:bg-blue-900/40'"
                  >
                    <UIcon
                      :name="service.protocol === 'dicomweb' ? 'i-lucide-globe' : 'i-lucide-network'"
                      class="w-4 h-4"
                      :class="service.protocol === 'dicomweb' ? 'text-violet-600 dark:text-violet-400' : 'text-blue-600 dark:text-blue-400'"
                    />
                  </div>
                  <div class="min-w-0">
                    <h3 class="font-semibold text-sm truncate">
                      {{ service.label }}
                    </h3>
                    <p
                      v-if="service.label !== service.name"
                      class="text-xs text-gray-400 dark:text-gray-500 truncate"
                    >
                      {{ service.name }}
                    </p>
                  </div>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <UBadge
                    color="neutral"
                    variant="subtle"
                    size="xs"
                  >
                    External
                  </UBadge>
                  <UBadge
                    :color="service.protocol === 'dicomweb' ? 'secondary' : 'info'"
                    variant="soft"
                    size="xs"
                  >
                    {{ service.protocol === 'dicomweb' ? 'DICOMweb' : 'DIMSE' }}
                  </UBadge>
                </div>
              </div>
              <!-- Address row -->
              <div class="flex items-center gap-2 mb-2">
                <UIcon
                  :name="service.protocol === 'dicomweb' ? 'i-lucide-globe' : 'i-lucide-network'"
                  class="w-3.5 h-3.5 text-gray-400 shrink-0"
                />
                <code class="text-xs text-gray-600 dark:text-gray-400 truncate font-mono select-all">{{ service.addr }}</code>
              </div>
              <!-- DIMSE AE titles -->
              <div
                v-if="service.protocol === 'dimse' && (service.calledAeTitle || service.callingAeTitle)"
                class="flex flex-wrap gap-x-4 gap-y-1 mb-2"
              >
                <span
                  v-if="service.calledAeTitle"
                  class="flex items-center gap-1 text-xs text-gray-500"
                >
                  Called: <code class="font-mono">{{ service.calledAeTitle }}</code>
                </span>
                <span
                  v-if="service.callingAeTitle"
                  class="flex items-center gap-1 text-xs text-gray-500"
                >
                  Calling: <code class="font-mono">{{ service.callingAeTitle }}</code>
                </span>
              </div>
              <!-- Description -->
              <p
                v-if="service.description"
                class="text-xs text-gray-500 dark:text-gray-400 mt-1"
              >
                {{ service.description }}
              </p>
            </div>
            <div class="px-4 py-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50 rounded-b-lg">
              <span class="text-xs text-gray-500">
                <UIcon
                  name="i-lucide-arrow-right-circle"
                  class="w-3 h-3 inline mr-1 -mt-0.5"
                />
                Send target
              </span>
              <span class="text-xs text-gray-400">{{ service.protocol === 'dicomweb' ? 'STOW-RS' : 'C-STORE SCU' }}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from '#imports'
import { useComponentRouter } from '#imports'

export interface InternalServiceInfo {
  kind: 'storeScp'
  name: string
  isRunning: boolean
  port: number
  callingAETitle: string
  eventHandlers: Record<string, string[]>
}

export interface ExternalServiceInfo {
  kind: 'external'
  name: string
  label: string
  protocol: 'dimse' | 'dicomweb'
  addr: string
  calledAeTitle?: string
  callingAeTitle?: string
  description?: string
}

export type UnifiedServiceInfo = InternalServiceInfo | ExternalServiceInfo

const componentRouter = useComponentRouter()

const props = defineProps<{
  services: UnifiedServiceInfo[] | null
}>()

const emit = defineEmits<{
  startService: [serviceName: string]
  stopService: [serviceName: string]
}>()

const internalServices = computed(() =>
  (props.services ?? []).filter((s): s is InternalServiceInfo => s.kind === 'storeScp'),
)

const externalServices = computed(() =>
  (props.services ?? []).filter((s): s is ExternalServiceInfo => s.kind === 'external'),
)

function selectService(name: string) {
  componentRouter.push(`/services/${encodeURIComponent(name)}`)
}
</script>
