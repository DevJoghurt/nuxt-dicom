import z from 'zod'

const StoreSCPConfigSchema = z.object({
	port: z.string().default('104').optional(),
	outDir: z.string().default('dicom').optional(),
	enabled: z.boolean().default(false),
	keepAlive: z.boolean().default(true).optional(),
	callingAETitle: z.string().default('STORE_SCP').optional(),
	study_timeout: z.number().default(40).optional(), // 40 seconds
	storageBackend: z.enum(['Filesystem', 'S3']).default('Filesystem').optional(),
	s3AccessKey: z.string().optional(),
	s3SecretKey: z.string().optional(),
	s3Bucket: z.string().optional(),
	s3Region: z.string().optional()
})

export const DicomConfigSchemas = {
	storeSCP: StoreSCPConfigSchema
}

export type ProcessServiceTypes = 'storeSCP'

export type StoreSCPConfig = z.infer<typeof StoreSCPConfigSchema>

export type ProcessServiceConfig = {
	storeSCP: StoreSCPConfig
}