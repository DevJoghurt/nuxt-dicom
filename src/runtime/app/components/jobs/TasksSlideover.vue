<template>
  <USlideover
    :open="open"
    side="right"
    :ui="{ content: 'max-w-[480px]' }"
    @update:open="$emit('update:open', $event)"
  >
    <!-- Header -->
    <template #header>
      <div class="flex items-center gap-3 w-full">
        <!-- Icon + title -->
        <div class="flex items-center justify-center w-7 h-7 rounded-lg bg-primary-50 dark:bg-primary-900/30 shrink-0">
          <UIcon
            :name="hasRunning ? 'i-lucide-loader-2' : 'i-lucide-activity'"
            :class="['w-3.5 h-3.5 text-primary-600 dark:text-primary-400', hasRunning && 'animate-spin']"
          />
        </div>
        <div class="min-w-0">
          <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-none">
            Background Tasks
          </h2>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            <template v-if="activeCount > 0">
              {{ activeCount }} active task{{ activeCount !== 1 ? 's' : '' }}
            </template>
            <template v-else>
              No active tasks
            </template>
          </p>
        </div>

        <!-- Live indicator -->
        <div class="flex items-center gap-1.5 ml-auto text-xs">
          <div
            :class="[
              'w-1.5 h-1.5 rounded-full shrink-0 transition-colors',
              isConnected ? 'bg-green-400' : 'bg-gray-300 dark:bg-gray-600',
            ]"
          />
          <span class="text-gray-400 dark:text-gray-500">{{ isConnected ? 'Live' : 'Reconnecting…' }}</span>
        </div>
      </div>
    </template>

    <!-- Body -->
    <template #body>
      <div class="py-5 space-y-7">
        <!-- ── Active (running + queued) ──────────────────────────────────── -->
        <section v-if="runningJobs.length > 0 || queuedJobs.length > 0">
          <div class="flex items-center gap-2 px-5 mb-3">
            <h3 class="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              Active
            </h3>
            <span class="inline-flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/40 text-[10px] font-bold text-primary-600 dark:text-primary-400">
              {{ activeCount }}
            </span>
          </div>
          <div class="px-5 space-y-3">
            <DicomJobsJobCard
              v-for="job in [...runningJobs, ...queuedJobs]"
              :key="job.id"
              :job="job"
              :elapsed="elapsedLabel(job)"
              :percent="progressPercent(job)"
              :tick="tick"
            />
          </div>
        </section>

        <!-- ── Failed ─────────────────────────────────────────────────────── -->
        <section v-if="failedJobs.length > 0">
          <div class="flex items-center gap-2 px-5 mb-3">
            <h3 class="text-[11px] font-semibold uppercase tracking-widest text-red-500 dark:text-red-400">
              Failed
            </h3>
            <span class="inline-flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 text-[10px] font-bold text-red-600 dark:text-red-400">
              {{ failedJobs.length }}
            </span>
          </div>
          <div class="px-5 space-y-3">
            <DicomJobsJobCard
              v-for="job in failedJobs"
              :key="job.id"
              :job="job"
              :elapsed="elapsedLabel(job)"
              :percent="progressPercent(job)"
              :tick="0"
            />
          </div>
        </section>

        <!-- ── Completed ───────────────────────────────────────────────────── -->
        <section v-if="completedJobs.length > 0">
          <div class="flex items-center justify-between px-5 mb-3">
            <h3 class="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              Completed
            </h3>
            <UButton
              label="Clear all"
              color="neutral"
              variant="ghost"
              size="xs"
              icon="i-lucide-trash-2"
              @click="clearCompleted"
            />
          </div>
          <div class="px-5 space-y-3">
            <DicomJobsJobCard
              v-for="job in completedJobs"
              :key="job.id"
              :job="job"
              :elapsed="elapsedLabel(job)"
              :percent="progressPercent(job)"
              :tick="0"
            />
          </div>
        </section>

        <!-- ── Empty state ─────────────────────────────────────────────────── -->
        <div
          v-if="jobs.length === 0"
          class="flex flex-col items-center justify-center py-20 px-5 text-center"
        >
          <div class="flex items-center justify-center w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800/80 mb-5">
            <UIcon name="i-lucide-inbox" class="w-7 h-7 text-gray-400 dark:text-gray-500" />
          </div>
          <p class="text-sm font-semibold text-gray-700 dark:text-gray-300">
            No background tasks
          </p>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-[240px] leading-relaxed">
            C-STORE transfers and similar long-running operations will appear here in real time.
          </p>
        </div>
      </div>
    </template>
  </USlideover>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from '#imports'
import { useJobs, progressPercent, elapsedLabel } from '../../composables/useJobs'

defineProps<{ open: boolean }>()
defineEmits<{ 'update:open': [boolean] }>()

const {
  jobs,
  runningJobs,
  queuedJobs,
  completedJobs,
  failedJobs,
  activeCount,
  hasRunning,
  isConnected,
  clearCompleted,
} = useJobs()

// Tick every second so elapsed labels on running jobs stay current
const tick = ref(0)
let _timer: ReturnType<typeof setInterval> | null = null

onMounted(() => { _timer = setInterval(() => tick.value++, 1000) })
onBeforeUnmount(() => { if (_timer) clearInterval(_timer) })
</script>
