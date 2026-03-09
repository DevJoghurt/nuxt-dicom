import { defineNuxtModule, createResolver, addServerScanDir, addComponent, addComponentsDir, addTemplate, updateTemplates, extendPages, addServerImports, addImports } from '@nuxt/kit'
import { join } from 'node:path'
import { readFileSync } from 'node:fs'
import defu from 'defu'
import type { StoreScpConfig, ServiceConfigInput, ExternalDicomDestination, DicomStorageConfig, DicomStorageConfigInput } from './runtime/utils/schema'
import { DicomConfigSchemas, ExternalDicomDestinationSchema, ServiceConfigSchema } from './runtime/utils/schema'
import { scanDicomEventHandlers, generateHandlersTemplate } from './utils/scanDicomHandlers'
import { watchDicomHandlers } from './utils/dev'

const resolver = createResolver(import.meta.url)
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'))

// Module options TypeScript interface definition
export interface ModuleOptions {
  /**
   * Enable the built-in UI route at /_dicom
   * @default true
   */
  route?: boolean
  /**
   * Custom route path for the DICOM app
   * @default '/_dicom'
   */
  routePath?: string
  /**
   * Layout to use for the route page
   * Set to false to use no layout (standalone page)
   * Set to a string to use a specific layout from your app
   * @default false
   */
  layout?: string | false
  /**
   * Default log level for all services
   * Can be overridden per service or at runtime via API
   * @default 'info'
   */
  logLevel?: 'debug' | 'info' | 'warn' | 'error'
  /**
   * Per-service log level overrides
   * @example { storeScp_1: 'debug', storeScp_2: 'warn' }
   */
  serviceLogs?: Record<string, 'debug' | 'info' | 'warn' | 'error'>
  /**
   * Named storage backends.
   * Each key becomes the storage name referenced by `storageKey` on a service.
   *
   * @example
   * ```ts
   * storages: {
   *   main: { storageBackend: 'Filesystem', outDir: 'dicom-storage', autoDeleteAfterDays: 30 },
   *   archive: { storageBackend: 'S3', s3Config: { ... } },
   * }
   * ```
   */
  storages?: Record<string, DicomStorageConfigInput>
  /**
   * All DICOM services — internal StoreSCP servers and external send targets.
   * Each entry must have a `kind` field: `'storeScp'`, `'dimse'`, or `'dicomweb'`.
   *
   * @example
   * ```ts
   * services: [
   *   { kind: 'storeScp', name: 'receiver', storageKey: 'main', port: 4446 },
   *   { kind: 'dimse', name: 'pacs', addr: 'PACS@192.168.1.10:104' },
   *   { kind: 'dicomweb', name: 'orthanc', url: 'http://orthanc:8042/dicom-web' },
   * ]
   * ```
   */
  services?: ServiceConfigInput[]
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-dicom',
    version: packageJson.version,
    configKey: 'dicom',
  },
  // Default configuration options of the Nuxt module
  defaults: {
    route: true,
    routePath: '/_dicom',
    layout: false,
    logLevel: 'info',
    serviceLogs: {},
    storages: {},
    services: [],
  },
  moduleDependencies: {
    '@nhealth/nutils': {},
  },
  async setup(options, nuxt) {
    // Scan server directory for plugins and API routes
    addServerScanDir(resolver.resolve('./runtime/server'))
    // add all libs to server imports
    addServerImports([{
      from: resolver.resolve('./runtime/utils/services'),
      name: 'storeSCPServiceManager',
    }, {
      from: resolver.resolve('./runtime/utils/storeSCUJobManager'),
      name: 'storeSCUJobManager',
    }, {
      from: resolver.resolve('./runtime/utils/serviceRegistry'),
      name: 'dicomServiceRegistry',
    }, {
      from: resolver.resolve('./runtime/utils/schema'),
      name: 'DicomConfigSchemas',
    }, {
      from: resolver.resolve('./runtime/utils/dicomEvents'),
      name: 'dicomEventEmitter',
    }, {
      from: resolver.resolve('./runtime/utils/defineDicomEvent'),
      name: 'defineDicomEvent',
    }, {
      from: resolver.resolve('./runtime/utils/defineDicomEvent'),
      name: 'defineDicomEventConfig',
    }, {
      from: resolver.resolve('./runtime/utils/defineDicomEvent'),
      name: 'registerDicomEvent',
    }, {
      from: resolver.resolve('./runtime/utils/defineDicomEvent'),
      name: 'emitDicomEvent',
    }, {
      from: resolver.resolve('./runtime/utils/logger'),
      name: 'dicomLogger',
    }])

    // Add components directory
    addComponentsDir({
      path: resolver.resolve('./runtime/app/components'),
      prefix: 'Dicom',
    })

    addComponent({
      name: 'DicomApp',
      filePath: resolver.resolve('./runtime/app/pages/index.vue'),
    })

    // Add auto-imports for composables
    addImports({
      name: 'useLiveServiceLogs',
      from: resolver.resolve('./runtime/app/composables/useLiveServiceLogs'),
    })

    addImports({
      name: 'useLogLevel',
      from: resolver.resolve('./runtime/app/composables/useLogLevel'),
    })

    addImports({
      name: 'useServiceFiles',
      from: resolver.resolve('./runtime/app/composables/useServiceFiles'),
    })

    addImports({
      name: 'useStorageFiles',
      from: resolver.resolve('./runtime/app/composables/useStorageFiles'),
    })

    // Add route if enabled
    if (options.route !== false) {
      extendPages((pages) => {
        pages.push({
          name: 'dicom-app',
          path: options.routePath || '/_dicom',
          file: resolver.resolve('./runtime/app/pages/index.vue'),
          meta: {
            layout: options.layout === false ? false : options.layout,
          },
        })
      })
    }

    // Scan DICOM handlers at build time
    const dicomDir = join(nuxt.options.serverDir, 'dicom')
    const scannedHandlers = await scanDicomEventHandlers(dicomDir)

    for (const handler of scannedHandlers) {
      console.log(`[nuxt-dicom] found handler: ${handler.serviceName} - ${handler.eventType} (${handler.filePath})`)
    }

    // Keep a mutable reference for dev updates
    let lastScannedHandlers = scannedHandlers

    // Generate handlers template (the actual module with handler imports)
    const HANDLERS_TEMPLATE = 'dicom-handlers.mjs'

    addTemplate({
      filename: HANDLERS_TEMPLATE,
      write: true,
      getContents: () => generateHandlersTemplate(lastScannedHandlers),
    })

    addServerImports({
      from: resolver.resolve(nuxt.options.buildDir, HANDLERS_TEMPLATE),
      name: 'registerDicomHandlers',
    })

    addServerImports({
      from: resolver.resolve(nuxt.options.buildDir, HANDLERS_TEMPLATE),
      name: 'DicomEventType',
    })

    // Watch for handler changes in dev mode
    if (nuxt.options.dev) {
      const refreshHandlers = async (reason: string) => {
        const updated = await scanDicomEventHandlers(dicomDir)
        lastScannedHandlers = updated

        // Update runtime config with new handlers
        runtimeConfig.dicom.handlers = updated.map(handler => ({
          serviceName: handler.serviceName,
          eventType: handler.eventType,
          eventId: handler.eventId,
          name: handler.name,
          description: handler.description,
        }))

        console.log(`[nuxt-dicom] handlers refreshed (${reason}): found ${updated.length} handler(s)`)

        await updateTemplates({
          filter: template => template.filename === HANDLERS_TEMPLATE,
        })
      }

      watchDicomHandlers({
        nuxt,
        _dicomDir: dicomDir,
        onRefresh: refreshHandlers,
      })
    }

    const runtimeConfig = nuxt.options.runtimeConfig

    // Process services from config — unified array with discriminated kind
    const processServices = (services: ServiceConfigInput[] = []) => {
      const storeScp: StoreScpConfig[] = []
      const external: ExternalDicomDestination[] = []
      let storeSCPIndex = 0

      for (const [idx, entry] of services.entries()) {
        const parsed = ServiceConfigSchema.safeParse(entry)
        if (!parsed.success) {
          console.warn(`[nuxt-dicom] Invalid service config at index ${idx}:`, parsed.error.issues)
          continue
        }
        const data = parsed.data
        if (data.kind === 'storeScp') {
          storeSCPIndex++
          if (!data.name) data.name = `storeScp_${storeSCPIndex}`
          const { s3Config, kind: _kind, ...serviceData } = data
          storeScp.push(s3Config ? { ...serviceData, s3Config } : serviceData as StoreScpConfig)
        }
        else {
          const { kind: _kind, ...destData } = data
          external.push(destData as ExternalDicomDestination)
        }
      }

      return { storeScp, external }
    }

    const { storeScp: registeredServices, external: registeredDestinations } = processServices(options.services)

    // Validate and normalise named storage configs
    const processStorages = (storages: Record<string, DicomStorageConfigInput> = {}): DicomStorageConfig[] => {
      return Object.entries(storages)
        .map(([name, config]) => {
          const parsed = DicomConfigSchemas.dicomStorage.safeParse(config)
          if (!parsed.success) {
            console.warn(`[nuxt-dicom] Invalid storage config "${name}":`, parsed.error.issues)
            return null
          }
          return { ...parsed.data, name }
        })
        .filter((s): s is DicomStorageConfig => s !== null)
    }

    const registeredStorages = processStorages(options.storages)

    // Merge storage config fields into each service that declares a storageKey
    const resolvedServices = registeredServices.map((service) => {
      if (!service.storageKey) {
        console.warn(`[nuxt-dicom] Service "${service.name}" has no storageKey — using schema defaults for storage`)
        return service
      }
      const storage = registeredStorages.find(s => s.name === service.storageKey)
      if (!storage) {
        console.warn(`[nuxt-dicom] Service "${service.name}" references unknown storage "${service.storageKey}"`)
        return service
      }
      console.log(`[nuxt-dicom] Merged storage "${storage.name}" into service "${service.name}"`)
      return {
        ...service,
        outDir: storage.outDir,
        storageBackend: storage.storageBackend,
        // Service-level value takes precedence over the storage default
        storeWithFileMeta: service.storeWithFileMeta ?? storage.storeWithFileMeta,
        autoDeleteAfterDays: storage.autoDeleteAfterDays,
        ...(storage.s3Config && { s3Config: storage.s3Config }),
      }
    })

    // Log registered services
    for (const service of resolvedServices) {
      console.log(`[nuxt-dicom] registered service: ${service.name} (port: ${service.port})`)
    }

    for (const dest of registeredDestinations) {
      console.log(`[nuxt-dicom] registered external service: ${dest.name} (${dest.protocol})`)
    }

    // Add to runtime config - simple list of configured services
    runtimeConfig.dicom = defu(runtimeConfig?.dicom || {}, {
      logLevel: options.logLevel,
      serviceLogs: options.serviceLogs,
      services: resolvedServices,
      storages: registeredStorages,
      destinations: registeredDestinations,
      handlers: scannedHandlers.map(handler => ({
        serviceName: handler.serviceName,
        eventType: handler.eventType,
        eventId: handler.eventId,
        name: handler.name,
        description: handler.description,
      })),
    })

    // Transpile generated handler templates
    const templatePath = join(nuxt.options.buildDir, HANDLERS_TEMPLATE)
    nuxt.options.build.transpile.push(templatePath)

    // Configure Nitro
    nuxt.hook('nitro:config', (nitroConfig) => {
      // Externalize @nuxthealth/node-dicom and all platform-specific packages
      // This prevents bundling and ensures native bindings work at runtime
      nitroConfig.externals = nitroConfig.externals || {}
      nitroConfig.externals.external = nitroConfig.externals.external || []

      if (!Array.isArray(nitroConfig.externals.external)) {
        nitroConfig.externals.external = [nitroConfig.externals.external]
      }

      nitroConfig.externals.external.push('@nuxthealth/node-dicom')

      // Enable WebSocket and database support
      nitroConfig.experimental = defu(nitroConfig.experimental, {
        websocket: true,
        database: true,
      })

      // Configure sqlite database for DICOM services
      nitroConfig.database = defu(nitroConfig.database, {
        dicom: {
          connector: 'sqlite',
          options: {
            name: 'dicom',
          },
        },
      })
    })
  },
})
