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
	const { setServiceConfig } = useProcess()
	const config = await setServiceConfig('storeSCP', body.data)
	return {
		status: 'success',
		message: 'Configuration updated successfully',
		config
	}
})