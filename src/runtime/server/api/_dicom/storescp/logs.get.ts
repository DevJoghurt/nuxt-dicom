import { existsSync } from 'node:fs'
import { read } from 'read-last-lines'
import { defineEventHandler, useRuntimeConfig } from '#imports'

export default defineEventHandler(async () => {
  const { storeSCP } = useRuntimeConfig().dicom

  const logFile = storeSCP.logs

  if (existsSync(logFile) !== true) {
    return {
      status: 404,
      logs: 'Log file not found',
    }
  }

  const logs = await read(logFile, 50)

  return {
    status: 200,
    logs: logs.replace(
      /[\u001B\u009B][[()#;?]*(?:\d{1,4}(?:;\d{0,4})*)?[0-9A-ORZcf-nqry=><]/g, ''),
  }
})
