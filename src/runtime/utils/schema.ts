import z from 'zod'

/**
 * Valid event types for StoreSCP service
 * Maps short event names to event IDs
 */
export const STORESCP_EVENT_TYPES = {
  onBeforeStore: 'storeScp_onBeforeStore',
  onFileStored: 'storeScp_onFileStored',
  onStudyCompleted: 'storeScp_onStudyCompleted',
  onServerStarted: 'storeScp_onServerStarted',
  onError: 'storeScp_onError',
} as const

export type StoreScpEventType = keyof typeof STORESCP_EVENT_TYPES

/**
 * StoreSCP Service Configuration
 * Inline-based DICOM C-STORE SCP server configuration
 */
const StoreSCPConfigSchema = z.object({
  /**
   * Service name for identification and event routing
   * If not provided, will be auto-generated as "storeScp_N"
   */
  name: z.string().optional(),

  /**
   * Network configuration
   */
  port: z.number().default(4446),
  callingAETitle: z.string().default('STORESCP'),
  maxPduLength: z.number().default(16384),

  /**
   * Storage configuration
   */
  outDir: z.string().default('./dicom-storage'),
  storageBackend: z.enum(['Filesystem', 'S3']).default('Filesystem'),
  storeWithFileMeta: z.boolean().default(false),

  /**
   * S3 Configuration (required when storageBackend is 'S3')
   */
  s3Config: z.object({
    bucket: z.string(),
    accessKey: z.string(),
    secretKey: z.string(),
    endpoint: z.string(),
    region: z.string().optional(),
  }).optional(),

  /**
   * Tag extraction
   */
  extractTags: z.array(z.string()).default([]),
  extractCustomTags: z.array(z.object({
    tag: z.string(),
    name: z.string(),
  })).default([]),

  /**
   * SOP Classes configuration
   */
  abstractSyntaxMode: z.enum(['AllStorage', 'All', 'Custom']).default('AllStorage'),
  abstractSyntaxes: z.array(z.string()).optional(),

  /**
   * Transfer Syntax configuration
   */
  transferSyntaxMode: z.enum(['All', 'UncompressedOnly', 'Custom']).default('All'),
  transferSyntaxes: z.array(z.string()).optional(),

  /**
   * Study completion timeout in seconds
   */
  studyTimeout: z.number().default(30),

  /**
   * Enable verbose logging
   */
  verbose: z.boolean().default(false),

  /**
   * Automatically start the service on initialization
   */
  autoStart: z.boolean().default(true),

  /**
   * Event handlers mapping (service events to handler function names)
   * Maps event names (with autocomplete support) to array of handler names
   *
   * @example
   * ```typescript
   * eventHandlers: {
   *   onFileStored: ['handler1', 'handler2'],
   *   onStudyCompleted: ['handler3'],
   * }
   * ```
   */
  eventHandlers: z.record(z.string(), z.array(z.string()))
    .refine(
      (handlers) => {
        // Allow any keys, but warn about unknown event types
        const knownTypes = Object.keys(STORESCP_EVENT_TYPES)
        const unknownKeys = Object.keys(handlers).filter(key => !knownTypes.includes(key))
        if (unknownKeys.length > 0) {
          console.warn(`[nuxt-dicom] Unknown event types: ${unknownKeys.join(', ')}. Known types: ${knownTypes.join(', ')}`)
        }
        return true
      },
      { message: 'Invalid event handler configuration' },
    )
    .optional() as z.ZodType<Partial<Record<StoreScpEventType, string[]>> & Record<string, string[]> | undefined>,
})

export const DicomConfigSchemas = {
  storeSCP: StoreSCPConfigSchema,
}

// Validated config type (after parsing with defaults applied)
export type StoreScpConfig = z.infer<typeof StoreSCPConfigSchema>

// Input config type (what users provide in nuxt.config - all fields optional except eventHandlers)
export type StoreScpConfigInput = Partial<Omit<StoreScpConfig, 'eventHandlers'>> & {
  eventHandlers?: StoreScpEventHandlers
}

/**
 * Helper type for event handlers with autocomplete support
 * Allows any string keys but provides intellisense for known event types
 */
export type StoreScpEventHandlers = Partial<Record<StoreScpEventType, string[]>> & Record<string, string[]>

/**
 * Module configuration options
 */
export interface ModuleOptions {
  services?: {
    storeScp?: StoreScpConfigInput | StoreScpConfigInput[]
  }
}
