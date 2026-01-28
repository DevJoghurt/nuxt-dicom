# Nuxt DICOM

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

A comprehensive Nuxt module for working with DICOM (Digital Imaging and Communications in Medicine) files. Includes a Rust-based StoreSCP server, event-driven architecture, file management UI, and more.

## Features

- 🏥 **StoreSCP Server** - Rust-based DICOM receiver running alongside your Nuxt app
- 🎯 **Event-Driven** - React to DICOM events with server-side handlers
- 📁 **File Management** - Browse, download, and delete stored DICOM files via UI
- 🧹 **Auto Cleanup** - Automatic deletion of old files with configurable retention
- 📊 **Service Management** - Start/stop services and view live logs through UI
- 🔧 **Tag Extraction** - Configure which DICOM tags to extract automatically
- 📝 **Log Levels** - Configurable logging with runtime control
- 🎨 **Built-in UI** - Beautiful admin interface powered by Nuxt UI

## Installation

```bash
npm install @nuxthealth/dicom @nuxthealth/node-dicom
```

## Quick Start

### 1. Add Module to Config

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxthealth/dicom'],
  
  dicom: {
    // Service configuration
    services: {
      storeScp: {
        name: 'storeScp_1',
        port: 11112,
        callingAETitle: 'STORESCP',
        outDir: './dicom-storage',
        autoStart: true,
        extractTags: [
          'PatientName',
          'PatientID',
          'StudyDate',
          'Modality'
        ]
      }
    },
    
    // Optional: Auto-delete old files
    autoDeleteAfterDays: 30, // 0 = disabled
    
    // Optional: Default log level
    logLevel: 'info' // 'debug' | 'info' | 'warn' | 'error'
  }
})
```

### 2. Create Event Handlers

Create handlers in `server/dicom/` directory:

```typescript
// server/dicom/storeScp.onFileStored.ts
import { defineDicomEvent } from '#imports'

export default defineDicomEvent('storeScp_onFileStored', async (payload, { logger }) => {
  logger.info('File received', {
    file: payload.file,
    patient: payload.tags?.PatientName,
    modality: payload.tags?.Modality,
    studyDate: payload.tags?.StudyDate
  })
  
  // Your custom logic here
})
```

### 3. Access the UI

Start your development server:

```bash
npm run dev
```

Navigate to `/_dicom` to access the management interface where you can:
- View service status
- Start/stop services
- Browse stored files
- View live logs
- Manage file cleanup

## Using the DICOM UI Component

### Built-in Route (Recommended)

By default, the DICOM UI is available at `/_dicom`. To use it:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  dicom: {
    route: true,        // Enable the route (default)
    routePath: '/_dicom' // Customize the path
  }
})
```

Navigate to `/_dicom` in your browser to access the management interface.

### Custom Layout

Wrap the DICOM UI with a custom layout:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  dicom: {
    route: true,
    layout: 'admin'  // Use your 'admin' layout from layouts/admin.vue
  }
})
```

Or use a standalone page without any layout:

```typescript
export default defineNuxtConfig({
  dicom: {
    route: true,
    layout: false  // No layout wrapper (default)
  }
})
```

### Use Component Directly

Import and use the `DicomApp` component in your own pages or components:

```vue
<!-- pages/admin/dicom.vue -->
<template>
  <div>
    <h1>DICOM Management</h1>
    <DicomApp />
  </div>
</template>
```

The component is automatically registered as `DicomApp` and ready to use.

### Custom Integration with Composables

For more control, use the provided composables:

```vue
<!-- pages/custom-dicom.vue -->
<script setup>
import { ref } from 'vue'
import { useLiveServiceLogs } from '#app'
import { useLogLevel } from '#app'
import { useServiceFiles } from '#app'

const serviceName = ref('storeScp_1')
const { logs, isConnected } = useLiveServiceLogs(serviceName)
const { logLevel, setLogLevel } = useLogLevel(serviceName)
const { files, deleteFile, cleanup } = useServiceFiles(serviceName)
</script>

<template>
  <div class="dicom-admin">
    <!-- Your custom UI here -->
    <div class="logs">
      <h2>Logs</h2>
      <p>Status: {{ isConnected ? 'Connected' : 'Disconnected' }}</p>
      <div v-for="log in logs" :key="log.id" class="log-entry">
        {{ log.message }}
      </div>
    </div>

    <div class="settings">
      <h2>Log Level</h2>
      <select :value="logLevel" @change="setLogLevel">
        <option>debug</option>
        <option>info</option>
        <option>warn</option>
        <option>error</option>
      </select>
    </div>

    <div class="files">
      <h2>Files</h2>
      <button @click="cleanup(30)">Cleanup files older than 30 days</button>
    </div>
  </div>
</template>
```

## Configuration

### Service Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | `string` | Required | Unique service identifier |
| `port` | `number` | Required | Port for DICOM server |
| `callingAETitle` | `string` | `'STORESCP'` | Application Entity Title |
| `outDir` | `string` | `'./dicom-storage'` | Directory for storing files |
| `autoStart` | `boolean` | `true` | Start service automatically |
| `extractTags` | `string[]` | `[]` | DICOM tags to extract |

### Module Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `services` | `object` | `{}` | Service configurations |
| `autoDeleteAfterDays` | `number` | `0` | Days before auto-deletion (0 = disabled) |
| `logLevel` | `string` | `'info'` | Default log level for all services |
| `serviceLogs` | `object` | `{}` | Per-service log level overrides |

### Example: Multiple Services

```typescript
export default defineNuxtConfig({
  dicom: {
    services: {
      storeScp: {
        name: 'primary_scp',
        port: 11112,
        outDir: './storage/primary'
      },
      storeScp2: {
        name: 'backup_scp',
        port: 11113,
        outDir: './storage/backup'
      }
    },
    logLevel: 'info',
    serviceLogs: {
      primary_scp: 'debug',  // Override for specific service
      backup_scp: 'warn'
    }
  }
})
```

## Event Handlers

### Available Events

| Event | When Triggered | Payload |
|-------|---------------|---------|
| `OnFileStored` | After each DICOM file is received | `{ file, tags, studyInstanceUid, seriesInstanceUid }` |
| `OnStudyCompleted` | When a study is complete | `{ studyInstanceUid, series[], totalInstances }` |
| `OnServerStarted` | When service starts | `{ name, port, callingAETitle }` |
| `OnError` | On service error | `{ error, context }` |

### Creating Event Handlers

Create TypeScript files in the `server/dicom/` directory. File names can be anything (e.g., `storeScp.onFileStored.ts`), but the **event ID** passed to `defineDicomEvent()` must match the format `{serviceName}_{eventType}`.

**Available event IDs:**
- `storeScp_onFileStored` - After each file is received
- `storeScp_onStudyCompleted` - When a study is complete
- `storeScp_onServerStarted` - When service starts
- `storeScp_onError` - On service error

**Handler signature:**
```typescript
defineDicomEvent(eventId, async (payload, context) => {
  // payload: Event-specific data
  // context: { logger, serviceName }
  //   - logger: Service-scoped logger (automatically includes service name)
  //   - serviceName: Name of the service that triggered this event
})
```

**Basic example:**
```typescript
// server/dicom/storeScp.onFileStored.ts
import { defineDicomEvent } from '#imports'

export default defineDicomEvent('storeScp_onFileStored', async (payload, { logger }) => {
  // Logger is automatically scoped to the service - no need to pass service name!
  logger.info(`File received: ${payload.sopInstanceUid}`)
  
  // Access extracted tags
  const patientName = payload.tags?.PatientName
  const modality = payload.tags?.Modality
  
  logger.debug(`Patient: ${patientName}, Modality: ${modality}`)
})
```

**Using logger methods:**
```typescript
export default defineDicomEvent('storeScp_onStudyCompleted', async (payload, { logger }) => {
  const fileCount = payload.series.reduce((sum, s) => 
    sum + s.instances.length, 0
  )
  
  // Log at different levels - service name is automatically included
  logger.info(`Study completed: ${fileCount} files`)
  logger.debug(`Study UID: ${payload.studyInstanceUid}`)
  logger.warn('Low file count', { fileCount, threshold: 10 })
  logger.error('Processing failed', { error: 'Disk full' })
  
  // Metadata objects are displayed as expandable JSON in the UI
  logger.info('Study details', {
    studyInstanceUid: payload.studyInstanceUid,
    seriesCount: payload.series.length,
    fileCount
  })
})
```

### Payload Types

```typescript
// OnFileStored payload
interface OnFileStoredPayload {
  file: string                    // Absolute file path
  tags?: Record<string, any>      // Extracted DICOM tags
  studyInstanceUid: string
  seriesInstanceUid: string
  sopInstanceUid: string
}

// OnStudyCompleted payload
interface OnStudyCompletedPayload {
  studyInstanceUid: string
  series: Array<{
    seriesInstanceUid: string
    instances: Array<{
      sopInstanceUid: string
      file: string
    }>
  }>
  totalInstances: number
}
```

## File Management

### Browse Files via UI

Navigate to `/services/[serviceName]` → **Files** tab:

- View files in hierarchical tree structure (Study → Series → Instances)
- See file creation date and size
- Download individual files
- Delete files with confirmation
- Cleanup old files with custom retention period

### Programmatic Access

```typescript
// In your server API route
import { useStorage } from '#imports'

export default defineEventHandler(async (event) => {
  const storage = useStorage('dicom:storeScp_1')
  
  // List all files
  const files = await storage.getKeys()
  
  // Get file metadata
  const meta = await storage.getMeta('study:series:instance.dcm')
  
  // Read file
  const buffer = await storage.getItemRaw('study:series:instance.dcm')
  
  return { files, meta }
})
```

### File Cleanup

#### Automatic Cleanup

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  dicom: {
    autoDeleteAfterDays: 30  // Delete files older than 30 days
  }
})
```

When enabled:
- Initial cleanup runs 5 seconds after server start
- Daily cleanup runs at midnight
- Applies to all services
- Logs deleted file count

#### Manual Cleanup via UI

1. Go to service Files tab
2. Click "Cleanup Old Files"
3. Enter number of days
4. Confirm deletion

#### Programmatic Cleanup

```typescript
import { cleanupOldFiles } from '#imports'

// Cleanup specific service
const result = await cleanupOldFiles('storeScp_1', 30)

console.log(`Deleted ${result.deletedCount} files`)
```

## Log Management

### Configure Log Levels

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  dicom: {
    logLevel: 'info',  // Global default
    serviceLogs: {
      storeScp_1: 'debug',  // Per-service override
      storeScp_2: 'warn'
    }
  }
})
```

### Runtime Log Level Control

Log levels can be changed at runtime via:
- UI dropdown in service Logs tab
- API endpoint

```typescript
// Change log level via API
await $fetch('/api/dicom/log-level', {
  method: 'POST',
  body: {
    serviceName: 'storeScp_1',
    level: 'debug'
  }
})
```

### View Live Logs

Navigate to `/services/[serviceName]` → **Logs** tab:
- Real-time log streaming via WebSocket
- Filter by log level
- Download logs as text file
- Clear log buffer

## API Routes

The module provides these API endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dicom/services` | List all services |
| GET | `/api/dicom/services/:name` | Get service details |
| POST | `/api/dicom/services/:name/start` | Start a service |
| POST | `/api/dicom/services/:name/stop` | Stop a service |
| GET | `/api/dicom/services/:name/files` | List files in tree structure |
| GET | `/api/dicom/services/:name/files/download` | Download a file |
| DELETE | `/api/dicom/services/:name/files/delete` | Delete a file |
| POST | `/api/dicom/services/:name/cleanup` | Cleanup old files |
| GET | `/api/dicom/log-level` | Get current log levels |
| POST | `/api/dicom/log-level` | Update log level |

## Testing

### Send Test DICOM Files

Using dcmtk tools:

```bash
# Install dcmtk
brew install dcmtk  # macOS
apt-get install dcmtk  # Ubuntu

# Send a file
storescu -aec STORESCP localhost 11112 test.dcm

# Send multiple files
storescu -aec STORESCP localhost 11112 /path/to/study/*
```

Using the included script:

```bash
# From the module directory
node scripts/sendData.mjs
```

## Advanced Usage

### Custom Storage Backend

By default, files are stored in the filesystem. You can configure different storage backends:

```typescript
// Future support for S3, Azure Blob, etc.
export default defineNuxtConfig({
  dicom: {
    services: {
      storeScp: {
        storage: {
          type: 's3',
          bucket: 'my-dicom-bucket',
          region: 'us-east-1'
        }
      }
    }
  }
})
```

### Tag Extraction

Extract specific DICOM tags for use in event handlers:

```typescript
export default defineNuxtConfig({
  dicom: {
    services: {
      storeScp: {
        extractTags: [
          // Patient Information
          'PatientName',
          'PatientID',
          'PatientBirthDate',
          'PatientSex',
          'PatientAge',
          
          // Study Information
          'StudyDate',
          'StudyTime',
          'StudyDescription',
          'AccessionNumber',
          
          // Series Information
          'Modality',
          'SeriesDescription',
          'SeriesNumber',
          
          // Instance Information
          'InstanceNumber',
          'SOPInstanceUID'
        ]
      }
    }
  }
})
```

## Troubleshooting

### Service Won't Start

- Check if port is already in use: `lsof -i :[port]`
- Verify `outDir` has write permissions
- Check logs in the UI for error details

### Files Not Appearing

- Ensure `outDir` is correctly configured
- Check service is running (green status badge)
- Verify sender is using correct AE Title
- Check service logs for incoming connections

### Events Not Firing

- Verify event ID matches format: `{serviceName}_{eventType}` (e.g., `'storeScp_onFileStored'`)
- Check handler exports with `export default defineDicomEvent(...)`
- Ensure handler is in `server/dicom/` directory
- Restart dev server after creating new handlers
- Check console for event registration messages

## Development

```bash
# Install dependencies
npm install

# Generate type stubs
npm run dev:prepare

# Develop with playground
npm run dev

# Build
npm run dev:build

# Run tests
npm run test

# Lint
npm run lint
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

---

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/@nuxthealth/dicom/latest.svg?style=flat&colorA=020420&colorB=00DC82
[npm-version-href]: https://npmjs.com/package/@nuxthealth/dicom

[npm-downloads-src]: https://img.shields.io/npm/dm/@nuxthealth/dicom.svg?style=flat&colorA=020420&colorB=00DC82
[npm-downloads-href]: https://npmjs.com/package/@nuxthealth/dicom

[license-src]: https://img.shields.io/npm/l/@nuxthealth/dicom.svg?style=flat&colorA=020420&colorB=00DC82
[license-href]: https://npmjs.com/package/@nuxthealth/dicom

[nuxt-src]: https://img.shields.io/badge/Nuxt-020420?logo=nuxt.js
[nuxt-href]: https://nuxt.com
