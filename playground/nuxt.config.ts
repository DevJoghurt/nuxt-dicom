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
  vite: {
    optimizeDeps: {
      include: [
        '@vue/devtools-core',
        '@vue/devtools-kit',
      ]
    }
  },
  dicom: {
    route: true,
    // Global log level (can be overridden per-service or at runtime)
    logLevel: 'info',
    // Named storage backends — referenced by services via storageKey
    storages: {
      main: {
        storageBackend: 'Filesystem',
        outDir: 'dicom-storage',
        autoDeleteAfterDays: 10,
      },
    },
    services: [
      {
        kind: 'storeScp',
        storageKey: 'main',
        storeWithFileMeta: true,
        eventHandlers: {
          onFileStored: ['logFileStorage'],
          onServerStarted: ['onServerReady'],
          onStudyCompleted: ['handleStudyCompletion'],
        },
      }
    ],
    pacs: [
      {
        name: 'orthanc-local',
        addr: '127.0.0.1:4242',
        calledAeTitle: 'ORTHANC',
      }
    ],
  },
})
