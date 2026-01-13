<template>
  <div class="h-full flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-950">
    <!-- Header -->
    <div class="border-b border-gray-200 dark:border-gray-800 px-6 py-4 shrink-0 bg-white dark:bg-gray-900">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <UButton
            icon="i-lucide-arrow-left"
            size="sm"
            color="neutral"
            variant="ghost"
            @click="goBack"
          />
          <div>
            <h1 class="text-lg font-semibold">
              Create New Service
            </h1>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Configure a new DICOM StoreSCP service
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 min-h-0 overflow-y-auto">
      <div class="max-w-4xl mx-auto py-8 px-6">
        <!-- Stepper -->
        <UStepper
          v-model="currentStep"
          :items="steps"
          orientation="horizontal"
          class="mb-8"
        />

        <!-- Form Card -->
        <UForm
          :schema="schema"
          :state="formState"
          class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm"
        >
          <!-- Step 1: Basic Information -->
          <div v-show="currentStep === 0">
            <div class="p-6 border-b border-gray-200 dark:border-gray-800">
              <h2 class="text-xl font-semibold mb-2">
                Basic Information
              </h2>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                Provide details about your service
              </p>
            </div>
            <div class="p-6 space-y-4">
              <UFormField label="Service Name" name="name">
                <UInput
                  v-model="formState.name"
                  placeholder="e.g., Main DICOM Server"
                  required
                />
              </UFormField>

              <UFormField label="Application Entity Title (AET)" name="applicationEntityTitle">
                <UInput
                  v-model="formState.applicationEntityTitle"
                  placeholder="e.g., STORESCP"
                  required
                />
              </UFormField>

              <UFormField label="Description (Optional)" name="description">
                <UTextarea
                  v-model="formState.description"
                  placeholder="Describe the purpose of this service"
                  rows="3"
                />
              </UFormField>
            </div>
          </div>

          <!-- Step 2: Network Configuration -->
          <div v-show="currentStep === 1">
            <div class="p-6 border-b border-gray-200 dark:border-gray-800">
              <h2 class="text-xl font-semibold mb-2">
                Network Configuration
              </h2>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                Configure network and storage settings
              </p>
            </div>
            <div class="p-6 space-y-4">
              <UFormField label="Port" name="port">
                <UInput
                  v-model.number="formState.port"
                  type="number"
                  placeholder="e.g., 11112"
                  min="1024"
                  max="65535"
                  required
                />
              </UFormField>

              <UFormField label="Storage Path (Optional)" name="storagePath">
                <UInput
                  v-model="formState.storagePath"
                  placeholder="e.g., ./dicom-files"
                />
              </UFormField>

              <UFormField label="Bind Address (Optional)" name="bindAddress">
                <UInput
                  v-model="formState.bindAddress"
                  placeholder="Leave empty for 0.0.0.0"
                />
              </UFormField>
            </div>
          </div>

          <!-- Step 3: Review & Create -->
          <div v-show="currentStep === 2">
            <div class="p-6 border-b border-gray-200 dark:border-gray-800">
              <h2 class="text-xl font-semibold mb-2">
                Review & Create
              </h2>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                Review your service configuration before creating it
              </p>
            </div>
            <div class="p-6 space-y-6">
              <!-- Summary Card -->
              <div class="space-y-4">
                <div class="flex items-start gap-4">
                  <div class="w-12 h-12 rounded-lg flex items-center justify-center shrink-0 bg-blue-100 dark:bg-blue-900/40">
                    <UIcon
                      name="i-lucide-server"
                      class="w-6 h-6 text-blue-600 dark:text-blue-400"
                    />
                  </div>
                  <div class="flex-1 min-w-0">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      {{ formState.name || 'Unnamed Service' }}
                    </h3>
                    <p
                      v-if="formState.description"
                      class="text-sm text-gray-600 dark:text-gray-400"
                    >
                      {{ formState.description }}
                    </p>
                    <div class="flex items-center gap-2 mt-2">
                      <UBadge
                        label="DICOM"
                        color="blue"
                        variant="subtle"
                      />
                      <UBadge
                        :label="`Port ${formState.port}`"
                        color="neutral"
                        variant="subtle"
                      />
                    </div>
                  </div>
                </div>

                <!-- Configuration Details -->
                <div class="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Service Name
                    </p>
                    <p class="text-sm font-medium font-mono text-gray-900 dark:text-gray-100">
                      {{ formState.name }}
                    </p>
                  </div>
                  <div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      AET
                    </p>
                    <p class="text-sm font-medium font-mono text-gray-900 dark:text-gray-100">
                      {{ formState.applicationEntityTitle }}
                    </p>
                  </div>
                  <div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Port
                    </p>
                    <p class="text-sm font-medium font-mono text-gray-900 dark:text-gray-100">
                      {{ formState.port }}
                    </p>
                  </div>
                  <div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Status
                    </p>
                    <UBadge
                      label="Ready to Create"
                      color="success"
                      variant="subtle"
                    />
                  </div>
                </div>
              </div>

              <!-- Confirmation -->
              <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div class="flex items-start gap-3">
                  <UIcon
                    name="i-lucide-info"
                    class="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0"
                  />
                  <div>
                    <p class="text-sm text-blue-800 dark:text-blue-200 font-medium mb-1">
                      Service will be created and started
                    </p>
                    <p class="text-xs text-blue-700 dark:text-blue-300">
                      Once created, this service will automatically start listening for DICOM connections on the specified port.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Navigation Footer -->
          <div class="p-6 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <UButton
              v-if="currentStep > 0"
              label="Back"
              icon="i-lucide-arrow-left"
              color="neutral"
              variant="ghost"
              @click="currentStep--"
            />
            <div v-else />
            <div class="flex items-center gap-3">
              <UButton
                label="Cancel"
                color="neutral"
                variant="ghost"
                @click="goBack"
              />
              <UButton
                v-if="currentStep < 2"
                label="Next"
                icon-trailing="i-lucide-arrow-right"
                @click="currentStep++"
              />
              <UButton
                v-else
                label="Create Service"
                icon="i-lucide-check"
                :loading="isSubmitting"
                @click="handleSubmit"
              />
            </div>
          </div>
        </UForm>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useComponentRouter } from '#imports'
import { z } from 'zod'

const componentRouter = useComponentRouter()
const currentStep = ref(0)
const isSubmitting = ref(false)

const steps = [
  { label: 'Basic Information' },
  { label: 'Network Configuration' },
  { label: 'Review' },
]

const schema = z.object({
  name: z.string().min(1, 'Service name is required'),
  applicationEntityTitle: z.string().min(1, 'AET is required'),
  description: z.string().optional(),
  port: z.number().int().min(1024).max(65535, 'Port must be between 1024 and 65535'),
  storagePath: z.string().optional(),
  bindAddress: z.string().optional(),
})

const formState = ref({
  name: '',
  applicationEntityTitle: 'STORESCP',
  description: '',
  port: 11112,
  storagePath: '',
  bindAddress: '',
})

async function handleSubmit() {
  isSubmitting.value = true

  try {
    // Validate form data
    const validated = schema.parse(formState.value)

    // Create service
    const response = await $fetch('/api/dicom/services', {
      method: 'POST',
      body: validated,
    })

    // Navigate back to services list
    await componentRouter.push('/services')
  }
  catch (err) {
    console.error('Error creating service:', err)
    // You can add toast notification here
  }
  finally {
    isSubmitting.value = false
  }
}

function goBack() {
  componentRouter.push('/services')
}
</script>
