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
					<div class="flex items-center justify-between gap-2">
						<h2 class="text-lg font-bold">Process Status</h2>
					</div>
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
		<div class="flex items-center justify-between gap-2">
			<h2 class="text-lg font-bold">Configuration</h2>
			<UButton to="?page=configuration" icon="i-heroicons:cog-6-tooth" size="md" color="neutral" variant="outline" />
		</div>
	</template>
	<div class="">
		<div class="flex items-center justify-between py-3">
			<span class="text-xs text-gray-500 font-medium">Autorun</span>
			<UBadge :label="service?.config?.autorun ? 'Enabled' : 'Disabled'" :color="service?.config?.autorun ? 'success' : 'info'" />
		</div>
		<div class="flex items-center justify-between py-3">
			<span class="text-xs text-gray-500 font-medium">Port</span>
			<span class="text-sm font-semibold text-gray-900">{{ service?.config?.port || '104' }}</span>
		</div>
		<div class="flex items-center justify-between py-3">
			<span class="text-xs text-gray-500 font-medium">Keep Alive</span>
			<UBadge :label="service?.config?.keepAlive ? 'Enabled' : 'Disabled'" :color="service?.config?.keepAlive ? 'success' : 'info'" />
		</div>
		<div class="flex items-center justify-between py-3">
			<span class="text-xs text-gray-500 font-medium">Calling AE Title</span>
			<span class="text-sm font-semibold text-gray-900">{{ service?.config?.callingAETitle || 'STORE_SCP' }}</span>
		</div>
		<div class="flex items-center justify-between py-3">
			<span class="text-xs text-gray-500 font-medium">Study Timeout</span>
			<span class="text-sm font-semibold text-gray-900">{{ service?.config?.studyTimeout || 40 }} s</span>
		</div>
		<div class="pt-3">
			<span class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Storage</span>
		</div>
		<div class="border border-gray-200 rounded-lg p-4 bg-gray-50 my-2">
			<div class="flex flex-col gap-4">
				<div class="flex items-center justify-between">
					<span class="text-xs text-gray-500 font-medium">Backend</span>
					<UBadge :label="service?.config?.storageBackend" :color="service?.config?.storageBackend === 'S3' ? 'primary' : 'info'" />
				</div>
				<div class="border-b border-gray-200 my-2"></div>
				<div v-if="service?.config?.storageBackend === 'Filesystem'" class="flex items-center justify-between">
					<span class="text-xs text-gray-500 font-medium">Output Directory</span>
					<span class="text-sm font-semibold text-gray-900">{{ service?.config?.outDir || 'dicom' }}</span>
				</div>
				<template v-if="service?.config?.storageBackend === 'S3'">
					<div class="flex items-center justify-between">
						<span class="text-xs text-gray-500 font-medium">S3 Access Key</span>
						<span class="text-sm font-semibold text-gray-900">{{ service?.config?.s3AccessKey ? '********' : 'N/A' }}</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-xs text-gray-500 font-medium">S3 Secret Key</span>
						<span class="text-sm font-semibold text-gray-900">{{ service?.config?.s3SecretKey ? '********' : 'N/A' }}</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-xs text-gray-500 font-medium">S3 Bucket</span>
						<span class="text-sm font-semibold text-gray-900">{{ service?.config?.s3Bucket || 'N/A' }}</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-xs text-gray-500 font-medium">S3 Endpoint</span>
						<span class="text-sm font-semibold text-gray-900">{{ service?.config?.s3Endpoint || 'N/A' }}</span>
					</div>
				</template>
			</div>
		</div>
	</div>
</UCard>
		</div>
	</div>
</template>
<script setup lang="ts">
  	import { useFetch, onMounted, onBeforeUnmount, ref } from '#imports'
	import type { ProcessServiceConfig } from '../../../server/utils/schema'

	const intval = ref<ReturnType<typeof setInterval> | null>(null)

	type Service = {
		process: {
			status: 'running' | 'stopping' | 'stopped' | 'launching' | 'errored' | 'one-launch-status'
			uptime: number
			createdAt: number
			restartTime: number
			restarts: number
		},
		stats: {
			cpu: {
				count: number
				usage: string
			},
			memory: {
				rss: string
				heapTotal: string
				heapUsed: string
				external: string
			}
		},
		config: ProcessServiceConfig['storeSCP']
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