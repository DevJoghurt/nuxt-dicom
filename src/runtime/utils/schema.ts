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
   * Storage key reference
   * Points to a named storage defined in the `storages` module option.
   * All storage-specific settings (outDir, backend, autoDelete) come from there.
   */
  storageKey: z.string().optional(),

  /**
   * Storage configuration (resolved from storageKey at build time)
   */
  outDir: z.string().default('./dicom-storage'),
  storageBackend: z.enum(['Filesystem', 'S3']).default('Filesystem'),
  storeWithFileMeta: z.boolean().default(false),

  /**
   * Auto-delete files older than N days (0 = disabled).
   * Resolved from the referenced storage config at build time.
   */
  autoDeleteAfterDays: z.number().default(0),

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
   * Enforce strict DICOM protocol compliance for PDU length limits.
   * - `false` (default): relaxed mode — accepts PDUs slightly over the negotiated maximum
   *   for better interoperability with non-compliant implementations.
   * - `true`: strict mode — rejects PDUs that exceed negotiated maximum, strictly following
   *   the DICOM standard. May cause connection failures with some senders.
   *
   * Enable only when testing standard compliance or in security-critical environments.
   */
  strict: z.boolean().default(false),

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

/**
 * DICOM Storage Configuration
 * Defines a named, reusable storage backend that services reference via `storageKey`.
 */
export const DicomStorageConfigSchema = z.object({
  /** Storage backend */
  storageBackend: z.enum(['Filesystem', 'S3']).default('Filesystem'),
  /** Output directory (Filesystem backend) */
  outDir: z.string().default('./dicom-storage'),
  /**
   * Automatically delete files older than N days.
   * 0 = disabled.
   */
  autoDeleteAfterDays: z.number().default(0),
  /** Store DICOM file meta information alongside the file */
  storeWithFileMeta: z.boolean().default(false),
  /** S3 configuration (required when storageBackend is 'S3') */
  s3Config: z.object({
    bucket: z.string(),
    accessKey: z.string(),
    secretKey: z.string(),
    endpoint: z.string(),
    region: z.string().optional(),
  }).optional(),
})

export type DicomStorageConfig = z.infer<typeof DicomStorageConfigSchema> & { name: string }
export type DicomStorageConfigInput = z.input<typeof DicomStorageConfigSchema>

/**
 * Cross-field validation for StoreSCP config.
 * Kept as a named function so it can be applied to both the bare schema
 * (for DicomConfigSchemas) and to extended schemas without duplication.
 */
function validateStoreSCPConfig(
  data: z.infer<typeof StoreSCPConfigSchema>,
  ctx: z.RefinementCtx,
): void {
  if (data.abstractSyntaxMode === 'Custom' && (!data.abstractSyntaxes || data.abstractSyntaxes.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '`abstractSyntaxes` must be a non-empty array when `abstractSyntaxMode` is "Custom"',
      path: ['abstractSyntaxes'],
    })
  }
  if (data.transferSyntaxMode === 'Custom' && (!data.transferSyntaxes || data.transferSyntaxes.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '`transferSyntaxes` must be a non-empty array when `transferSyntaxMode` is "Custom"',
      path: ['transferSyntaxes'],
    })
  }
}

export const DicomConfigSchemas = {
  // Use superRefine for cross-field validation. The base StoreSCPConfigSchema stays a plain
  // z.object() so that ServiceConfigSchema can still call .extend() on it.
  storeSCP: StoreSCPConfigSchema.superRefine(validateStoreSCPConfig),
  dicomStorage: DicomStorageConfigSchema,
}

// Validated runtime config type (after Zod parse + storage merge)
export type StoreScpConfig = z.infer<typeof StoreSCPConfigSchema>

/** Fields that are provided via the named storage config, not inline on the service */
type StorageConfigFields = 'outDir' | 'storageBackend' | 's3Config' | 'autoDeleteAfterDays'

/**
 * Abstract syntax (SOP Class) configuration — discriminated by `abstractSyntaxMode`.
 *
 * - `'AllStorage'` / `'All'` (default): `abstractSyntaxes` must not be provided.
 * - `'Custom'`: `abstractSyntaxes` is **required** and must be non-empty.
 *
 * @example
 * ```ts
 * // Custom — only CT and MR
 * { abstractSyntaxMode: 'Custom', abstractSyntaxes: [...sopClasses.ct, ...sopClasses.mr] }
 * ```
 */
export type AbstractSyntaxInput =
  | { abstractSyntaxMode?: 'AllStorage' | 'All'; abstractSyntaxes?: never }
  | { abstractSyntaxMode: 'Custom'; abstractSyntaxes: string[] }

/**
 * Transfer syntax (encoding/compression) configuration — discriminated by `transferSyntaxMode`.
 *
 * - `'All'` / `'UncompressedOnly'` (default): `transferSyntaxes` must not be provided.
 * - `'Custom'`: `transferSyntaxes` is **required** and must be non-empty.
 *
 * @example
 * ```ts
 * // Custom — uncompressed + JPEG 2000
 * { transferSyntaxMode: 'Custom', transferSyntaxes: [...txSyntaxes.uncompressed, ...txSyntaxes.jpeg2000] }
 * ```
 */
export type TransferSyntaxInput =
  | { transferSyntaxMode?: 'All' | 'UncompressedOnly'; transferSyntaxes?: never }
  | { transferSyntaxMode: 'Custom'; transferSyntaxes: string[] }

/** Fields replaced by the discriminated union syntax types in {@link StoreScpConfigInput} */
type SyntaxConfigFields = 'abstractSyntaxMode' | 'abstractSyntaxes' | 'transferSyntaxMode' | 'transferSyntaxes'

/**
 * User-facing service config input.
 * Storage-specific fields must be configured in the `storages` module option
 * and referenced here via `storageKey`.
 *
 * Abstract/transfer syntax fields use discriminated union types to enforce
 * that the `*Syntaxes` arrays are provided exactly when mode is `'Custom'`.
 */
export type StoreScpConfigInput =
  Partial<Omit<StoreScpConfig, 'eventHandlers' | StorageConfigFields | SyntaxConfigFields>> & {
    /** Reference to a named storage defined in the `storages` module option */
    storageKey: string
    eventHandlers?: StoreScpEventHandlers
  } & AbstractSyntaxInput
    & TransferSyntaxInput

/**
 * Helper type for event handlers with autocomplete support
 * Allows any string keys but provides intellisense for known event types
 */
export type StoreScpEventHandlers = Partial<Record<StoreScpEventType, string[]>> & Record<string, string[]>

/**
 * External DICOM destination — DIMSE (classic C-STORE via TCP/IP)
 */
const ExternalDimseDestinationSchema = z.object({
  /** Unique identifier used as the `targetName` in the send API */
  name: z.string(),
  /** Human-readable label shown in the UI (defaults to `name`) */
  label: z.string().optional(),
  /** Protocol discriminator */
  protocol: z.literal('dimse').default('dimse'),
  /**
   * Target address in the format `[AE_TITLE@]host:port`
   * e.g. "PACS@192.168.1.10:104" or "192.168.1.10:104"
   */
  addr: z.string(),
  /** Called AE Title of the remote SCP (overrides AE title in `addr` if set) */
  calledAeTitle: z.string().optional(),
  /** Calling AE Title this SCU will present itself as */
  callingAeTitle: z.string().optional(),
  /** Optional description shown in the UI */
  description: z.string().optional(),
})

/**
 * External DICOM destination — DICOMweb STOW-RS (HTTP/HTTPS)
 * Supported by Orthanc, dcm4chee, Google Cloud Healthcare, AWS HealthImaging,
 * Azure DICOM Service, and other modern PACS/VNA systems.
 */
const ExternalDicomwebDestinationSchema = z.object({
  name: z.string(),
  label: z.string().optional(),
  /** Protocol discriminator */
  protocol: z.literal('dicomweb'),
  /**
   * Base URL of the DICOMweb STOW-RS endpoint.
   * The `/studies` path will be appended automatically.
   * e.g. "https://pacs.example.com/wado/rs" or "http://orthanc:8042/dicom-web"
   */
  url: z.string().url(),
  /** HTTP Authorization header value (e.g. "Bearer <token>" or "Basic <base64>") */
  authorization: z.string().optional(),
  /** Additional HTTP headers to include in every request */
  headers: z.record(z.string(), z.string()).optional(),
  description: z.string().optional(),
})

/**
 * Discriminated union of all supported external destination protocols.
 * Discriminator key: `protocol` ("dimse" | "dicomweb")
 */
export const ExternalDicomDestinationSchema = z.discriminatedUnion('protocol', [
  ExternalDimseDestinationSchema,
  ExternalDicomwebDestinationSchema,
])

export type ExternalDimseDestination = z.infer<typeof ExternalDimseDestinationSchema>
export type ExternalDicomwebDestination = z.infer<typeof ExternalDicomwebDestinationSchema>
export type ExternalDicomDestination = z.infer<typeof ExternalDicomDestinationSchema>

/**
 * Unified service config — discriminated by `kind`.
 *
 * @example Internal DICOM C-STORE SCP
 * ```ts
 * { kind: 'storeScp', name: 'receiver', storageKey: 'main', port: 4446 }
 * ```
 * @example External DIMSE destination
 * ```ts
 * { kind: 'dimse', name: 'pacs', addr: 'PACS@192.168.1.10:104' }
 * ```
 * @example External DICOMweb destination
 * ```ts
 * { kind: 'dicomweb', name: 'orthanc', url: 'http://orthanc:8042/dicom-web' }
 * ```
 */
export const ServiceConfigSchema = z.discriminatedUnion('kind', [
  StoreSCPConfigSchema.extend({ kind: z.literal('storeScp') }),
  ExternalDimseDestinationSchema.extend({ kind: z.literal('dimse') }),
  ExternalDicomwebDestinationSchema.extend({ kind: z.literal('dicomweb') }),
])

export type ServiceConfig = z.infer<typeof ServiceConfigSchema>

/** User-facing input type — `kind` + fields; storeScp fields keep storageKey requirement */
export type ServiceConfigInput =
  | ({ kind: 'storeScp' } & StoreScpConfigInput)
  | ({ kind: 'dimse' } & z.input<typeof ExternalDimseDestinationSchema>)
  | ({ kind: 'dicomweb' } & z.input<typeof ExternalDicomwebDestinationSchema>)

/**
 * Module configuration options
 */
export interface ModuleOptions {
  /**
   * Flat list of all DICOM services — internal StoreSCP servers and external send targets.
   * Each entry has a `kind` discriminator: `'storeScp'`, `'dimse'`, or `'dicomweb'`.
   */
  services?: ServiceConfigInput[]
}
