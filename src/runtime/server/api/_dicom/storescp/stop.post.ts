import { defineEventHandler, useProcess } from '#imports'

export default defineEventHandler(async () => {
  const { closeProcess } = useProcess()

  const status = closeProcess('storescp_process')

  return {
    status: status ? 'success' : 'error',
  }
})
