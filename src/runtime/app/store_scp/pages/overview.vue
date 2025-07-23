<template>
	<div>
		<div>
			<h1 class="text-2xl font-bold">Overview</h1>
		</div>
		<div class="flex gap-4 w-full py-4">
			<UCard
				class="flex-1"
				:ui="{
					header: 'py-2 bg-gray-100'
				}"
				>
				<template #header>
					<h2 class="text-lg font-bold">Process Status</h2>
				</template>
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
                  <ClientOnly>
                    {{ new Date((service?.process?.createdAt || 0)).toLocaleString() }}
                  </ClientOnly>
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
			</UCard>
			<UCard
				class="flex-none w-1/3"
				:ui="{
					header: 'py-2 bg-gray-100'
				}">
				<template #header>
					<h2 class="text-lg font-bold">Configuration</h2>
				</template>
				<p>Port: {{ service.config?.port }}</p>
			</UCard>
		</div>
	</div>
</template>
<script setup lang="ts">
  	import { useFetch, onMounted, onBeforeUnmount, ref } from '#imports'
	const intval = ref<ReturnType<typeof setInterval> | null>(null)

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

	const {
		data: service,
		refresh: refreshService,
	} = await useFetch<Service>(`/api/_dicom/storescp/service`, {
		method: 'GET',
	})

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