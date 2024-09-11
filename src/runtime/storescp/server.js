import { StoreScp } from '@nuxthealth/node-dicom'
import { workerData, parentPort } from 'node:worker_threads'

const gracefulShutdown = () => {
  // Todo: implement graceful shutdown
  sendMessage('error', {
    data: '',
    message: 'StoreSCP SIGINT message',
  })
}

/*
  //TODO: Implement messaging - currently rust blocks main thread, maybe fix by using tokyo
  parentPort.on("message", message => {
    console.log('inside worker',message)
  })
*/

function sendMessage(event, message) {
  parentPort.postMessage({
    event: event,
    data: message.data,
    message: message.message,
  });
};

const server = new StoreScp({
  port: workerData?.port || 4446,
  outDir: workerData?.outDir || 'tmp',
})

server.listen((event, data) => {
  sendMessage(event, data)
})

process.on('SIGINT', async function () {
  gracefulShutdown()
})