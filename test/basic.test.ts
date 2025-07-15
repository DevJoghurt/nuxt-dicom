import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { StoreScu } from '@nuxthealth/node-dicom'
import { setup } from '@nuxt/test-utils/e2e'

  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/basic', import.meta.url)),
    browser: false,
  })


describe('StoreSCP', async () => {

  it('Send file', async () => {
    const storeSCU = new StoreScu({
      addr: '127.0.0.1:1222',
      verbose: false,
    })
    storeSCU.addFile('./test/fixtures/basic/files/test.dcm')
    const result = await storeSCU.send()
    console.log(result)
    expect(result[0].status).equals('Success')
  })
})
