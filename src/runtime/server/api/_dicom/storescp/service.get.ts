import { defineEventHandler, useRuntimeConfig, useProcess } from '#imports'

export default defineEventHandler(async () => {
  const { storeSCP } = useRuntimeConfig().dicom

  const { getProcessInstance } = useProcess ()

  const processInstance = getProcessInstance('storescp_process')

  return {
    status: 200,
    process: {
      createdAt: processInstance?.createdAt,
    },
    server: {
      port: storeSCP.port,
    },
  }
})
