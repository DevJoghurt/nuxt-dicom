import { describe, it, expect } from 'vitest'
import { StoreScu } from '@nuxthealth/node-dicom'

describe('StoreSCP', async () => {
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
