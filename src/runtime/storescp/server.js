import { StoreScp } from '@nuxthealth/node-dicom'

const gracefulShutdown = () => {
  // Todo: implement graceful shutdown
  process.send('error', {
    data: '',
    message: 'StoreSCP SIGINT message',
  })
}

function sendMessage(event, message) {
  process.send({
    event: event,
    data: message.data,
    message: message.message,
  })
};

const server = new StoreScp({
  port: Number.parseInt(process.env?.port) || 4446,
  outDir: process.env?.outDir || 'tmp',
})

server.listen((event, data) => {
  sendMessage(event, data)
})

process.on('message', async function (msg) {
  sendMessage(msg)
})

process.on('SIGINT', async function () {
  gracefulShutdown()
})
