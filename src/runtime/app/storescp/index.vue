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
            <pre>No logs</pre>
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
                  {{ service?.process?.restartTime }}
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

  type Service = {
    process: {
      status: 'online' | 'stopping' | 'stopped' | 'launching' | 'errored' | 'one-launch-status'
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

onMounted(() => {
  intval.value = setInterval(() => {
    refreshService()
  }, 2000)
})

onBeforeUnmount(() => {
  if (intval.value) {
    clearInterval(intval.value)
  }
})
</script>
