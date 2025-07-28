import { fork, type ChildProcess } from 'node:child_process'
import { consola } from 'consola'
import { defu } from 'defu'
import { getStoreSCPEventListener, DicomConfigSchemas } from '#imports'
import type { ProcessServiceConfig, ProcessServiceTypes } from './schema'

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

const PROCESS_SERVICES = ['storeSCP']

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

  /**
   * Get the configuration for a specific process service.
   * @param type Process service type
   * @template T Type of the process service
   * @returns Process service configuration
   */
  const getServiceConfig = async <T extends ProcessServiceTypes>(type: T): Promise<ProcessServiceConfig[T]> => {
    if (!PROCESS_SERVICES.includes(type)) {
      throw new Error(`Process service config for type "${type}" is not defined.`)
    }
    const { dicom } = useRuntimeConfig()
    const configSchema = DicomConfigSchemas[type as keyof typeof DicomConfigSchemas]
    if (!configSchema) {
      throw new Error(`Configuration schema for type "${type}" is not defined.`)
    }

    // Hole Config aus Runtime und DB, merge sie und parse sie nur einmal
    const db = useDatabase('dicom')
    if (!db) {
      throw new Error('Database "dicom" is not defined. Please check your configuration.')
    }

    let mergedConfig = dicom[type] || {}
    try {
      const { rows } = await db.sql`SELECT json_extract(config, '$') AS config FROM process WHERE type = ${type} LIMIT 1`
      if (rows?.length) {
        const dbConfig = JSON.parse(String(rows[0]?.config)) || {}
        mergedConfig = defu(dbConfig, mergedConfig)
      }
    } catch (error) {
      logger.error(`Failed to fetch config for type "${type}":`, error)
    }

    const parsed = configSchema.safeParse(mergedConfig)
    if (!parsed.success) {
      throw new Error(`Config for type "${type}" is invalid: ${JSON.stringify(parsed.error)}`)
    }

    return parsed.data as ProcessServiceConfig[T]
  }

  /**
   * Set the configuration for a specific process service.
   * @param type Process service type
   * @param config Partial configuration to set
   * @template T Type of the process service
   */
  const setServiceConfig = async <T extends ProcessServiceTypes>(type: T, config: Partial<ProcessServiceConfig[T]>) => {
    const currentConfig = await getServiceConfig(type)
    const mergedConfig = defu(config, currentConfig)
    // Validate and parse config before saving
    const configSchema = DicomConfigSchemas[type as keyof typeof DicomConfigSchemas]
    const parsed = configSchema.safeParse(mergedConfig)
    if (!parsed.success) {
      throw new Error(`Config for type "${type}" is invalid: ${JSON.stringify(parsed.error)}`)
    }
    const updateConfig = parsed.data as ProcessServiceConfig[T]
    // save config to sql db
    const db = useDatabase('dicom')
    if (!db) {
      throw new Error('Database "dicom" is not defined. Please check your configuration.')
    }
    try {
      // Try to update first
      const updateResult = await db.sql`UPDATE process SET config = json(${JSON.stringify(updateConfig)}) WHERE type = ${type}`;
      // If no row was updated, insert new
      if (updateResult.changes === 0) {
        await db.sql`INSERT INTO process (type, config) VALUES (${type}, json(${JSON.stringify(updateConfig)}))`;
      }
    } catch (error) {
      logger.error(`Failed to update config for type "${type}":`, error)
    }
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
          setProcessStats('storescp_process', msg.data as ProcessStats)
          break
        case 'OnServerStarted':
          logger.success(`Store SCP Server listening on ${msg?.data}`)
          break
        case 'OnFileStored':
          for (const eventInstance of storeSCPEventListener.filter(e => e.event === 'OnFileStored')) {
            eventInstance.handler(String(msg.data))
          }
          break
        case 'OnStudyCompleted':
          for (const eventInstance of storeSCPEventListener.filter(e => e.event === 'OnStudyCompleted')) {
            eventInstance.handler(String(msg.data))
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

    const config = await getServiceConfig('storeSCP')

    const opts = {
      name: name,
      env: config as Record<string, string>,
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
    getServiceConfig,
    setServiceConfig,
    logs,
  }
}
