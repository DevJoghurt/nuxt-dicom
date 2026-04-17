<template>
  <!-- Trigger button -->
  <button
    class="group relative flex items-center gap-2.5 w-full rounded-lg px-3 py-2 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800/60"
    :class="hasFailed ? 'text-red-500 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'"
    @click="open = true"
  >
    <!-- Animated icon -->
    <div class="relative shrink-0 flex items-center justify-center w-4 h-4">
      <UIcon
        v-if="hasRunning"
        name="i-lucide-loader-2"
        class="w-4 h-4 animate-spin text-primary-500"
      />
      <UIcon
        v-else-if="hasFailed"
        name="i-lucide-triangle-alert"
        class="w-4 h-4 text-red-500"
      />
      <UIcon
        v-else
        name="i-lucide-activity"
        class="w-4 h-4"
      />

      <!-- Active count badge -->
      <span
        v-if="activeCount > 0"
        class="absolute -top-2 -right-2 min-w-[16px] h-4 px-0.5 flex items-center justify-center rounded-full text-[10px] font-bold bg-primary-500 text-white leading-none select-none"
      >
        {{ activeCount > 9 ? '9+' : activeCount }}
      </span>
    </div>

    <span class="flex-1 text-left font-medium">Tasks</span>

    <!-- Pulsing live dot when jobs are running -->
    <span
      v-if="hasRunning"
      class="relative flex h-2 w-2 shrink-0"
    >
      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75" />
      <span class="relative inline-flex h-2 w-2 rounded-full bg-primary-500" />
    </span>
  </button>

  <!-- Slideover (rendered here so it's always in the DOM) -->
  <DicomJobsTasksSlideover v-model:open="open" />
</template>

<script setup lang="ts">
import { ref } from '#imports'
import { useJobs } from '../../composables/useJobs'
import DicomJobsTasksSlideover from './TasksSlideover.vue'

const open = ref(false)
const { activeCount, hasRunning, hasFailed } = useJobs()
</script>
