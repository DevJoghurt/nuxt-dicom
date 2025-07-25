<template>
  <div>
    <h1 class="text-2xl font-bold mb-2">Configuration</h1>
    <p class="mb-6 text-gray-500">Configuration settings for the StoreSCP service.</p>
    <UCard class="w-full max-w-xl">
      <UForm ref="configuration" :schema="DicomConfigSchemas['storeSCP']" :state="state" @submit="onSubmit" class="grid grid-cols-1 gap-6">
		<UFormField label="Autorun">
			<USwitch v-model="state.autorun" />
		</UFormField>
		<UFormField label="Port">
			<UInput v-model="state.port" type="text" class="w-full px-2 py-1 rounded bg-gray-50 border border-gray-200" />
		</UFormField>
        <UFormField label="Keep Alive">
          <USwitch v-model="state.keepAlive" />
        </UFormField>
        <UFormField label="Study Timeout (s)">
          <UInput v-model="state.studyTimeout" type="number" class="w-full px-2 py-1 rounded bg-gray-50 border border-gray-200" />
        </UFormField>
        <UFormField label="Calling AE Title">
          <UInput v-model="state.callingAETitle" type="text" class="w-full px-2 py-1 rounded bg-gray-50 border border-gray-200" />
        </UFormField>
        <UFormField label="Study Timeout (s)">
          <UInput v-model="state.studyTimeout" type="number" class="w-full px-2 py-1 rounded bg-gray-50 border border-gray-200" />
        </UFormField>
        <!-- Storage Bereich -->
        <div class="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div class="mb-3">
            <span class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Storage</span>
          </div>
          <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-1">
              <label class="text-sm text-gray-700 font-medium">Backend</label>
              <USelect
                v-model="state.storageBackend"
				@change="resetBackendState"
                :items="['Filesystem', 'S3']"
                class="w-full px-2 py-1 rounded bg-white border border-gray-200"
              />
            </div>
            <div class="border-b border-gray-200 my-2"></div>
            <UFormField v-if="state.storageBackend === 'Filesystem'" label="Output Directory">
              <UInput v-model="state.outDir" type="text" class="w-full px-2 py-1 rounded bg-white border border-gray-200" />
            </UFormField>
            <template v-if="state.storageBackend === 'S3'">
              <UFormField label="S3 Access Key">
                <UInput v-model="state.s3AccessKey" type="text" class="w-full px-2 py-1 rounded bg-white border border-gray-200" />
              </UFormField>
              <UFormField label="S3 Secret Key">
                <UInput v-model="state.s3SecretKey" type="password" class="w-full px-2 py-1 rounded bg-white border border-gray-200" />
              </UFormField>
              <UFormField label="S3 Bucket">
                <UInput v-model="state.s3Bucket" type="text" class="w-full px-2 py-1 rounded bg-white border border-gray-200" />
              </UFormField>
              <UFormField label="S3 Endpoint">
                <UInput v-model="state.s3Endpoint" type="text" class="w-full px-2 py-1 rounded bg-white border border-gray-200" />
              </UFormField>
            </template>
          </div>
        </div>
      </UForm>
      <template #footer>
        <div class="flex justify-end">
          <UButton color="primary" icon="i-heroicons:check" @click.prevent="form.submit()">
            Save
          </UButton>
        </div>
      </template>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { ref, useTemplateRef } from '#imports'
import { DicomConfigSchemas } from '../../../server/utils/schema'
import type { StoreSCPConfig } from '../../../server/utils/schema'
import type { FormSubmitEvent } from '@nuxt/ui'

type ResponseData = {
	status: string
  	config: StoreSCPConfig
}

const { data } = await useFetch<ResponseData>('/api/_dicom/storescp/config')

const state = ref<StoreSCPConfig>(data.value?.config || {})

const form = useTemplateRef('configuration')

// reset backend state
function resetBackendState() {
	if (state.value.storageBackend === 'Filesystem') {
		delete state.value.s3AccessKey
		delete state.value.s3SecretKey
		delete state.value.s3Bucket
		delete state.value.s3Endpoint
	} else {
		delete state.value.outDir
	}
}

async function onSubmit(event: FormSubmitEvent<StoreSCPConfig>) {
	const resp = await $fetch('/api/_dicom/storescp/config', {
		method: 'POST',
		body: event.data
	})
	if (resp.status === 'success') {
		// TODO: Integrate central notification system
	} else {
		// TODO: Integrate central notification system
	}
}
</script>