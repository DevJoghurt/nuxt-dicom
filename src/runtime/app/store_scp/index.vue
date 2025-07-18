<template>
  <section class="">
    <!--Headerbar-->
    <div class="flex justify-between items-center px-8 py-2 border-b border-gray-200">
      <div>
        <h1 class="text-xl font-bold">
          StoreSCP
        </h1>
      </div>
      <div>
        <UDropdownMenu
          :items="dropdownItems"
        >
          <UButton
            label="Process"
            icon="i-heroicons-cog-8-tooth"
            color="neutral"
            variant="outline"
            class="cursor-pointer"
          />
        </UDropdownMenu>
      </div>
    </div>
    <!--Content-->
    <div class="flex h-[calc(100vh-64px)]">
        <!--Left Sidebar-->
        <div class="w-64 border-r border-gray-200">
          <UNavigationMenu
            color="neutral"
            :items="navItems"
            :ui="{
              root: 'justify-between py-2',
              // only first item in the list flex-1
              list: 'first:flex-1',
              label: 'gap-2'
            }"
            orientation="vertical"
            class="h-full" />
        </div>
        <!--Main Content-->
        <div class="flex-1 p-4">
          <Router v-slot="props">
            <component :is="props.component" />
          </Router>
        </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { useFetch, onMounted, onBeforeUnmount, ref, computed } from '#imports'
import Router from './router.vue'

  type Service = {
    process: {
      status: 'running' | 'stopping' | 'stopped' | 'launching' | 'errored' | 'one-launch-status'
      uptime: number
      createdAt: number
      restartTime: number
    }
    server: {
      port: number
    }
  }

  const navItems = ref<NavigationMenuItem[][]>([
    [{
      label: 'Overview',
      icon: 'i-heroicons-chart-pie',
      onSelect: async () => {
          await navigateTo({
            query: {
              page: 'overview'
            },
          })
      },
    },{
      label: 'Events',
      icon: 'i-heroicons-bell',
      onSelect: async () => {
          await navigateTo({
            query: {
              page: 'events'
            },
          })
      },
    },{
      label: 'Services',
      icon: 'i-heroicons-server',
      onSelect: async () => {
          await navigateTo({
            query: {
              page: 'services'
            },
          })
      },
    },{
      label: 'Logs',
      icon: 'i-heroicons-document-text',
      onSelect: async () => {
          await navigateTo({
            query: {
              page: 'logs'
            },
          })
      },
    }],
    [
      {
        label: 'Configuration',
        icon: 'i-heroicons-cog-6-tooth',
        onSelect: async () => {
            await navigateTo({
              query: {
                page: 'configuration'
              },
            })
        },
      },
    ]
  ])

const intval = ref<ReturnType<typeof setInterval> | null>(null)

const {
  data: service,
  refresh: refreshService,
} = await useFetch<Service>(`/api/_dicom/storescp/service`, {
  method: 'GET',
})

const dropdownItems = computed(() => [{
  label: 'Restart',
  disabled: service.value?.process?.status === 'stopped',
  icon: 'i-heroicons-arrow-path-rounded-square',
  async onSelect() {
    await processAction('restart')
  },
}, {
  label: 'Stop',
  disabled: service.value?.process?.status === 'stopped',
  icon: 'i-heroicons-stop',
  async onSelect() {
    await processAction('stop')
  },
}, {
  label: 'Start',
  disabled: service.value?.process?.status === 'running',
  icon: 'i-heroicons-play',
  async onSelect() {
    await processAction('start')
  },
}])

const processAction = async (action: 'start' | 'stop' | 'restart') => {
  await $fetch(`/api/_dicom/storescp/${action}`, {
    method: 'POST',
  })
}

onMounted(() => {
  intval.value = setInterval(() => {
    refreshService()
  }, 5000)
})

onBeforeUnmount(() => {
  if (intval.value) {
    clearInterval(intval.value)
  }
})
</script>
