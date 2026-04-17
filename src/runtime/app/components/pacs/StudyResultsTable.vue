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
            Study date
          </th>
          <th class="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
            Modality
          </th>
          <th class="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
            Description
          </th>
          <th class="px-4 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
            Series
          </th>
          <th class="px-4 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
            Instances
          </th>
          <th class="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
            Study UID
          </th>
          <th v-if="pacsName" class="px-4 py-2.5" />
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
        <tr
          v-for="(row, idx) in results"
          :key="row['StudyInstanceUID'] ?? idx"
          class="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group/row"
        >
          <td class="px-4 py-2.5 font-mono text-gray-800 dark:text-gray-200 whitespace-nowrap">
            {{ row['PatientName'] || '—' }}
          </td>
          <td class="px-4 py-2.5 font-mono text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {{ row['PatientID'] || '—' }}
          </td>
          <td class="px-4 py-2.5 font-mono text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {{ formatDate(row['PatientBirthDate']) }}
          </td>
          <td class="px-4 py-2.5 font-mono text-gray-600 dark:text-gray-300 whitespace-nowrap">
            {{ formatDate(row['StudyDate']) }}
          </td>
          <td class="px-4 py-2.5 whitespace-nowrap">
            <UBadge
              v-if="row['ModalitiesInStudy']"
              color="neutral"
              variant="subtle"
              size="xs"
            >
              {{ row['ModalitiesInStudy'] }}
            </UBadge>
            <span
              v-else
              class="text-gray-400"
            >—</span>
          </td>
          <td class="px-4 py-2.5 text-gray-600 dark:text-gray-400 max-w-xs truncate">
            {{ row['StudyDescription'] || '—' }}
          </td>
          <td class="px-4 py-2.5 text-right font-mono text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {{ row['NumberOfStudyRelatedSeries'] || '—' }}
          </td>
          <td class="px-4 py-2.5 text-right font-mono text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {{ row['NumberOfStudyRelatedInstances'] || '—' }}
          </td>
          <td class="px-4 py-2.5 max-w-[200px]">
            <div class="flex items-center gap-1.5">
              <span
                class="font-mono text-gray-400 truncate text-[10px]"
                :title="row['StudyInstanceUID']"
              >{{ row['StudyInstanceUID'] ? truncateUid(row['StudyInstanceUID']) : '—' }}</span>
              <UButton
                v-if="row['StudyInstanceUID']"
                icon="i-lucide-copy"
                color="neutral"
                variant="ghost"
                size="xs"
                square
                class="opacity-0 group-hover/row:opacity-100 transition-opacity shrink-0"
                @click.stop="copyToClipboard(row['StudyInstanceUID'])"
              />
            </div>
          </td>
          <td v-if="pacsName" class="px-2 py-2.5 whitespace-nowrap">
            <PacsRetrieveButton
              v-if="row['StudyInstanceUID']"
              :pacs-name="pacsName"
              :study-uid="row['StudyInstanceUID']"
              class="opacity-0 group-hover/row:opacity-100 transition-opacity"
              title="Retrieve study"
            />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { useToast } from '#imports'
import PacsRetrieveButton from './PacsRetrieveButton.vue'

defineProps<{
  results: Array<Record<string, string>>
  /** When provided, a retrieve action button is shown per row */
  pacsName?: string
}>()

const toast = useToast()

function formatDate(dicomDate?: string): string {
  if (!dicomDate || dicomDate.length < 8) return dicomDate || '—'
  return `${dicomDate.slice(0, 4)}-${dicomDate.slice(4, 6)}-${dicomDate.slice(6, 8)}`
}

function truncateUid(uid: string): string {
  if (uid.length <= 24) return uid
  return `${uid.slice(0, 10)}…${uid.slice(-10)}`
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(() => {
    toast.add({ title: 'Copied', description: text, icon: 'i-lucide-copy', color: 'success' })
  })
}
</script>
