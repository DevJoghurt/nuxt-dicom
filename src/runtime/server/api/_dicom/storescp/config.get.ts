import { defineEventHandler, useProcess } from '#imports'

export default defineEventHandler(async () => {

  const { getServiceConfig } = useProcess()

  const config = await getServiceConfig('storeSCP')

  return {
    status: 200,
    config
  }
})
