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
  dicom: {
    route: true,
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
