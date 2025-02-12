import { defineEventHandler, useProcess } from '#imports'

export default defineEventHandler(async () => {
  const { restartProcess } = useProcess()

  const processInstance = await restartProcess('storescp_process')

  return {
    status: processInstance ? 'success' : 'error',
  }
})
