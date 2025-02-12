export default defineNuxtConfig({
  modules: [
    '@nuxt/ui',
    '../src/module',
  ],
  devtools: {
    enabled: true,
  },
  css: ['~/assets/tailwind.css'],
  compatibilityDate: '2024-08-05',
  dicom: {},
})
