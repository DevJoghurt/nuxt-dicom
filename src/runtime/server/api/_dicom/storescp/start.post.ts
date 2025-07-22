import { dirname, join } from 'node:path'
import { defineEventHandler, useProcess, useRuntimeConfig } from '#imports'

const PROCESS_FILE = 'storescp.js'

export default defineEventHandler(async () => {
  const { launchProcess, getProcessInstance, getServiceConfig } = useProcess()

  const processInstance = getProcessInstance('storescp_process')

  if (processInstance) {
    return {
      status: 'success',
      message: 'Process already running',
    }
  }

  const serviceConfig = await getServiceConfig('storeSCP')

  const { servicePaths } = useRuntimeConfig().dicom

  let scriptPath = servicePaths.storeSCP || 'build'
  const isDev = scriptPath === 'build' ? false : true

  if (!isDev) {
    scriptPath = join(dirname(process.argv[1]), PROCESS_FILE)
  }

  const cProcessInstance = launchProcess(scriptPath, {
    name: 'storescp_process',
    logs: {
      inMemory: true,
      inMemoryLimit: 100,
    },
    env: serviceConfig,
  })

  return {
    status: cProcessInstance ? 'success' : 'error',
  }
})
