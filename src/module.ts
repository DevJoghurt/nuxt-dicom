import { cpSync } from 'node:fs'
import { join } from 'node:path'
import { defineNuxtModule, createResolver, addServerScanDir, logger, addComponent } from '@nuxt/kit'
import defu from 'defu'
import type { StoreSCPConfig } from './runtime/server/utils/schema'

// Module options TypeScript interface definition
export interface ModuleOptions {
  servicePaths?: {
    storeSCP: string
  },
  storeSCP: StoreSCPConfig
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-dicom',
    configKey: 'dicom',
  },
  // Default configuration options of the Nuxt module
  defaults: {
    storeSCP: {
      enabled: false
    },
  },
  async setup(_options, _nuxt) {
    const resolver = createResolver(import.meta.url)

    addServerScanDir(resolver.resolve('./runtime/server'))

    addComponent({
      name: 'StoreSCP',
      filePath: resolver.resolve('./runtime/app/store_scp/index.vue'),
      global: true,
    })

    const runtimeConfig = _nuxt.options.runtimeConfig

    runtimeConfig.dicom = defu(runtimeConfig?.dicom || {}, {
      servicePaths: {
        storeSCP: _options.servicePaths?.storeSCP || _nuxt.options.dev ? resolver.resolve('./runtime/storescp/server.js') : 'build',
      },
      // add _options with servicePaths
      storeSCP: _options.storeSCP,
    })

    // add @nuxthealth/node-dicom to externals tracing because Store SCP Server is not part of nuxt build process
    _nuxt.hook('nitro:config', (nitroConfig) => {
      if (!nitroConfig.externals?.traceInclude) {
        nitroConfig.externals = defu(_nuxt.options.nitro.externals || {}, {
          traceInclude: [],
        })
      }
      nitroConfig.externals.traceInclude?.push('node_modules/@nuxthealth/node-dicom/index.js') // add dicom module to externals

      // add websocket support
      nitroConfig.experimental = defu(nitroConfig.experimental, {
        websocket: true,
        database: true
      })

      // add database for DICOM related data that need persistence
      nitroConfig.database = defu(nitroConfig.database, {
        dicom: {
          connector: 'sqlite',
          options: {
            name: 'dicom'
          }
        }
      })

    })

    // add storescp server to nitro build
    _nuxt.hook('nitro:build:public-assets', async (nitro) => {
      const targetDir = join(nitro.options.output.serverDir, './storescp.js')
      cpSync(resolver.resolve('./runtime/storescp/server.js'), targetDir, { recursive: true })
      logger.success('Added DICOM StoreSCP to output')
    })

  },
})
