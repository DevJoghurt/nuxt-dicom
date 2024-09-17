export default defineNuxtConfig({
  modules: [
    '@nuxt/ui',
    '../src/module',
  ],
  dicom: {},
  devtools: {
    enabled: true,
  },
  compatibilityDate: '2024-08-05',
})
