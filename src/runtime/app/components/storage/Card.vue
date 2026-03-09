<template>
  <div
    class="group bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-primary-300 dark:hover:border-primary-700 transition-all duration-150 cursor-pointer"
    @click="$emit('click', storage)"
  >
    <div class="p-4">
      <!-- Header -->
      <div class="flex items-start justify-between gap-3 mb-3">
        <div class="flex items-center gap-3 min-w-0">
          <!-- Icon -->
          <div
            class="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
            :class="storage.storageBackend === 'S3' ? 'bg-sky-50 dark:bg-sky-900/30' : 'bg-primary-50 dark:bg-primary-900/30'"
          >
            <UIcon
              :name="storage.storageBackend === 'S3' ? 'i-lucide-cloud' : 'i-lucide-database'"
              class="w-4 h-4"
              :class="storage.storageBackend === 'S3' ? 'text-sky-600 dark:text-sky-400' : 'text-primary-600 dark:text-primary-400'"
            />
          </div>
          <!-- Name -->
          <div class="min-w-0">
            <h3 class="font-semibold text-sm truncate">
              {{ storage.name }}
            </h3>
            <p class="text-xs text-gray-400 dark:text-gray-500 truncate font-mono">
              {{ storage.outDir }}
            </p>
          </div>
        </div>
        <!-- Backend badge -->
        <UBadge
          :color="storage.storageBackend === 'S3' ? 'info' : 'primary'"
          variant="subtle"
          size="xs"
          class="shrink-0"
        >
          {{ storage.storageBackend }}
        </UBadge>
      </div>

      <!-- Meta row -->
      <div class="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        <span
          v-if="storage.autoDeleteAfterDays > 0"
          class="flex items-center gap-1"
        >
          <UIcon name="i-lucide-timer" class="w-3.5 h-3.5" />
          Auto-delete after {{ storage.autoDeleteAfterDays }}d
        </span>
        <span
          v-else
          class="flex items-center gap-1"
        >
          <UIcon name="i-lucide-infinity" class="w-3.5 h-3.5" />
          No auto-delete
        </span>
      </div>
    </div>

    <!-- Footer: used by -->
    <div class="border-t border-gray-100 dark:border-gray-800 px-4 py-2.5 flex items-center gap-2 flex-wrap">
      <span class="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-medium shrink-0">
        Used by
      </span>
      <template v-if="storage.usedBy.length > 0">
        <UBadge
          v-for="svc in storage.usedBy"
          :key="svc"
          color="neutral"
          variant="subtle"
          size="xs"
        >
          {{ svc }}
        </UBadge>
      </template>
      <span
        v-else
        class="text-xs text-gray-400 dark:text-gray-500 italic"
      >
        No services
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface StorageInfo {
  name: string
  storageBackend: 'Filesystem' | 'S3'
  outDir: string
  autoDeleteAfterDays: number
  storeWithFileMeta: boolean
  usedBy: string[]
  mountPoint: string
}

defineProps<{ storage: StorageInfo }>()
defineEmits<{ click: [storage: StorageInfo] }>()
</script>
