import { dirname, join } from 'node:path'
import { defineNitroPlugin, useProcess, useRuntimeConfig } from '#imports'

const PROCESS_FILE = 'storescp.js'

export default defineNitroPlugin(async (nitro) => {
  const { servicePaths } = useRuntimeConfig().dicom

  let scriptPath = servicePaths.storescp
  const isDev = scriptPath === 'build' ? false : true

  if (!isDev) {
    scriptPath = join(dirname(process.argv[1]), PROCESS_FILE)
  }

  const { launchProcess, closeProcess, getServiceConfig } = useProcess()

  const config = await getServiceConfig('storeSCP')

  if(config.autorun === true) {
    launchProcess(scriptPath, {
      name: 'storescp_process',
      logs: {
        inMemory: true,
        inMemoryLimit: 100,
      },
      env: {
        port: config?.port?.toString() || '104',
        outDir: config?.outDir || '',
      },
    })

    nitro.hooks.hook('close', async () => {
      await closeProcess('storescp_process')
    })
  }
})
