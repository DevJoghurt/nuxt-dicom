<template>
  <div class="h-full flex flex-col overflow-hidden">
    <!-- Header -->
    <div class="border-b border-gray-200 dark:border-gray-800 px-6 py-3 shrink-0">
      <div class="flex items-center gap-3">
        <UButton
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="ghost"
          size="sm"
          square
          @click="goBack"
        />
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="flex items-center justify-center w-7 h-7 rounded-lg shrink-0 bg-violet-50 dark:bg-violet-900/30">
            <UIcon name="i-lucide-search" class="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
          </div>
          <div class="min-w-0">
            <h1 class="text-base font-semibold truncate">
              {{ pacs?.label ?? pacsName }}
            </h1>
            <p
              v-if="pacs"
              class="text-xs text-gray-500 dark:text-gray-400 font-mono truncate mt-0.5"
            >
              {{ pacs.addr }}
            </p>
          </div>
          <UBadge
            v-if="pacs?.calledAeTitle"
            color="neutral"
            variant="subtle"
            size="xs"
            class="shrink-0"
          >
            {{ pacs.calledAeTitle }}
          </UBadge>
        </div>
        <!-- Stats in header -->
        <div
          v-if="lastQueryStats"
          class="ml-auto text-xs text-gray-400 shrink-0"
        >
          {{ lastQueryStats.total }} result{{ lastQueryStats.total !== 1 ? 's' : '' }}
          <span class="opacity-50">· {{ lastQueryStats.duration.toFixed(2) }}s</span>
        </div>
      </div>
    </div>

    <!-- Not found -->
    <div
      v-if="!pacs"
      class="flex-1 flex items-center justify-center"
    >
      <div class="text-center">
        <UIcon name="i-lucide-alert-circle" class="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p class="text-sm text-gray-500">
          PACS server not found
        </p>
      </div>
    </div>

    <!-- Main content -->
    <div
      v-else
      class="flex-1 min-h-0 overflow-y-auto"
    >
      <!-- ── Search area — full width, no border card ─────────────────────── -->
      <div class="bg-gray-50/60 dark:bg-gray-900/40 border-b border-gray-100 dark:border-gray-800 px-6 py-4 space-y-3">
        <!-- Primary row -->
        <div class="flex items-center gap-2">
          <UInput
            v-model="form.patientName"
            placeholder="Search by patient name — e.g. DOE^JOHN or DOE^*"
            icon="i-lucide-user"
            size="md"
            class="flex-1"
            :ui="{ base: 'font-mono' }"
            @keydown.enter="runQuery"
          />

          <!-- Query model toggle -->
          <div class="flex items-center rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden shrink-0">
            <button
              v-for="model in queryModels"
              :key="model.value"
              class="px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap border-r last:border-r-0 border-gray-200 dark:border-gray-700"
              :class="selectedQueryModel === model.value
                ? 'bg-primary-500 text-white'
                : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'"
              @click="selectedQueryModel = model.value"
            >
              {{ model.label }}
            </button>
          </div>

          <UButton
            label="Search"
            icon="i-lucide-search"
            color="primary"
            size="md"
            :loading="isQuerying"
            @click="runQuery"
          />
          <UTooltip :text="showAdvanced ? 'Hide filters' : 'More filters'">
            <UButton
              :icon="showAdvanced ? 'i-lucide-chevron-up' : 'i-lucide-sliders-horizontal'"
              :color="hasActiveFilters && !showAdvanced ? 'primary' : 'neutral'"
              :variant="hasActiveFilters && !showAdvanced ? 'subtle' : 'ghost'"
              size="md"
              square
              @click="showAdvanced = !showAdvanced"
            />
          </UTooltip>
          <UTooltip text="Clear all filters">
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              size="md"
              square
              :disabled="!hasActiveFilters && !form.patientName"
              @click="clearForm"
            />
          </UTooltip>
        </div>

        <!-- Active filter pills (only shown when advanced is collapsed) -->
        <Transition
          enter-active-class="transition-all duration-150 ease-out"
          enter-from-class="opacity-0 -translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition-all duration-100 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-1"
        >
          <div
            v-if="!showAdvanced && activeFilterPills.length > 0"
            class="flex flex-wrap gap-1.5"
          >
            <button
              v-for="pill in activeFilterPills"
              :key="pill.key"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-800/50 transition-colors"
              @click="clearFilter(pill.key)"
            >
              <span class="opacity-60 text-[10px]">{{ pill.label.split(':')[0] }}:</span>
              {{ pill.label.split(':').slice(1).join(':').trim() }}
              <UIcon name="i-lucide-x" class="w-3 h-3 opacity-50 ml-0.5" />
            </button>
          </div>
        </Transition>

        <!-- Advanced filters -->
        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 -translate-y-2"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-2"
        >
          <div
            v-if="showAdvanced"
            class="pt-1"
          >
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-4 items-start">
              <!-- Patient ID -->
              <div>
                <label class="block text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">
                  Patient ID
                </label>
                <UInput
                  v-model="form.patientId"
                  placeholder="PAT12345"
                  size="sm"
                  :ui="{ base: 'font-mono' }"
                  @keydown.enter="runQuery"
                />
              </div>

              <!-- Birth date -->
              <div>
                <label class="block text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">
                  Birth date
                </label>
                <div class="flex items-center gap-1">
                  <UInput
                    v-model="form.patientBirthDateFrom"
                    type="date"
                    size="sm"
                    class="flex-1 min-w-0"
                    @keydown.enter="runQuery"
                  />
                  <span class="text-[10px] text-gray-300 dark:text-gray-600 shrink-0 px-0.5">—</span>
                  <UInput
                    v-model="form.patientBirthDateTo"
                    type="date"
                    size="sm"
                    class="flex-1 min-w-0"
                    @keydown.enter="runQuery"
                  />
                </div>
              </div>

              <!-- Study date -->
              <div>
                <label class="block text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">
                  Study date
                </label>
                <div class="flex items-center gap-1">
                  <UInput
                    v-model="form.studyDateFrom"
                    type="date"
                    size="sm"
                    class="flex-1 min-w-0"
                    @keydown.enter="runQuery"
                  />
                  <span class="text-[10px] text-gray-300 dark:text-gray-600 shrink-0 px-0.5">—</span>
                  <UInput
                    v-model="form.studyDateTo"
                    type="date"
                    size="sm"
                    class="flex-1 min-w-0"
                    @keydown.enter="runQuery"
                  />
                </div>
              </div>

              <!-- Modality -->
              <div>
                <label class="block text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">
                  Modality
                </label>
                <UInput
                  v-model="form.modality"
                  placeholder="CT, MR, US…"
                  size="sm"
                  :ui="{ base: 'font-mono' }"
                  @keydown.enter="runQuery"
                />
                <div class="flex gap-1 mt-1.5">
                  <button
                    v-for="m in quickModalities"
                    :key="m"
                    class="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors"
                    :class="form.modality === m
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'"
                    @click="form.modality = form.modality === m ? '' : m"
                  >
                    {{ m }}
                  </button>
                </div>
              </div>

              <!-- Accession number -->
              <div>
                <label class="block text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">
                  Accession
                </label>
                <UInput
                  v-model="form.accessionNumber"
                  placeholder="ACC-2024-0001"
                  size="sm"
                  :ui="{ base: 'font-mono' }"
                  @keydown.enter="runQuery"
                />
              </div>

              <!-- Study description — spans remaining 3 columns -->
              <div class="lg:col-span-3">
                <label class="block text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">
                  Description
                  <span class="normal-case font-normal opacity-60 tracking-normal">— wildcards ok, e.g. *Abdomen*</span>
                </label>
                <UInput
                  v-model="form.studyDescription"
                  placeholder="*CT Abdomen*"
                  size="sm"
                  :ui="{ base: 'font-mono' }"
                  @keydown.enter="runQuery"
                />
              </div>
            </div>

            <!-- Hint row -->
            <p class="mt-3 text-[11px] text-gray-400 dark:text-gray-600 font-mono">
              Wildcards: <span class="text-gray-500 dark:text-gray-400">*</span> = any chars &nbsp;·&nbsp;
              <span class="text-gray-500 dark:text-gray-400">?</span> = one char
            </p>
          </div>
        </Transition>
      </div>

      <div class="px-6 py-5 flex flex-col gap-5">
        <!-- ── Error ──────────────────────────────────────────────────────── -->
        <div
          v-if="queryError"
          class="flex items-start gap-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3"
        >
          <UIcon name="i-lucide-alert-circle" class="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p class="text-sm font-medium text-red-700 dark:text-red-300">
              Query failed
            </p>
            <p class="text-xs text-red-600 dark:text-red-400 mt-0.5 font-mono">
              {{ queryError }}
            </p>
          </div>
        </div>

        <!-- ── Empty state (no query yet) ───────────────────────────────── -->
        <div
          v-if="results === null && !queryError"
          class="flex flex-col items-center justify-center py-16 text-center"
        >
          <div class="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
            <UIcon name="i-lucide-search" class="w-5 h-5 text-gray-400" />
          </div>
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">
            Ready to query
          </p>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-xs">
            Enter a patient name or open the filter panel to refine your search, then press Search.
          </p>
        </div>

        <!-- ── Results ────────────────────────────────────────────────────── -->
        <div
          v-if="results !== null"
          class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden"
        >
          <div class="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-gray-800">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-table" class="w-4 h-4 text-gray-400" />
              <span class="text-sm font-medium">Results</span>
              <UBadge
                v-if="results.length > 0"
                color="neutral"
                variant="subtle"
                size="xs"
              >
                {{ results.length }}
              </UBadge>
            </div>
            <span class="text-xs text-gray-400 font-mono">{{ selectedQueryModel }}</span>
          </div>

          <!-- Empty results -->
          <div
            v-if="results.length === 0"
            class="flex flex-col items-center justify-center py-12 text-center"
          >
            <UIcon name="i-lucide-inbox" class="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p class="text-sm text-gray-400">
              No matching studies found
            </p>
            <p class="text-xs text-gray-400 mt-1">
              Try broadening your search criteria or using wildcards (*)
            </p>
          </div>

          <!-- PatientRoot results -->
          <PatientResultsTable
            v-else-if="selectedQueryModel === 'PatientRoot'"
            :results="results"
          />

          <!-- StudyRoot / ModalityWorklist results -->
          <StudyResultsTable
            v-else
            :results="results"
            :pacs-name="pacsName"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, useFetch, useComponentRouter } from '#imports'
import PatientResultsTable from '../../components/pacs/PatientResultsTable.vue'
import StudyResultsTable from '../../components/pacs/StudyResultsTable.vue'

const componentRouter = useComponentRouter()

const pacsName = computed(() => componentRouter.route.value.params.name as string)

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
const pacs = computed(() => pacsList.value?.find(p => p.name === pacsName.value) ?? null)

// ── Query model ────────────────────────────────────────────────────────────
type QueryModel = 'PatientRoot' | 'StudyRoot' | 'ModalityWorklist'

const queryModels: Array<{ value: QueryModel, label: string }> = [
  { value: 'PatientRoot', label: 'Patient' },
  { value: 'StudyRoot', label: 'Study' },
  { value: 'ModalityWorklist', label: 'MWL' },
]

// Initialize from PACS config, but allow the user to override per-query
const selectedQueryModel = ref<QueryModel>('PatientRoot')
watch(pacs, (p) => {
  if (p?.queryModel) selectedQueryModel.value = p.queryModel as QueryModel
}, { immediate: true })

// ── Form state ─────────────────────────────────────────────────────────────
const form = ref({
  patientName: '',
  patientId: '',
  patientBirthDateFrom: '',
  patientBirthDateTo: '',
  studyDateFrom: '',
  studyDateTo: '',
  modality: '',
  studyDescription: '',
  accessionNumber: '',
})

const quickModalities = ['CT', 'MR', 'US', 'CR', 'DX', 'PT']

const showAdvanced = ref(false)
const isQuerying = ref(false)
const queryError = ref<string | null>(null)
const results = ref<Array<Record<string, string>> | null>(null)
const lastQueryStats = ref<{ total: number, duration: number } | null>(null)

// ── Filter helpers ─────────────────────────────────────────────────────────
const hasActiveFilters = computed(() =>
  !!(form.value.patientId
    || form.value.patientBirthDateFrom
    || form.value.patientBirthDateTo
    || form.value.studyDateFrom
    || form.value.studyDateTo
    || form.value.modality
    || form.value.studyDescription
    || form.value.accessionNumber),
)

interface FilterPill { key: keyof typeof form.value, label: string }
const activeFilterPills = computed<FilterPill[]>(() => {
  const pills: FilterPill[] = []
  if (form.value.patientId) pills.push({ key: 'patientId', label: `ID: ${form.value.patientId}` })
  if (form.value.patientBirthDateFrom || form.value.patientBirthDateTo) {
    const from = form.value.patientBirthDateFrom || '…'
    const to = form.value.patientBirthDateTo || '…'
    pills.push({ key: 'patientBirthDateFrom', label: `Born: ${from} → ${to}` })
  }
  if (form.value.modality) pills.push({ key: 'modality', label: `Mod: ${form.value.modality}` })
  if (form.value.studyDateFrom || form.value.studyDateTo) {
    const from = form.value.studyDateFrom || '…'
    const to = form.value.studyDateTo || '…'
    pills.push({ key: 'studyDateFrom', label: `Study: ${from} → ${to}` })
  }
  if (form.value.accessionNumber) pills.push({ key: 'accessionNumber', label: `Acc: ${form.value.accessionNumber}` })
  if (form.value.studyDescription) pills.push({ key: 'studyDescription', label: `Desc: ${form.value.studyDescription}` })
  return pills
})

function clearFilter(key: keyof typeof form.value) {
  if (key === 'studyDateFrom') {
    form.value.studyDateFrom = ''
    form.value.studyDateTo = ''
  }
  else if (key === 'patientBirthDateFrom') {
    form.value.patientBirthDateFrom = ''
    form.value.patientBirthDateTo = ''
  }
  else {
    form.value[key] = ''
  }
}

function clearForm() {
  form.value = {
    patientName: '',
    patientId: '',
    patientBirthDateFrom: '',
    patientBirthDateTo: '',
    studyDateFrom: '',
    studyDateTo: '',
    modality: '',
    studyDescription: '',
    accessionNumber: '',
  }
}

async function runQuery() {
  if (!pacs.value) return
  isQuerying.value = true
  queryError.value = null

  try {
    const todicom = (d: string) => d.replaceAll('-', '')

    const body: Record<string, string> = {}
    if (form.value.patientName) body.patientName = form.value.patientName
    if (form.value.patientId) body.patientId = form.value.patientId
    if (form.value.patientBirthDateFrom) body.patientBirthDateFrom = todicom(form.value.patientBirthDateFrom)
    if (form.value.patientBirthDateTo) body.patientBirthDateTo = todicom(form.value.patientBirthDateTo)
    if (form.value.studyDateFrom) body.studyDateFrom = todicom(form.value.studyDateFrom)
    if (form.value.studyDateTo) body.studyDateTo = todicom(form.value.studyDateTo)
    if (form.value.modality) body.modality = form.value.modality
    if (form.value.studyDescription) body.studyDescription = form.value.studyDescription
    if (form.value.accessionNumber) body.accessionNumber = form.value.accessionNumber
    body.queryModel = selectedQueryModel.value

    const data = await $fetch<{
      results: Array<Record<string, string>>
      totalResults: number
      durationSeconds: number
    }>(`/api/dicom/pacs/${encodeURIComponent(pacsName.value)}/find`, {
      method: 'POST',
      body,
    })

    results.value = data.results
    lastQueryStats.value = { total: data.totalResults, duration: data.durationSeconds }
  }
  catch (err) {
    queryError.value = err instanceof Error ? err.message : String(err)
    results.value = []
  }
  finally {
    isQuerying.value = false
  }
}

function goBack() {
  componentRouter.push('/pacs')
}
</script>
