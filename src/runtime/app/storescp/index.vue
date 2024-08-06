<template>
  <div class="px-8 py-6">
    <section>
      <h1 class="text-xl font-bold">
        DICOM StoreSCP
      </h1>
      <p class="text-sm font-thin text-gray-500">
        Service is listening on {{ service?.server?.port }}
      </p>
    </section>
    <div class="flex flex-col lg:flex-row py-8 space-y-4 lg:space-y-0 lg:space-x-4">
      <div class="w-full lg:w-2/3">
        <UCard
          class="w-full"
          :ui=" {
            body: {
              base: 'bg-zinc-800 text-white text-xs font-thin',
            },
          }"
        >
          <template #header>
            <h2 class="text-lg font-bold">
              Logs
            </h2>
          </template>
          <div>
            <pre>{{ data?.logs }}</pre>
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
                <p class="text-sm font-bold">
                  {{ service?.process?.status }}
                </p>
              </div>
              <div>
                <p class="text-xs font-thin text-gray-500">
                  Uptime
                </p>
                <p class="text-sm font-bold">
                  {{ new Date((service?.process?.uptime || 0)).toLocaleString() }}
                </p>
              </div>
              <div>
                <p class="text-xs font-thin text-gray-500">
                  Memory
                </p>
                <p class="text-sm font-bold">
                  {{ formatBytes(service?.process?.monitor?.memory || 0) }}
                </p>
              </div>
              <div>
                <p class="text-xs font-thin text-gray-500">
                  CPU
                </p>
                <p class="text-sm font-bold">
                  {{ service?.process?.monitor?.cpu }}
                </p>
              </div>
              <div>
                <p class="text-xs font-thin text-gray-500">
                  Restarts
                </p>
                <p class="text-sm font-bold">
                  {{ service?.process?.restartTime }}
                </p>
              </div>
              <div>
                <p class="text-xs font-thin text-gray-500">
                  Version
                </p>
                <p class="text-sm font-bold">
                  {{ service?.process?.version }}
                </p>
              </div>
              <div>
                <p class="text-xs font-thin text-gray-500">
                  Node Version
                </p>
                <p class="text-sm font-bold">
                  {{ service?.process?.nodeVersion }}
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
import { useFetch, onMounted, onBeforeUnmount, ref } from '#imports'

    type Logs = {
      logs: string
    }

    type Service = {
      process: {
        id: string
        pid: number
        namespace: 'dicom'
        status: 'online' | 'stopping' | 'stopped' | 'launching' | 'errored' | 'one-launch-status'
        uptime: number
        createdAt: number
        restartTime: number
        version: string
        nodeVersion: string
        monitor: {
          memory: number
          cpu: number
        }
      }
      server: {
        port: number
      }
    }

const intval = ref<ReturnType<typeof setInterval> | null>(null)

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

const {
  data,
  refresh: refreshLogs,
} = await useFetch<Logs>(`/api/_dicom/storescp/logs`, {
  method: 'GET',
})

const {
  data: service,
  refresh: refreshService,
} = await useFetch<Service>(`/api/_dicom/storescp/service`, {
  method: 'GET',
})

onMounted(() => {
  intval.value = setInterval(() => {
    refreshLogs()
    refreshService()
  }, 2000)
})

onBeforeUnmount(() => {
  if (intval.value) {
    clearInterval(intval.value)
  }
})
</script>
