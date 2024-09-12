import { fileURLToPath } from 'node:url'
import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  environment: 'nuxt',
  environmentOptions: {
    nuxt: {
      rootDir: fileURLToPath(new URL('./test/fixtures/basic', import.meta.url)),
    },
  },
})
