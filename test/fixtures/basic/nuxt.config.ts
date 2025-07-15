import NuxtDicom from '../../../src/module'

export default defineNuxtConfig({
  modules: [
    NuxtDicom,
  ],
  dicom: {
    storeSCP: {
      enabled: true,
      port: 1222,
      outDir: 'tmp',
    },
  },
})
