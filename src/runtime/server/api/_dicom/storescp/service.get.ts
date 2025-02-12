import { defineEventHandler, useRuntimeConfig, useProcess } from '#imports'

export default defineEventHandler(async () => {
  const { storeSCP } = useRuntimeConfig().dicom

  const { getProcessInstance } = useProcess ()

  const processInstance = getProcessInstance('storescp_process')

  return {
    status: 200,
    process: {
      name: processInstance?.name,
      status: processInstance?.status || 'stopped',
      restarts: processInstance?.restarts,
      createdAt: processInstance?.createdAt || 0,
    },
    logs: processInstance?.logs,
    stats: processInstance?.stats,
    server: {
      port: storeSCP.port,
    },
  }
})
