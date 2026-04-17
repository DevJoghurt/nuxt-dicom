<template>
  <div class="overflow-x-auto">
    <table class="w-full text-xs">
      <thead>
        <tr class="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40">
          <th class="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
            Patient
          </th>
          <th class="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
            ID
          </th>
          <th class="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
            Birth date
          </th>
          <th class="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
            Sex
          </th>
          <th class="px-4 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
            Studies
          </th>
          <th class="px-4 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
            Series
          </th>
          <th class="px-4 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
            Instances
          </th>
          <th class="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
            Patient ID
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
        <tr
          v-for="(row, idx) in results"
          :key="row['PatientID'] ?? idx"
          class="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group/row"
        >
          <td class="px-4 py-2.5 font-mono font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">
            {{ row['PatientName'] || '—' }}
          </td>
          <td class="px-4 py-2.5 font-mono text-gray-500 dark:text-gray-400 whitespace-nowrap">
            <div class="flex items-center gap-1.5">
              <span>{{ row['PatientID'] || '—' }}</span>
              <UButton
                v-if="row['PatientID']"
                icon="i-lucide-copy"
                color="neutral"
                variant="ghost"
                size="xs"
                square
                class="opacity-0 group-hover/row:opacity-100 transition-opacity shrink-0"
                @click.stop="copyToClipboard(row['PatientID'])"
              />
            </div>
          </td>
          <td class="px-4 py-2.5 font-mono text-gray-600 dark:text-gray-300 whitespace-nowrap">
            {{ formatDate(row['PatientBirthDate']) }}
          </td>
          <td class="px-4 py-2.5 whitespace-nowrap">
            <UBadge
              v-if="row['PatientSex']"
              :color="sexColor(row['PatientSex'])"
              variant="subtle"
              size="xs"
            >
              {{ row['PatientSex'] }}
            </UBadge>
            <span
              v-else
              class="text-gray-400"
            >—</span>
          </td>
          <td class="px-4 py-2.5 text-right font-mono text-gray-600 dark:text-gray-300 whitespace-nowrap font-medium">
            {{ row['NumberOfPatientRelatedStudies'] || '—' }}
          </td>
          <td class="px-4 py-2.5 text-right font-mono text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {{ row['NumberOfPatientRelatedSeries'] || '—' }}
          </td>
          <td class="px-4 py-2.5 text-right font-mono text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {{ row['NumberOfPatientRelatedInstances'] || '—' }}
          </td>
          <!-- Repeat PatientID in last column for quick copy — UX pattern from HIS systems -->
          <td class="px-4 py-2.5 max-w-[160px]">
            <span
              class="font-mono text-gray-400 text-[10px] truncate block"
              :title="row['PatientID']"
            >{{ row['PatientID'] || '—' }}</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { useToast } from '#imports'

defineProps<{
  results: Array<Record<string, string>>
}>()

const toast = useToast()

function formatDate(dicomDate?: string): string {
  if (!dicomDate || dicomDate.length < 8) return dicomDate || '—'
  return `${dicomDate.slice(0, 4)}-${dicomDate.slice(4, 6)}-${dicomDate.slice(6, 8)}`
}

function sexColor(sex: string): 'info' | 'primary' | 'neutral' {
  if (sex === 'M') return 'info'
  if (sex === 'F') return 'primary'
  return 'neutral'
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(() => {
    toast.add({ title: 'Copied', description: text, icon: 'i-lucide-copy', color: 'success' })
  })
}
</script>
