<template>
  <div>
    <div>
      <UHorizontalNavigation
        :links="links"
        class="border-b border-gray-200 dark:border-gray-800 px-4"
      />
    </div>
    <div>
      <StoreSCP v-if="tab === 'storescp'" />
    </div>
  </div>
</template>

<script setup lang="ts">
import StoreSCP from './storescp/index.vue'
import { useRoute, ref, reactive, watch } from '#imports'

const route = useRoute()

const tab = ref(route.query?.tab || 'storescp')

const links = reactive([
  [{
    label: 'StoreSCP',
    tab: 'storescp',
    to: route.path,
    active: tab.value === 'storescp',

  }],
])

watch(() => route.query, (val) => {
  tab.value = val?.tab || 'storescp'

  for (const link of links[0]) {
    link.active = link.tab === tab.value
  }
})
</script>
