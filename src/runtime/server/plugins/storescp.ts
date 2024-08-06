import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { consola } from 'consola'
import { useRuntimeConfig, defineNitroPlugin, $useDicomProcessManager, getStoreSCPEventListener } from '#imports'

export default defineNitroPlugin(async (nitro) => {
  const logger = consola.create({}).withTag('STORESCP')

  const { storeSCP } = useRuntimeConfig().dicom

  const { initLaunchBus, disconnect: disconnectPM2, start } = $useDicomProcessManager()

  const pm2EventBus = await initLaunchBus()

  pm2EventBus.on('process:msg', function ({ data }) {
    const storeSCPEventListener = getStoreSCPEventListener()

    switch (data?.event) {
      case 'OnServerStarted':
        logger.success(`Store SCP Server listening on ${data?.data}`)
        break
      case 'OnFileStored':
        logger.success(`File received ${data?.data}`)
        for (const handler of storeSCPEventListener) {
          handler(data.data)
        }
        break
      default:
        logger.info(`Event [${data?.event || ''}]`, data?.message)
    }
  })

  // add scriptPath for dev env and production build
  let scriptPath = storeSCP.scriptPath
  if (scriptPath === 'build') {
    scriptPath = join(dirname(fileURLToPath(import.meta.url)), 'storescp.mjs')
  }

  await start({
    name: 'storescp',
    script: scriptPath,
    output: storeSCP.logs,
    error: storeSCP.logs,
    env: {
      SERVER_PORT: storeSCP.port.toString(),
      OUT_DIR: storeSCP.outDir,
    },
  })

  nitro.hooks.hook('close', async () => {
    logger.info('Close all StoreSCP services')
    await disconnectPM2()
    logger.success('Successfully closed all StoreSCP services')
  })
})
