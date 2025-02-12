import { platform, cpus } from 'node:os'
import { StoreScp } from '@nuxthealth/node-dicom'

const port = Number.parseInt(process.env?.port) || 4446

const server = new StoreScp({
  port,
  outDir: process.env?.outDir || 'tmp',
})

server.addEventListener('OnFileStored', (error, event) => {
  process.send({
    event: 'OnFileStored',
    data: JSON.parse(event.data),
    message: event.message,
  })
})

server.addEventListener('OnServerStarted', (error, event) => {
  process.send({
    event: 'OnServerStarted',
    data: port,
    message: event.message,
  })
})

server.addEventListener('OnStudyCompleted', (error, event) => {
  process.send({
    event: 'OnStudyCompleted',
    data: JSON.parse(event.data),
    message: event.message,
  })
})

server.listen()

function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

let currentUsage = process.cpuUsage()
let currentTime = process.hrtime()

function basicCpuUsage() {
  const numCpus = cpus().length

  const usageDiff = process.cpuUsage(currentUsage) // get diff time from start
  const endTime = process.hrtime(currentTime) // total amount of time that has elapsed

  currentUsage = process.cpuUsage()
  currentTime = process.hrtime()

  const usageMS = (usageDiff.user + usageDiff.system) / 1e3
  const totalMS = endTime[0] * 1e3 + endTime[1] / 1e6

  const cpuPercent = (usageMS / totalMS) * 100
  const normPercent = (usageMS / totalMS / numCpus) * 100 // average usage time per cpu

  return {
    cpuPercent: `${cpuPercent.toFixed(2)} %`,
    normPercent: `${normPercent.toFixed(2)} %`,
  }
}

// create a interval to send nodejs process stats to the parent process every 5 seconds
setInterval(() => {
  const memoryUsage = process.memoryUsage()
  const cpuUsage = basicCpuUsage()
  process.send({
    event: 'OnProcessStats',
    data: {
      timestamp: Date.now(),
      memory: {
        rss: formatBytes(memoryUsage.rss),
        heapUsed: formatBytes(memoryUsage.heapUsed),
        heapTotal: formatBytes(memoryUsage.heapTotal),
        external: formatBytes(memoryUsage.external),
        arrayBuffers: formatBytes(memoryUsage.arrayBuffers),
      },
      cpu: {
        count: cpus().length,
        usage: cpuUsage.cpuPercent,
        system: cpuUsage.normPercent,
      },
      uptime: process.uptime(),
    },
  })
}, 5000)

async function exitHandler(evtOrExitCodeOrError) {
  console.log('EXIT HANDLER', evtOrExitCodeOrError)
  try {
    if (platform() !== 'win32') {
      await server.close()
    }
  }
  catch (e) {
    console.error('EXIT HANDLER ERROR', e)
  }
  console.log('EXIT HANDLER DONE')
  process.exit(Number.isNaN(+evtOrExitCodeOrError) ? 1 : +evtOrExitCodeOrError)
}

[
  'beforeExit', 'uncaughtException', 'unhandledRejection',
  'SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP',
  'SIGABRT', 'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV',
  'SIGUSR2', 'SIGTERM',
].forEach(evt => process.on(evt, exitHandler))
