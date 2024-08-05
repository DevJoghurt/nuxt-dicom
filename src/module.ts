import { defineNuxtModule, addPlugin, createResolver, addServerScanDir, logger } from '@nuxt/kit'
import defu from 'defu'
import { cpSync } from "node:fs";
import { join } from 'node:path'

// Module options TypeScript interface definition
export interface ModuleOptions {
  storeSCP: {
    enabled: boolean;
    logs?: string;
    port: number;
    outDir: string;
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
      port: 4446,
      outDir: 'tmp'
    }
  },
  setup(_options, _nuxt) {
    const resolver = createResolver(import.meta.url)

    addServerScanDir(resolver.resolve('./runtime/server'))

    // add @nuxthealth/node-dicom to externals tracing because Store SCP Server is not part of nuxt building process
    if(_options.storeSCP.enabled){
      if(!_nuxt.options.nitro.externals?.traceInclude){
        _nuxt.options.nitro.externals = defu(_nuxt.options.nitro.externals || {}, {
          traceInclude: []
        })
      }
      _nuxt.options.nitro.externals.traceInclude?.push('node_modules/pm2/lib/ProcessContainerFork.js') // add missing file to use pm2 in production build
      _nuxt.options.nitro.externals.traceInclude?.push('@nuxthealth/node-dicom')
  
      let storeSCPScriptPath = _nuxt.options.dev ? resolver.resolve('./runtime/storescp/server.mjs') : 'build'

      const runtimeConfig = _nuxt.options.runtimeConfig
      runtimeConfig.dicom = defu(runtimeConfig?.dicom || {}, {
        storeSCP: {
          scriptPath: storeSCPScriptPath,
          port: _options.storeSCP.port,
          outDir: _options.storeSCP.outDir,
          logs: join(_nuxt.options.srcDir,'storescp.log')
        }
      })

      _nuxt.hook("nitro:build:public-assets", async (nitro) => {
        const targetDir = join(nitro.options.output.serverDir, 'storescp.mjs');
        cpSync(resolver.resolve('./runtime/storescp/server.mjs'), targetDir, { recursive: true });
        logger.success('Added DICOM StoreSCP to output');
      })  
    }

  },
})
