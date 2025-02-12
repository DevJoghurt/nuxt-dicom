import { dirname, join } from 'node:path'
import { defineNitroPlugin, useProcess, useRuntimeConfig } from '#imports'

const PROCESS_FILE = 'storescp.js'

export default defineNitroPlugin(async (nitro) => {
  const { storeSCP } = useRuntimeConfig().dicom

  let scriptPath = storeSCP.scriptPath
  const isDev = scriptPath === 'build' ? false : true

  if (!isDev) {
    scriptPath = join(dirname(process.argv[1]), PROCESS_FILE)
  }

  const { launchProcess, closeProcess } = useProcess()

  launchProcess(scriptPath, {
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

  nitro.hooks.hook('close', async () => {
    await closeProcess('storescp_process')
  })
})
