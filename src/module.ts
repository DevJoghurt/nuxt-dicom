import { defineNuxtModule, createResolver, addServerScanDir, addComponent, addComponentsDir, addTemplate, updateTemplates, extendPages, addServerImports } from '@nuxt/kit'
import { join } from 'node:path'
import { readFileSync } from 'node:fs'
import defu from 'defu'
import type { StoreScpConfig } from './runtime/utils/schema'
import { DicomConfigSchemas } from './runtime/utils/schema'
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
  services?: {
    storeScp?: StoreScpConfig | StoreScpConfig[]
  }
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
    services: {
      storeScp: undefined,
    },
  },
  moduleDependencies: {
    '@nhealth/nutils': {},
  },
  async setup(options, nuxt) {
    // Scan server directory for plugins and API routes
    addServerScanDir(resolver.resolve('./runtime/server'))
    // add all libs to server imports
    addServerImports([{
      from: resolver.resolve('./runtime/utils/storeSCPManager'),
      name: 'storeSCPServiceManager',
    }, {
      from: resolver.resolve('./runtime/utils/serviceRegistry'),
      name: 'dicomServiceRegistry',
    }, {
      from: resolver.resolve('./runtime/utils/schema'),
      name: 'DicomConfigSchemas',
    }, {
      from: resolver.resolve('./runtime/utils/schema'),
      name: 'StoreScpConfig',
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

    // Process services from config - convert single or array to normalized array with validation
    const processServices = (services: unknown): StoreScpConfig[] => {
      if (!services) return []

      const serviceArray = Array.isArray(services) ? services : [services as StoreScpConfig]

      return serviceArray
        .map((config, idx) => {
          // Validate config using Zod schema
          const validated = DicomConfigSchemas.storeSCP.safeParse(config)

          if (!validated.success) {
            console.warn(
              `[nuxt-dicom] Invalid StoreSCP configuration at index ${idx}:`,
              validated.error.issues,
            )
            return null
          }

          // Generate name if not provided
          if (!validated.data.name) {
            validated.data.name = `storeScp_${idx + 1}`
          }

          return validated.data
        })
        .filter((config): config is StoreScpConfig => config !== null)
    }

    const registeredServices = processServices(options.services?.storeScp)

    // Log registered services
    for (const service of registeredServices) {
      console.log(`[nuxt-dicom] registered service: ${service.name} (port: ${service.port})`)
    }

    // Add to runtime config - simple list of configured services
    runtimeConfig.dicom = defu(runtimeConfig?.dicom || {}, {
      services: registeredServices,
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
      // Add @nuxthealth/node-dicom to externals tracing
      if (!nitroConfig.externals?.traceInclude) {
        nitroConfig.externals = defu(nuxt.options.nitro.externals || {}, {
          traceInclude: [],
        })
      }
      nitroConfig.externals.traceInclude?.push('node_modules/@nuxthealth/node-dicom/index.js')

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
