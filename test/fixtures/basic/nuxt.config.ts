import MyModule from '../../../src/module'

export default defineNuxtConfig({
  modules: [
    MyModule,
  ],
  dicom: {
    storeSCP: {
      enabled: true,
      port: 1222,
      outDir: 'tmp',
    },
  },
})
