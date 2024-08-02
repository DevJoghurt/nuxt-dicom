import { StoreScp } from '@nuxthealth/node-dicom'

const server = new StoreScp({
    port: 4445,
    outDir: '/tmp',
})

server.listen((event, data) => {
    console.log(`Event: ${event}`, data)
});