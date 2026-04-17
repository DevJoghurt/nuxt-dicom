<template>
  <div
    class="relative rounded-xl border bg-white dark:bg-gray-900/60 overflow-hidden transition-all"
    :class="{
      'border-primary-200 dark:border-primary-800/60': job.status === 'running',
      'border-yellow-200 dark:border-yellow-800/40': job.status === 'queued',
      'border-red-200 dark:border-red-800/40': job.status === 'failed',
      'border-gray-200 dark:border-gray-800': job.status === 'completed',
    }"
  >
    <!-- Running: top accent bar -->
    <div
      v-if="job.status === 'running'"
      class="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600"
    />

    <div class="p-4">
      <!-- Row 1: icon + label + badges -->
      <div class="flex items-start gap-3">
        <!-- Status icon -->
        <div
          class="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 mt-0.5"
          :class="{
            'bg-primary-50 dark:bg-primary-900/30': job.status === 'running',
            'bg-yellow-50 dark:bg-yellow-900/30': job.status === 'queued',
            'bg-red-50 dark:bg-red-900/20': job.status === 'failed',
            'bg-green-50 dark:bg-green-900/20': job.status === 'completed',
          }"
        >
          <UIcon
            v-if="job.status === 'running'"
            name="i-lucide-loader-2"
            class="w-4 h-4 text-primary-600 dark:text-primary-400 animate-spin"
          />
          <UIcon
            v-else-if="job.status === 'queued'"
            name="i-lucide-clock-4"
            class="w-4 h-4 text-yellow-600 dark:text-yellow-400"
          />
          <UIcon
            v-else-if="job.status === 'failed'"
            name="i-lucide-x-circle"
            class="w-4 h-4 text-red-600 dark:text-red-400"
          />
          <UIcon
            v-else
            name="i-lucide-check-circle"
            class="w-4 h-4 text-green-600 dark:text-green-400"
          />
        </div>

        <!-- Details -->
        <div class="flex-1 min-w-0">
          <!-- Job label + status badge -->
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <span class="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
              {{ job.label }}
            </span>
            <div class="flex items-center gap-1.5 shrink-0">
              <!-- Protocol badge -->
              <UBadge
                v-if="job.protocol"
                :color="job.protocol === 'dicomweb' ? 'info' : 'primary'"
                variant="subtle"
                size="xs"
              >
                {{ job.protocol === 'dicomweb' ? 'STOW-RS' : 'DIMSE' }}
              </UBadge>
              <!-- Status badge -->
              <UBadge
                :color="statusColor"
                variant="subtle"
                size="xs"
              >
                {{ statusLabel }}
              </UBadge>
            </div>
          </div>

          <!-- Target address -->
          <p
            v-if="job.targetAddr"
            class="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5 truncate"
          >
            {{ job.targetAddr }}
          </p>
        </div>
      </div>

      <!-- Progress section (only when total > 0) -->
      <div
        v-if="job.progress && job.progress.total > 0"
        class="mt-4 space-y-1.5"
      >
        <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>
            <span class="font-semibold text-gray-900 dark:text-gray-100">{{ job.progress.sent }}</span>
            / {{ job.progress.total }} sent
            <template v-if="job.progress.failed > 0">
              <span class="text-red-500 dark:text-red-400 ml-1">· {{ job.progress.failed }} failed</span>
            </template>
          </span>
          <span class="tabular-nums">{{ percent }}%</span>
        </div>
        <UProgress
          :model-value="percent > 0 ? percent : undefined"
          :max="100"
          size="sm"
          :color="progressColor"
        />
      </div>

      <!-- Footer row: elapsed time + result count -->
      <div class="flex items-center justify-between mt-3">
        <div class="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
          <UIcon name="i-lucide-timer" class="w-3 h-3 shrink-0" />
          <span class="tabular-nums">{{ elapsed }}</span>
        </div>
        <span
          v-if="job.status === 'completed' && job.results"
          class="text-xs text-green-600 dark:text-green-400"
        >
          {{ job.results.length }} file{{ job.results.length !== 1 ? 's' : '' }} transferred
        </span>
      </div>

      <!-- Error message -->
      <div
        v-if="job.status === 'failed' && job.error"
        class="mt-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 px-3 py-2"
      >
        <p class="text-xs font-mono text-red-700 dark:text-red-400 break-all leading-relaxed">
          {{ job.error }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from '#imports'
import type { DicomJob } from '../../composables/useJobs'

const props = defineProps<{
  job: DicomJob
  elapsed: string
  percent: number
  /** Tick counter — passed in so computed elapsed values re-evaluate each second */
  tick: number
}>()

const statusLabel = computed(() => {
  switch (props.job.status) {
    case 'running': return 'Running'
    case 'queued': return 'Queued'
    case 'failed': return 'Failed'
    case 'completed': return 'Done'
    case 'cancelled': return 'Cancelled'
    default: return props.job.status
  }
})

const statusColor = computed(() => {
  switch (props.job.status) {
    case 'running': return 'primary' as const
    case 'queued': return 'warning' as const
    case 'failed': return 'error' as const
    case 'completed': return 'success' as const
    default: return 'neutral' as const
  }
})

const progressColor = computed(() => {
  if (props.job.status === 'failed') return 'error' as const
  if (props.job.status === 'completed') return 'success' as const
  if (props.job.progress && props.job.progress.failed > 0) return 'warning' as const
  return 'primary' as const
})
</script>
