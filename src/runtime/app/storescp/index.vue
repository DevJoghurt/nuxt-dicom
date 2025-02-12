<template>
  <div class="px-8 py-6">
    <section class="flex justify-between items-center">
      <div>
        <h1 class="text-xl font-bold">
          DICOM StoreSCP
        </h1>
        <p class="text-sm font-thin text-gray-500">
          Service is listening on {{ service?.server?.port }}
        </p>
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
          />
        </UDropdownMenu>
      </div>
    </section>
    <div class="flex flex-col lg:flex-row py-8 space-y-4 lg:space-y-0 lg:space-x-4">
      <div class="w-full lg:w-2/3">
        <UCard
          class="w-full"
          :ui=" {
            body: 'bg-zinc-800 text-white text-xs font-thin rounded-b-[calc(var(--ui-radius)*2)]',
          }"
        >
          <template #header>
            <h2 class="text-lg font-bold">
              Logs
            </h2>
          </template>
          <div>
            <pre v-if="!service?.logs?.value || service?.logs?.value.length === 0">No logs</pre>
            <div
              v-for="log of service?.logs?.value"
              v-else
              :key="log"
            >
              {{ log }}
            </div>
          </div>
        </UCard>
      </div>
      <div class="w-full lg:w-1/3">
        <UCard>
          <template #header>
            <h2 class="text-lg font-bold">
              Status
            </h2>
          </template>
          <div>
            <div class="flex flex-col space-y-4">
              <div>
                <p class="text-xs font-thin text-gray-500">
                  Status
                </p>
                <UBadge
                  v-if="service?.process?.status === 'running'"
                  label="Running"
                  color="success"
                />
                <UBadge
                  v-if="service?.process?.status === 'stopped'"
                  label="Stopped"
                  color="info"
                />
              </div>
              <div>
                <p class="text-xs font-thin text-gray-500">
                  CPU Usage
                </p>
                <p class="text-sm font-bold">
                  {{ service?.stats?.cpu?.count || 'no data' }} /
                  {{ service?.stats?.cpu?.usage || 'no data' }}
                </p>
              </div>
              <div>
                <p class="text-xs font-thin text-gray-500">
                  Memory Usage
                </p>
                <p class="text-sm font-bold">
                  {{ service?.stats?.memory?.rss || 'no data' }} /
                  {{ service?.stats?.memory?.heapTotal || 'no data' }} /
                  {{ service?.stats?.memory?.heapUsed || 'no data' }} /
                  {{ service?.stats?.memory?.external || 'no data' }}
                </p>
              </div>
              <div>
                <p class="text-xs font-thin text-gray-500">
                  Created at
                </p>
                <p class="text-sm font-bold">
                  {{ new Date((service?.process?.createdAt || 0)).toLocaleString() }}
                </p>
              </div>
              <div>
                <p class="text-xs font-thin text-gray-500">
                  Restarts
                </p>
                <p class="text-sm font-bold">
                  {{ service?.process?.restarts }}
                </p>
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useFetch, onMounted, onBeforeUnmount, ref, computed } from '#imports'

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
