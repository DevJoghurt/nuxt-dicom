import { StoreScp } from '@nuxthealth/node-dicom'

const gracefulShutdown = () => {
  // Todo: implement graceful shutdown with pm2 integration
  // currently something in rust code is causing the sigint to be catched by the process
  sendMessage('error', {
    data: '',
    message: 'StoreSCP SIGINT message',
  })
}

function sendMessage(event, message) {
  process.send({
    type: 'process:msg',
    data: {
      event: event,
      data: message.data,
      message: message.message,
    },
  })
};

const server = new StoreScp({
  port: Number.parseInt(process.env.SERVER_PORT) || 4446,
  outDir: process.env?.OUT_DIR || 'tmp',
})

server.listen((event, data) => {
  sendMessage(event, data)
})

process.on('SIGINT', async function () {
  gracefulShutdown()
})
