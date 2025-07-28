import { DicomConfigSchemas } from '../../../utils/schema'
import { readValidatedBody, defineEventHandler, useProcess } from '#imports'

export default defineEventHandler(async (event) => {
    const body = await readValidatedBody(event, DicomConfigSchemas['storeSCP'].safeParse)
	if (!body.success) {
		return {
			status: 'error',
			message: 'Invalid configuration data'
		}
	}
	const { setServiceConfig, restartProcess, getProcessInstance } = useProcess()
	const config = await setServiceConfig('storeSCP', body.data)

	const processInstance = getProcessInstance('storescp_process')

	if(processInstance && processInstance.status === 'running') {
		await restartProcess('storescp_process')
	}

	return {
		status: 'success',
		message: 'Configuration updated successfully',
		config
	}
})