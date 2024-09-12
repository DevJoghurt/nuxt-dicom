import { cpSync } from 'node:fs'
import { join } from 'node:path'
import { defineNuxtModule, createResolver, addServerScanDir, logger, addComponent, installModule } from '@nuxt/kit'
import defu from 'defu'

// Module options TypeScript interface definition
export interface ModuleOptions {
  storeSCP: {
    enabled: boolean
    logs?: string
    port: number
    outDir: string
  }
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-dicom',
    configKey: 'dicom',
  },
  // Default configuration options of the Nuxt module
  defaults: {
    storeSCP: {
      enabled: true,
      port: 1223,
      outDir: 'tmp',
    },
  },
  async setup(_options, _nuxt) {
    const resolver = createResolver(import.meta.url)

    addServerScanDir(resolver.resolve('./runtime/server'))

    addComponent({
      name: 'DicomApp',
      filePath: resolver.resolve('./runtime/app/index.vue'),
      global: true,
    })
    // check if @nuxt/ui is installed
    await installModule('@nuxt/ui')

    // add tailwindcss support
    _nuxt.hook('tailwindcss:config', (tailwindConfig) => {
      tailwindConfig.content = tailwindConfig.content || []
      // @ts-ignore
      tailwindConfig.content.files = tailwindConfig.content.files || []
      // @ts-ignore
      tailwindConfig.content.files.push(resolver.resolve('./runtime/app/**/*.{vue,js,ts}'))
    })

    // add @nuxthealth/node-dicom to externals tracing because Store SCP Server is not part of nuxt building process
    if (_options.storeSCP.enabled) {
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
        })
      })

      const storeSCPScriptPath = _nuxt.options.dev ? resolver.resolve('./runtime/storescp/server.js') : 'build'

      const runtimeConfig = _nuxt.options.runtimeConfig
      runtimeConfig.dicom = defu(runtimeConfig?.dicom || {}, {
        storeSCP: {
          scriptPath: storeSCPScriptPath,
          port: _options.storeSCP.port,
          outDir: _options.storeSCP.outDir,
          logs: _options.storeSCP.logs || 'storescp.log',
        },
      })

      _nuxt.hook('nitro:build:public-assets', async (nitro) => {
        const targetDir = join(nitro.options.output.serverDir, './storescp.js')
        cpSync(resolver.resolve('./runtime/storescp/server.js'), targetDir, { recursive: true })
        logger.success('Added DICOM StoreSCP to output')
      })
    }
  },
})
