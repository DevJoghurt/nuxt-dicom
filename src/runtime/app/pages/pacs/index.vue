<template>
  <div class="h-full flex flex-col overflow-hidden">
    <!-- Header -->
    <div class="border-b border-gray-200 dark:border-gray-800 px-6 py-3 shrink-0">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-base font-semibold">
            PACS
          </h1>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {{ pacsList?.length ?? 0 }} configured server{{ pacsList?.length !== 1 ? 's' : '' }}
          </p>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 min-h-0 overflow-y-auto">
      <div class="px-6 py-6">
        <!-- Empty state -->
        <div
          v-if="!pacsList || pacsList.length === 0"
          class="flex flex-col items-center justify-center py-24 text-center"
        >
          <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 mb-4">
            <UIcon name="i-lucide-search" class="w-6 h-6 text-gray-400" />
          </div>
          <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
            No PACS servers configured
          </p>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-xs">
            Add a <code class="font-mono">pacs</code> entry in your Nuxt config to connect remote PACS servers.
          </p>
          <pre class="mt-4 text-left text-xs bg-gray-100 dark:bg-gray-800 rounded-lg p-4 font-mono text-gray-600 dark:text-gray-300">pacs: [
  {
    name: 'orthanc',
    addr: '127.0.0.1:4242',
    calledAeTitle: 'ORTHANC',
  }
]</pre>
        </div>

        <!-- PACS list -->
        <div
          v-else
          class="flex flex-col gap-4"
        >
          <button
            v-for="pacs in pacsList"
            :key="pacs.name"
            type="button"
            class="w-full text-left bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-primary-300 dark:hover:border-primary-700 transition-all duration-150 p-4"
            @click="openPacs(pacs.name)"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-3 min-w-0">
                <!-- Icon -->
                <div class="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 bg-violet-50 dark:bg-violet-900/30">
                  <UIcon name="i-lucide-search" class="w-4 h-4 text-violet-600 dark:text-violet-400" />
                </div>
                <!-- Name + addr -->
                <div class="min-w-0">
                  <h3 class="font-semibold text-sm truncate">
                    {{ pacs.label }}
                  </h3>
                  <p class="text-xs text-gray-400 dark:text-gray-500 truncate font-mono mt-0.5">
                    {{ pacs.addr }}
                  </p>
                </div>
              </div>
              <!-- Badges -->
              <div class="flex items-center gap-1.5 shrink-0">
                <UBadge
                  v-if="pacs.calledAeTitle"
                  color="neutral"
                  variant="subtle"
                  size="xs"
                >
                  {{ pacs.calledAeTitle }}
                </UBadge>
                <UBadge
                  color="secondary"
                  variant="subtle"
                  size="xs"
                >
                  {{ pacs.queryModel }}
                </UBadge>
              </div>
            </div>
            <p
              v-if="pacs.description"
              class="text-xs text-gray-500 dark:text-gray-400 mt-2.5"
            >
              {{ pacs.description }}
            </p>
            <div class="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
              <span class="flex items-center gap-1">
                <UIcon name="i-lucide-fingerprint" class="w-3.5 h-3.5" />
                Calling as <span class="font-mono">{{ pacs.callingAeTitle }}</span>
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useFetch, useComponentRouter } from '#imports'

const componentRouter = useComponentRouter()

interface PacsInfo {
  name: string
  label: string
  description?: string
  addr: string
  calledAeTitle?: string
  callingAeTitle: string
  queryModel: string
}

const { data: pacsList } = await useFetch<PacsInfo[]>('/api/dicom/pacs')

function openPacs(name: string) {
  componentRouter.push(`/pacs/${name}`)
}
</script>
