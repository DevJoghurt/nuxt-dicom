import { consola } from "consola"
import { useRuntimeConfig, defineNitroPlugin, $useDicomProcessManager } from '#imports'
import { fileURLToPath } from 'url';
import { dirname, join } from 'node:path'

export default defineNitroPlugin(async (nitro) => {
    const logger = consola.create({}).withTag("STORESCP")

    const { storeSCP } = useRuntimeConfig().dicom

    const { initLaunchBus, disconnect: disconnectPM2, start } = $useDicomProcessManager()

    const pm2EventBus = await initLaunchBus()

    pm2EventBus.on('process:msg', function({ data }) {
        if(data?.event === 'OnServerStarted') {
           logger.success(`Store SCP Server listening on ${data.data}`) 
        }
        if(data?.event === 'OnFileStored') {
            //TODO Implement DICOM Event handler for nuxt
        }
        else if(data?.event)
            logger.info(`Event [${data?.event || ''}]`, data?.message)
    })

    // add scriptPath for dev env and production build
    let scriptPath = storeSCP.scriptPath
    if(scriptPath === 'build'){
        scriptPath = join(dirname(fileURLToPath(import.meta.url)), 'storescp.mjs')
    }

    await start({
        name: 'storescp',
        script: scriptPath,
        output: storeSCP.logs,
        error: storeSCP.logs,
        env: {
            SERVER_PORT: storeSCP.port.toString(),
            OUT_DIR: storeSCP.outDir
        }
    })

    nitro.hooks.hook("close", async () => {
        logger.info('Close all StoreSCP services')
        await disconnectPM2()
        logger.success('Successfully closed all StoreSCP services')
    })

})