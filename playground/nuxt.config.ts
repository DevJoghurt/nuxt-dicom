export default defineNuxtConfig({
  modules: [
    '@nuxt/ui',
    'nuxt-mcp-dev',
    '../src/module',
  ],
  imports: {
    autoImport: false,
  },
  devtools: {
    enabled: true,
  },
  css: ['~/assets/tailwind.css'],
  dicom: {
    route: true,
    // Global log level (can be overridden per-service or at runtime)
    logLevel: 'info',
    // Per-service log level overrides (optional)
    // serviceLogs: {
    //   storeScp_1: 'debug',
    // },
    autoDeleteAfterDays: 10,
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
