import { fork, type ChildProcess } from 'node:child_process'
import { consola } from 'consola'

type ProcessInstance = {
  name: string
  process: ChildProcess
  createdAt: number
  env?: Record<string, string>
  controller: AbortController
}

type LaunchProcessOptions = {
  name?: string
  cwd?: string
  env?: Record<string, string>
}

const processInstances = [] as ProcessInstance[]

export function useProcess() {
  const logger = consola.create({}).withTag('DICOM')

  const getProcessInstance = (name: string) => {
    return processInstances.find(w => w.name === name)
  }

  const launchProcess = (script: string, opts?: LaunchProcessOptions) => {
    const controller = new AbortController()
    const { signal } = controller
    const spawnedProcess = fork(script, [], {
      env: opts?.env,
      signal,
    })

    processInstances.push({
      name: opts?.name || script,
      createdAt: Date.now(),
      process: spawnedProcess,
      env: opts?.env,
      controller,
    })

    return spawnedProcess
  }

  const closeProcess = (name: string) => {
    const processInstance = getProcessInstance(name)
    if (processInstance) {
      processInstance?.controller.abort()
      removeProcessInstance(name)
      logger.success('Close process', processInstance?.name)
    }
  }

  const removeProcessInstance = (name: string) => {
    const processIndex = processInstances.findIndex(p => p.name === name)
    if (processIndex !== -1)
      processInstances.splice(processIndex, 1)
  }

  return {
    getProcessInstance,
    launchProcess,
    closeProcess,
  }
}
