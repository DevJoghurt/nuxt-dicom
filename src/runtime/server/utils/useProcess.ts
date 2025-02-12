import { fork, type ChildProcess } from 'node:child_process'
import { consola } from 'consola'
import { getStoreSCPEventListener } from '#imports'

type ProcessStats = {
  timestamp: number
  memory: {
    rss: string
    heapTotal: string
    heapUsed: string
    external: string
    arrayBuffers: string
  }
  cpu: {
    count: number
    usage: string
    system: string
  }
  uptime: number
}

type ProcessInstance = {
  name: string
  script: string
  status: 'running' | 'stopped' | 'error'
  process: ChildProcess
  logs: {
    inMemory: boolean
    inMemoryLimit: number
    value: string[]
  }
  createdAt: number
  env?: Record<string, string>
  healthcheck: ReturnType<typeof setInterval>
  stats?: ProcessStats
  restarts: number
}

type LaunchProcessOptions = {
  name?: string
  cwd?: string
  env?: Record<string, string>
  logs?: {
    inMemory?: boolean
    inMemoryLimit?: number
  }
}

const processInstances = [] as ProcessInstance[]

export function useProcess() {
  const logger = consola.create({}).withTag('DICOM')

  const getProcessInstance = (name: string) => {
    return processInstances.find(w => w.name === name)
  }

  const logs = (process: string) => {
    const processInstance = getProcessInstance(process)
    if (processInstance) {
      return processInstance.logs.value
    }
    return []
  }

  const getProcessStats = (process: string) => {
    const processInstance = getProcessInstance(process)
    if (processInstance) {
      return processInstance.stats
    }
    return null
  }

  const setProcessStats = (process: string, stats: ProcessStats) => {
    const processInstance = getProcessInstance(process)
    if (processInstance) {
      processInstance.stats = stats
    }
  }

  const launchProcess = (script: string, opts: LaunchProcessOptions = {}) => {
    const {
      inMemory = false,
      inMemoryLimit = 100 } = opts?.logs || {}

    const spawnedProcess = fork(script, [], {
      env: opts?.env,
      detached: true,
      silent: true,
    })

    const cProcessInstance = {
      name: opts?.name || script,
      status: 'running',
      createdAt: Date.now(),
      script,
      process: spawnedProcess,
      env: opts?.env,
      logs: {
        inMemory,
        inMemoryLimit,
        value: [],
      },
      healthcheck: setInterval(() => {
        if (cProcessInstance.process.killed === true) {
          logger.error('Process killed', cProcessInstance.name)
          closeProcess(cProcessInstance.name)
        }
      }, 5000),
      restarts: 0,
    } as ProcessInstance

    const index = processInstances.push(cProcessInstance)

    if ((inMemory === true) && spawnedProcess?.stdout) {
      spawnedProcess.stdout.on('data', (data) => {
        const processInstance = processInstances[index - 1]
        if (processInstance) {
          // TODO: find a way to display logs with colors, until then, remove colors
          processInstance.logs.value.unshift(data.toString().replace(/[\u001B\u009B][[()#;?]*(?:\d{1,4}(?:;\d{0,4})*)?[0-9A-ORZcf-nqry=><]/g, ''))
          if (processInstance.logs.value.length > inMemoryLimit) {
            processInstance.logs.value.pop()
          }
        }
      })
    }

    // add process error listener
    spawnedProcess.on('error', (err) => {
      logger.error('Process error', err)
      const processInstance = processInstances[index - 1]
      processInstance.logs.value.unshift(`Process error: ${err}`)
    })

    const storeSCPEventListener = getStoreSCPEventListener()

    spawnedProcess.on('message', (msg: { event: string, data: unknown, message: string }) => {
      switch (msg?.event) {
        case 'OnProcessStats':
          setProcessStats('storescp_process', msg.data)
          break
        case 'OnServerStarted':
          logger.success(`Store SCP Server listening on ${msg?.data}`)
          break
        case 'OnFileStored':
          for (const eventInstance of storeSCPEventListener.filter(e => e.event === 'OnFileStored')) {
            eventInstance.handler(msg.data)
          }
          break
        case 'OnStudyCompleted':
          for (const eventInstance of storeSCPEventListener.filter(e => e.event === 'OnStudyCompleted')) {
            eventInstance.handler(msg.data)
          }
          break
        default:
          logger.info(`Event [${msg?.event || ''}]`, msg?.message)
      }
    })

    return cProcessInstance
  }

  const restartProcess = async (name: string) => {
    const processInstance = getProcessInstance(name)
    if (!processInstance) {
      logger.error('Process not found', name)
      return null
    }
    const script = processInstance.script
    const restarts = processInstance.restarts
    const opts = {
      name: name,
      env: processInstance?.env,
      logs: {
        inMemory: processInstance?.logs.inMemory,
        inMemoryLimit: processInstance?.logs.inMemoryLimit,
      },
    }
    closeProcess(name)
    launchProcess(script, opts)
    const newProcessInstance = getProcessInstance(name)
    if (newProcessInstance) {
      newProcessInstance.restarts = restarts + 1
    }
    return newProcessInstance
  }

  const closeProcess = (name: string) => {
    const processInstance = getProcessInstance(name)
    if (processInstance) {
      processInstance.process.kill()
      while (processInstance.process.killed === false) {
        // wait for process to stop
      }
      removeProcessInstance(name)
      logger.success('Close process', processInstance?.name)
    }
    return true
  }

  const removeProcessInstance = (name: string) => {
    const processIndex = processInstances.findIndex(p => p.name === name)
    if (processIndex !== -1)
      clearInterval(processInstances[processIndex].healthcheck)
    processInstances.splice(processIndex, 1)
  }

  return {
    getProcessInstance,
    launchProcess,
    closeProcess,
    getProcessStats,
    setProcessStats,
    restartProcess,
    logs,
  }
}
