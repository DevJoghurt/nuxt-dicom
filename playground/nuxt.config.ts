export default defineNuxtConfig({
  modules: [
    '@nuxt/ui',
    'nuxt-mcp-dev',
    '../src/module',
  ],
  devtools: {
    enabled: true,
  },
  css: ['~/assets/tailwind.css'],
  nitro: {
    experimental: {
      websocket: true,
    },
  },
  dicom: {
    route: true,
    // Global log level (can be overridden per-service or at runtime)
    logLevel: 'info',
    // Per-service log level overrides (optional)
    // serviceLogs: {
    //   storeScp_1: 'debug',
    // },
    services: {
      storeScp: {
        eventHandlers: {
          onFileStored: ['logFileStorage'],
          onServerStarted: ['onServerReady'],
          onStudyCompleted: ['handleStudyCompletion'],
        },
      },
    },
  },
})
