<template>
  <NUtilsComponentRouter
    v-slot="{ component }"
    :routes="routes"
    base="p"
    mode="query"
  >
    <component :is="component" />
  </NUtilsComponentRouter>

  <!-- Confirm Modal from nutils -->
  <NUtilsConfirmModal />
</template>

<script setup lang="ts">
// Define routes for component-based routing
const routes = {
  '/services': () => import('./services/index.vue'),
  '/services/new': () => import('./services/new.vue'),
  '/services/:name': () => import('./services/[name].vue'),
}
</script>
