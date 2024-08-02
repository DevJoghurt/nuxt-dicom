import { consola } from "consola"
import { useRuntimeConfig, defineNitroPlugin } from '#imports'
import { StoreScp, Event, EventData } from '@nuxthealth/node-dicom'

export default defineNitroPlugin(async (nitro) => {
    const logger = consola.create({}).withTag("STORESCP")

    const server = new StoreScp({
        port: 4444,
        outDir: '/tmp',
    })

    server.listen((event: Event, data: EventData) => {
        logger.info(`Event: ${event}`, data)
        return 'success'
    });

})