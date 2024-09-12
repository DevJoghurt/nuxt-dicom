import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { StoreScu } from '@nuxthealth/node-dicom'
import { setup } from '@nuxt/test-utils/e2e'

describe('StoreSCP', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/basic', import.meta.url)),
    browser: false,
  })

  it('Send file', async () => {
    const storeSCU = new StoreScu({
      addr: '127.0.0.1:1222',
      verbose: false,
    })
    storeSCU.addFile('./test/fixtures/basic/files/test.dcm')
    const result = storeSCU.send()
    expect(result.status).equals('Success')
  })
})
