<template>
  <div class="px-5 py-4">
    <div class="flex items-center gap-2 mb-3">
      <UIcon :name="icon" class="w-3.5 h-3.5 text-gray-400 shrink-0" />
      <h4 class="text-[11px] font-semibold tracking-widest uppercase text-gray-400 dark:text-gray-500">
        {{ label }}
      </h4>
    </div>
    <dl class="space-y-2">
      <div
        v-for="row in rows"
        :key="row.key"
        class="flex items-start justify-between gap-3 min-w-0"
      >
        <dt class="text-xs text-gray-500 dark:text-gray-400 shrink-0 pt-px">
          {{ row.key }}
        </dt>
        <dd
          class="text-xs font-mono text-gray-800 dark:text-gray-200 text-right break-all"
          :title="row.value"
        >
          {{ row.value }}
        </dd>
      </div>
    </dl>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  icon: string
  rows: Array<{ key: string, value: string }>
}>()
</script>
