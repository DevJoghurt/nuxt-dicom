export default defineNuxtConfig({
  modules: [
    '@nuxt/ui',
    '../src/module',
  ],
  devtools: {
    enabled: true,
  },
  css: ['~/assets/tailwind.css'],
  dicom: {},
})
