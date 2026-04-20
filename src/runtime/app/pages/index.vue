<template>
  <NUtilsComponentRouter
    v-slot="{ component }"
    :routes="routes"
    :base="base"
    :mode="mode"
    :initial="initial"
  >
    <NUtilsComponentShell
      :orientation="orientation"
      :items="navigationItems"
      :page-offset="pageOffset"
      :active-match="activeMatch"
    >
      <template #leading>
        <div class="px-4 py-3 border-gray-200 dark:border-gray-800 flex items-center gap-2.5">
          <div class="flex items-center justify-center w-7 h-7 rounded-lg bg-primary-100 dark:bg-primary-900/40 shrink-0">
            <UIcon name="i-lucide-scan-line" class="w-4 h-4 text-primary-600 dark:text-primary-400" />
          </div>
          <span class="text-sm font-semibold tracking-tight">DICOM</span>
        </div>
      </template>

      <template #trailing>
        <div class="mt-auto px-3 py-3 border-t border-gray-200 dark:border-gray-800">
          <DicomJobsTasksButton />
        </div>
      </template>

      <component :is="component" />
    </NUtilsComponentShell>
  </NUtilsComponentRouter>

  <!-- Confirm Modal from nutils -->
  <NUtilsConfirmModal />
</template>

<script setup lang="ts">
import DicomJobsTasksButton from '../components/jobs/TasksButton.vue'

const props = withDefaults(defineProps<{
  pageOffset?: string | number
  activeMatch?: 'exact' | 'prefix'
  orientation?: 'horizontal' | 'vertical'
  base?: string
  mode?: 'query' | 'hash' | 'memory'
  initial?: string
}>(), {
  pageOffset: 0,
  activeMatch: 'prefix',
  orientation: 'horizontal',
  base: 'p',
  mode: 'query',
})

const routes = {
  '/services': () => import('./services/index.vue'),
  '/services/new': () => import('./services/new.vue'),
  '/services/:name': () => import('./services/[name].vue'),
  '/handlers': () => import('./handlers/index.vue'),
  '/storages': () => import('./storages/index.vue'),
  '/storages/:name': () => import('./storages/[name].vue'),
  '/pacs': () => import('./pacs/index.vue'),
  '/pacs/:name': () => import('./pacs/[name].vue'),
}

const navigationItems = [
  [
    {
      label: 'Services',
      path: '/services',
      icon: 'i-lucide-server',
    },
    {
      label: 'Event Handlers',
      path: '/handlers',
      icon: 'i-lucide-zap',
    },
    {
      label: 'Storages',
      path: '/storages',
      icon: 'i-lucide-database',
    },
    {
      label: 'PACS',
      path: '/pacs',
      icon: 'i-lucide-search',
    },
  ],
]
</script>
