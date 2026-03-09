<template>
  <div class="h-full overflow-y-auto">
    <!-- Summary header -->
    <div class="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-5 py-4">
      <div class="flex items-start gap-4">
        <!-- Modality badge -->
        <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-900/30 shrink-0">
          <span class="text-lg font-bold text-primary-600 dark:text-primary-400 font-mono leading-none">
            {{ tags.Modality || '?' }}
          </span>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
            {{ formatPatientName(tags.PatientName) || fileName }}
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
            {{ tags.StudyDescription || tags.SeriesDescription || 'No description' }}
          </p>
          <div class="flex flex-wrap gap-2 mt-2">
            <UBadge v-if="tags.StudyDate" color="neutral" variant="subtle" size="xs">
              {{ formatDate(tags.StudyDate) }}
            </UBadge>
            <UBadge v-if="tags.PatientSex" color="neutral" variant="subtle" size="xs">
              {{ formatSex(tags.PatientSex) }}
            </UBadge>
            <UBadge v-if="tags.PatientAge" color="neutral" variant="subtle" size="xs">
              {{ formatAge(tags.PatientAge) }}
            </UBadge>
            <UBadge v-if="tags.InstitutionName" color="neutral" variant="subtle" size="xs">
              {{ tags.InstitutionName }}
            </UBadge>
          </div>
        </div>
        <!-- File info -->
        <div class="text-right shrink-0">
          <p class="text-xs text-gray-400 font-mono truncate max-w-36">
            {{ fileName }}
          </p>
          <p class="text-xs text-gray-400 mt-0.5">
            {{ formatSize(size) }}
          </p>
        </div>
      </div>
    </div>

    <!-- Tag sections -->
    <div class="divide-y divide-gray-100 dark:divide-gray-800">
      <DicomTagSection
        v-for="section in visibleSections"
        :key="section.label"
        :label="section.label"
        :icon="section.icon"
        :rows="section.rows"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from '#imports'
import DicomTagSection from './DicomTagSection.vue'

const props = defineProps<{
  tags: Record<string, string>
  fileName: string
  size: number
}>()

// ── Tag group definitions ─────────────────────────────────────────────────────

const TAG_GROUPS = [
  {
    label: 'Patient',
    icon: 'i-lucide-user',
    keys: ['PatientName', 'PatientID', 'PatientBirthDate', 'PatientSex', 'PatientAge', 'PatientWeight', 'PatientSize'],
  },
  {
    label: 'Study',
    icon: 'i-lucide-folder-open',
    keys: ['StudyInstanceUID', 'StudyDate', 'StudyTime', 'StudyDescription', 'StudyID', 'AccessionNumber', 'ReferringPhysicianName'],
  },
  {
    label: 'Series',
    icon: 'i-lucide-layers',
    keys: ['SeriesInstanceUID', 'SeriesNumber', 'SeriesDescription', 'SeriesDate', 'SeriesTime', 'Modality', 'BodyPartExamined', 'ProtocolName'],
  },
  {
    label: 'Instance',
    icon: 'i-lucide-file-image',
    keys: ['SOPInstanceUID', 'SOPClassUID', 'InstanceNumber', 'InstanceCreationDate', 'InstanceCreationTime'],
  },
  {
    label: 'Image',
    icon: 'i-lucide-scan',
    keys: ['Rows', 'Columns', 'BitsAllocated', 'BitsStored', 'HighBit', 'PixelRepresentation', 'SamplesPerPixel', 'PhotometricInterpretation', 'PixelSpacing'],
  },
  {
    label: 'Equipment',
    icon: 'i-lucide-cpu',
    keys: ['Manufacturer', 'ManufacturerModelName', 'DeviceSerialNumber', 'SoftwareVersions', 'InstitutionName', 'StationName'],
  },
  // Modality-specific
  {
    label: 'CT Parameters',
    icon: 'i-lucide-activity',
    keys: ['KVP', 'ExposureTime', 'XRayTubeCurrent', 'Exposure', 'ConvolutionKernel', 'SliceThickness', 'SliceLocation', 'DataCollectionDiameter', 'ReconstructionDiameter'],
    modalityFilter: ['CT'],
  },
  {
    label: 'MR Parameters',
    icon: 'i-lucide-zap',
    keys: ['RepetitionTime', 'EchoTime', 'MagneticFieldStrength', 'FlipAngle', 'ImagingFrequency', 'ScanningSequence'],
    modalityFilter: ['MR'],
  },
  {
    label: 'Ultrasound Parameters',
    icon: 'i-lucide-radio',
    keys: ['TransducerType', 'TransducerFrequency', 'UltrasoundColorDataPresent', 'FrameTime', 'HeartRate'],
    modalityFilter: ['US'],
  },
  {
    label: 'PET / Nuclear Medicine',
    icon: 'i-lucide-atom',
    keys: ['Units', 'DecayCorrection', 'RadiopharmaceuticalStartTime', 'RadionuclideTotalDose'],
    modalityFilter: ['PT', 'NM'],
  },
  {
    label: 'X-Ray / Angio Parameters',
    icon: 'i-lucide-crosshair',
    keys: ['DistanceSourceToDetector', 'DistanceSourceToPatient', 'IntensifierSize', 'PositionerPrimaryAngle', 'PositionerSecondaryAngle', 'GantryAngle'],
    modalityFilter: ['XA', 'RF', 'DX', 'CR'],
  },
] as const

// ── Computed ──────────────────────────────────────────────────────────────────

const modality = computed(() => props.tags.Modality?.toUpperCase() ?? '')

const visibleSections = computed(() =>
  TAG_GROUPS
    .filter((g) => {
      if ('modalityFilter' in g && g.modalityFilter.length) {
        return (g.modalityFilter as readonly string[]).includes(modality.value)
      }
      return true
    })
    .map(g => ({
      label: g.label,
      icon: g.icon,
      rows: (g.keys as readonly string[])
        .filter(k => props.tags[k] !== undefined && props.tags[k] !== '')
        .map(k => ({ key: k, value: formatValue(k, props.tags[k]!) })),
    }))
    .filter(s => s.rows.length > 0),
)

// ── Formatters ────────────────────────────────────────────────────────────────

function formatPatientName(raw?: string): string {
  if (!raw) return ''
  return raw.replace(/\^/g, ' ').trim()
}

function formatDate(raw?: string): string {
  if (!raw || raw.length < 8) return raw ?? ''
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
}

function formatTime(raw?: string): string {
  if (!raw || raw.length < 6) return raw ?? ''
  return `${raw.slice(0, 2)}:${raw.slice(2, 4)}:${raw.slice(4, 6)}`
}

function formatSex(raw?: string): string {
  if (raw === 'M') return 'Male'
  if (raw === 'F') return 'Female'
  if (raw === 'O') return 'Other'
  return raw ?? ''
}

function formatAge(raw?: string): string {
  if (!raw) return ''
  const match = raw.match(/^(\d+)([DWMY])$/)
  if (!match) return raw
  const n = match[1]!
  const unit = match[2]!
  const units: Record<string, string> = { D: 'days', W: 'weeks', M: 'months', Y: 'years' }
  return `${parseInt(n)} ${units[unit] ?? unit}`
}

function formatSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let s = bytes; let u = 0
  while (s >= 1024 && u < units.length - 1) { s /= 1024; u++ }
  return `${s.toFixed(u > 0 ? 1 : 0)} ${units[u]}`
}

const DATE_KEYS = new Set(['StudyDate', 'SeriesDate', 'InstanceCreationDate', 'PatientBirthDate', 'AcquisitionDate', 'ContentDate'])
const TIME_KEYS = new Set(['StudyTime', 'SeriesTime', 'InstanceCreationTime', 'AcquisitionTime', 'ContentTime', 'RadiopharmaceuticalStartTime'])
const NAME_KEYS = new Set(['PatientName', 'ReferringPhysicianName', 'OperatorsName', 'PerformingPhysicianName'])

function formatValue(key: string, value: string): string {
  if (DATE_KEYS.has(key)) return formatDate(value)
  if (TIME_KEYS.has(key)) return formatTime(value)
  if (NAME_KEYS.has(key)) return formatPatientName(value)
  if (key === 'PatientSex') return formatSex(value)
  if (key === 'PatientAge') return formatAge(value)
  return value
}
</script>
