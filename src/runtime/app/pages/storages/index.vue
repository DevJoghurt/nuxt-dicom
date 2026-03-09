<template>
  <div class="h-full flex flex-col overflow-hidden">
    <!-- Header -->
    <div class="border-b border-gray-200 dark:border-gray-800 px-6 py-3 shrink-0">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-base font-semibold">
            Storages
          </h1>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {{ storages?.length ?? 0 }} mounted storage{{ storages?.length !== 1 ? 's' : '' }}
          </p>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 min-h-0 overflow-y-auto">
      <div class="px-6 py-6">
        <!-- Empty -->
        <div
          v-if="!storages || storages.length === 0"
          class="flex flex-col items-center justify-center py-24 text-center"
        >
          <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 mb-4">
            <UIcon name="i-lucide-database" class="w-6 h-6 text-gray-400" />
          </div>
          <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
            No storages configured
          </p>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-xs">
            Add a <code class="font-mono">storages</code> entry in your Nuxt config to mount storage backends.
          </p>
        </div>

        <!-- Grid -->
        <div
          v-else
          class="flex flex-col gap-4"
        >
          <StorageCard
            v-for="storage in storages"
            :key="storage.name"
            :storage="storage"
            @click="openStorage"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useFetch, useComponentRouter } from '#imports'
import StorageCard from '../../components/storage/Card.vue'
import type { StorageInfo } from '../../components/storage/Card.vue'

const componentRouter = useComponentRouter()

const { data: storages } = await useFetch<StorageInfo[]>('/api/dicom/storages')

function openStorage(storage: StorageInfo) {
  componentRouter.push(`/storages/${storage.name}`)
}
</script>
