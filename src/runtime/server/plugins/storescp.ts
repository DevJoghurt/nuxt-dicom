import { dirname, join } from 'node:path'
import { consola } from 'consola'
import { defineNitroPlugin, useProcess, useRuntimeConfig, getStoreSCPEventListener } from '#imports'

const PROCESS_FILE = 'storescp.js'

export default defineNitroPlugin(async (nitro) => {
  const logger = consola.create({}).withTag('STORESCP')

  const { storeSCP } = useRuntimeConfig().dicom

  let scriptPath = storeSCP.scriptPath
  const isDev = scriptPath === 'build' ? false : true

  if (!isDev) {
    scriptPath = join(dirname(process.argv[1]), PROCESS_FILE)
  }

  const { launchProcess, closeProcess } = useProcess()

  const spawnedProcess = launchProcess(scriptPath, {
    name: 'storescp_process',
    env: {
      port: storeSCP.port.toString(),
      outDir: storeSCP.outDir,
    },
  })

  spawnedProcess.on('message', (msg) => {
    const storeSCPEventListener = getStoreSCPEventListener()
    switch (msg?.event) {
      case 'OnServerStarted':
        logger.success(`Store SCP Server listening on ${msg?.data}`)
        break
      case 'OnFileStored':
        logger.success(`File received ${msg?.data}`)
        for (const handler of storeSCPEventListener) {
          handler(msg.data)
        }
        break
      default:
        logger.info(`Event [${msg?.event || ''}]`, msg?.message)
    }
  })

  nitro.hooks.hook('close', async () => {
    closeProcess('storescp_process')
  })
})
