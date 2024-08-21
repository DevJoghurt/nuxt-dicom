import { dirname, join } from 'node:path'
import { consola } from 'consola'
import { defineNitroPlugin, useWorker, useRuntimeConfig, getStoreSCPEventListener } from '#imports'

const PROCESS_FILE = 'storescp.js';

export default defineNitroPlugin(async (nitro) => {

  const logger = consola.create({}).withTag('STORESCP')

  const { storeSCP } = useRuntimeConfig().dicom;

  let scriptPath = storeSCP.scriptPath;
  if (scriptPath === 'build') {
    scriptPath = join(dirname(process.argv[1]), PROCESS_FILE);
  }

  const { launchWorker, closeWorker } = useWorker()

  const worker = launchWorker(scriptPath, {
    name: 'storescp_process',
    data: {
      port: storeSCP.port,
      outDir: storeSCP.outDir
    }
  })

  worker.on('message', (data) => {
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

  nitro.hooks.hook('close', async () => {
    logger.info('Close all StoreSCP services')
    await closeWorker()
    logger.success('Successfully closed all StoreSCP services')
  })
})
