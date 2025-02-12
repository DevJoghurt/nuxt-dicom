import { dirname, join } from 'node:path'
import { defineEventHandler, useProcess, useRuntimeConfig } from '#imports'

const PROCESS_FILE = 'storescp.mjs'

export default defineEventHandler(async () => {
  const { launchProcess, getProcessInstance } = useProcess()

  const processInstance = getProcessInstance('storescp_process')

  if (processInstance) {
    return {
      status: 'success',
      message: 'Process already running',
    }
  }

  const { storeSCP } = useRuntimeConfig().dicom

  let scriptPath = storeSCP.scriptPath
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
    env: {
      port: storeSCP.port.toString(),
      outDir: storeSCP.outDir,
    },
  })

  return {
    status: cProcessInstance ? 'success' : 'error',
  }
})
