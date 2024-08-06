import { defineEventHandler, useRuntimeConfig, $useDicomProcessManager } from '#imports'

export default defineEventHandler(async () => {
  const { storeSCP } = useRuntimeConfig().dicom

  const { list } = $useDicomProcessManager()

  const process = (await list()).find(p => p.id === 'storescp')

  return {
    status: 200,
    process: process || null,
    server: {
      port: storeSCP.port,
    },
  }
})
