import { StoreScp } from '@nuxthealth/node-dicom'

function sendMessage(event, message) {
      process.send({
        type : 'process:msg',
        data : {
          event: event,
          data: message.data,
          message: message.message
        }
      })
}

const server = new StoreScp({
    port: parseInt(process.env.SERVER_PORT) || 4446,
    outDir: process.env?.OUT_DIR || 'tmp',
})

server.listen((event, data) => {
    sendMessage(event, data);
});

// Todo: implement graceful shutdown with pm2 integration
process.on('SIGINT', async function() {
    sendMessage('error', {
      data: '',
      message: 'StoreSCP SIGINT message'
    });
})