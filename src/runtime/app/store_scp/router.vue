<template>
	<div>
		<slot :component="component" />
	</div>
</template>
<script setup lang="ts">
	import { useRoute, watch } from '#imports'
	import Overview from './pages/overview.vue'
	import Events from './pages/events.vue'
	import Services from './pages/services.vue'
	import Logs from './pages/logs.vue'
	import Configuration from './pages/configuration.vue'


	const route = useRoute()

	const component = shallowRef<typeof Overview | null>(null)


	const navigate = async (page: string) => {
		if (page === 'overview') {
			component.value = Overview
		} else if (page === 'events') {
			component.value = Events
		} else if (page === 'services') {
			component.value = Services
		} else if (page === 'logs') {
			component.value = Logs
		} else if (page === 'configuration') {
			component.value = Configuration
		} else {
			component.value = Overview
		}
	}

	watch(() => route.query, () => {
		navigate(route.query.page as string)
	})

	navigate(route.query.page as string || 'overview')
</script>