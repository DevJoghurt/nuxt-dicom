# Nuxt DICOM Module - Refactored Architecture

## Overview

This is a modern Nuxt 3 integration for the `@nuxthealth/node-dicom` library (v0.2.0+). The architecture has been completely refactored to support **inline service execution** (no external processes) with a powerful event-driven architecture.

### Key Changes from Previous Version

- ✅ **Inline Services**: StoreSCP runs inline within the Nuxt server process (scalable via CPU/memory allocation)
- ✅ **Event System**: Full event-driven architecture with `defineDicomEvent` composable
- ✅ **Automatic Scanning**: Discovers event handlers in `server/dicom` directory
- ✅ **Type Safety**: Full TypeScript support with inferred types
- ✅ **Dynamic Configuration**: Merge nuxt.config + sqlite at runtime
- ✅ **Modern Developer Experience**: Simple, intuitive APIs

## Architecture

### 1. Event System

The module provides a centralized event emitter for DICOM events:

```
Event Flow:
  StoreSCP Server → Event Emitter → Registered Handlers
```

**Events Supported:**
- `OnFileStored` - When a DICOM file is received and stored
- `OnStudyCompleted` - When a study is marked complete (no new files for timeout period)
- `OnServerStarted` - When the StoreSCP server starts listening
- `OnError` - When errors occur

### 2. Configuration Management

Configuration is merged from multiple sources:

```
┌─────────────────────┐
│  nuxt.config.ts     │ (Static)
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│ ConfigManager       │ (Merger)
│ - Static config     │
│ - Dynamic config    │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│  Runtime Config     │ (Active)
│  (Used by services) │
└─────────────────────┘
           ↑
           │
┌─────────────────────┐
│  SQLite DB          │ (Dynamic)
│  (Optional)         │
└─────────────────────┘
```

### 3. Service Management

Services are managed through the `StoreSCPServiceManager`:

```
Service Lifecycle:
  create → configure → start → emit events → stop
```

## Usage

### 1. Configure Services in `nuxt.config.ts`

```typescript
export default defineNuxtConfig({
  modules: ['@nuxthealth/dicom'],
  
  dicom: {
    services: {
      storeSCP: {
        // Single service or array
        name: 'primary-scp',
        port: 4446,
        callingAETitle: 'MY-HOSPITAL',
        outDir: './dicom-storage',
        extractTags: [
          'PatientName',
          'PatientID',
          'StudyDate',
          'Modality',
          'SeriesDescription'
        ],
        autoStart: true
      }
    }
  }
})
```

### 2. Create Event Handlers

Create files in `server/dicom/` directory following the naming convention: `{serviceName}.{eventType}.ts`

**Example: `server/dicom/primary-scp.onFileStored.ts`**

```typescript
import { defineDicomEvent } from '#imports'
import type { OnFileStoredPayload } from '~/server/utils/dicomEvents'

export default defineDicomEvent('OnFileStored', 
  async (payload: OnFileStoredPayload) => {
    console.log('File received:', {
      file: payload.file,
      patient: payload.tags?.PatientName,
      study: payload.studyInstanceUid
    })
    
    // Store metadata in database
    await db.dicom.files.insert({
      sopInstanceUid: payload.sopInstanceUid,
      filePath: payload.file,
      patientId: payload.tags?.PatientID,
      modality: payload.tags?.Modality
    })
  },
  { name: 'logAndStoreFile' }
)
```

**Example: `server/dicom/primary-scp.onStudyCompleted.ts`**

```typescript
import { defineDicomEvent } from '#imports'
import type { OnStudyCompletedPayload } from '~/server/utils/dicomEvents'

export default defineDicomEvent('OnStudyCompleted',
  async (payload: OnStudyCompletedPayload) => {
    const totalInstances = payload.series.reduce(
      (sum, s) => sum + s.instances.length, 
      0
    )
    
    console.log(`Study ${payload.studyInstanceUid} completed with ${totalInstances} instances`)
    
    // Trigger post-processing or archiving
    await $fetch('/api/dicom/process-study', {
      method: 'POST',
      body: { studyUid: payload.studyInstanceUid }
    })
  }
)
```

### 3. Define Multiple Services

**Multiple StoreSCP Services in Config:**

```typescript
dicom: {
  services: {
    storeSCP: [
      {
        name: 'ct-scanner',
        port: 4446,
        callingAETitle: 'CT-SCP',
        abstractSyntaxMode: 'Custom',
        abstractSyntaxes: getCommonSopClasses().ct
      },
      {
        name: 'mri-scanner',
        port: 4447,
        callingAETitle: 'MRI-SCP',
        abstractSyntaxMode: 'Custom',
        abstractSyntaxes: getCommonSopClasses().mr
      }
    ]
  }
}
```

**Event handlers for each:**

- `server/dicom/ct-scanner.onFileStored.ts`
- `server/dicom/mri-scanner.onFileStored.ts`
- etc.

### 4. Manage Services at Runtime (API)

**Get all services:**
```typescript
// GET /api/dicom/services
const response = await $fetch('/api/dicom/services')
// Returns: { name, config, running, ... }
```

**Create a new service:**
```typescript
// POST /api/dicom/services
await $fetch('/api/dicom/services', {
  method: 'POST',
  body: {
    name: 'new-service',
    config: { port: 4448, ... }
  }
})
```

**Start/Stop a service:**
```typescript
// POST /api/dicom/services/[name]/start
await $fetch('/api/dicom/services/my-scp/start', { method: 'POST' })

// POST /api/dicom/services/[name]/stop
await $fetch('/api/dicom/services/my-scp/stop', { method: 'POST' })
```

## Configuration Options

### StoreSCP Configuration Schema

```typescript
interface StoreSCPConfig {
  // Service identification
  name?: string                    // Service name for routing (required if multiple services)
  
  // Network
  port?: number                    // Default: 4446
  callingAETitle?: string          // Default: 'STORE-SCP'
  maxPduLength?: number            // Default: 16384
  
  // Storage
  outDir?: string                  // Default: './dicom-storage'
  storageBackend?: 'Filesystem' | 'S3'  // Default: 'Filesystem'
  storeWithFileMeta?: boolean      // Default: false
  
  // S3 (required if storageBackend is 'S3')
  s3Config?: {
    bucket: string
    accessKey: string
    secretKey: string
    endpoint: string
    region?: string
  }
  
  // Tag extraction
  extractTags?: string[]           // DICOM tag names to extract
  extractCustomTags?: Array<{ tag: string; name: string }>
  
  // SOP Classes
  abstractSyntaxMode?: 'AllStorage' | 'All' | 'Custom'
  abstractSyntaxes?: string[]      // SOP Class UIDs
  
  // Transfer Syntax
  transferSyntaxMode?: 'All' | 'UncompressedOnly' | 'Custom'
  transferSyntaxes?: string[]      // Transfer Syntax UIDs
  
  // Study completion
  studyTimeout?: number            // Default: 30 seconds
  
  // Logging
  verbose?: boolean                // Default: false
  
  // Auto-start
  autoStart?: boolean              // Default: true
}
```

## Event Types & Payloads

### OnFileStored

```typescript
interface OnFileStoredPayload {
  serviceName: string
  file: string                          // File path
  sopInstanceUid: string
  sopClassUid: string
  transferSyntaxUid: string
  studyInstanceUid: string
  seriesInstanceUid: string
  tags?: Record<string, string>         // Extracted DICOM tags
}
```

### OnStudyCompleted

```typescript
interface OnStudyCompletedPayload {
  serviceName: string
  studyInstanceUid: string
  tags?: Record<string, string>         // Study-level tags
  series: Array<{
    seriesInstanceUid: string
    tags?: Record<string, string>       // Series-level tags
    instances: Array<{
      sopInstanceUid: string
      sopClassUid: string
      transferSyntaxUid: string
      file: string
      tags?: Record<string, string>     // Instance-level tags
    }>
  }>
}
```

### OnServerStarted

```typescript
interface OnServerStartedPayload {
  serviceName: string
  message: string
}
```

### OnError

```typescript
interface OnErrorPayload {
  serviceName: string
  error: Error | string
  context?: string
}
```

## Scaling & Performance

### Inline Execution Model

Unlike the previous process-based approach, services now run inline within the Nuxt server:

**Advantages:**
- ✅ Single process model (simpler deployment)
- ✅ Direct event/data access
- ✅ No inter-process communication overhead
- ✅ Easier debugging and profiling

**Scaling:**
- Horizontal: Run multiple Nuxt instances (with Docker, K8s, etc.)
- Vertical: Allocate more CPU/memory to the Nuxt process
- Multiple services: Configure multiple ports in a single instance

### Example Docker Setup

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY . .

RUN npm install && npm run build

# Allocate 4 CPUs and 4GB RAM
# This allows the inline services to utilize these resources
ENV NODE_OPTIONS=--max-old-space-size=3500

EXPOSE 4446 4447
CMD ["node", ".output/server/index.mjs"]
```

### Example Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nuxt-dicom
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: nuxt-dicom
        image: my-registry/nuxt-dicom:latest
        ports:
        - containerPort: 4446  # Primary StoreSCP
        - containerPort: 4447  # Secondary StoreSCP (if configured)
        resources:
          requests:
            memory: "2Gi"
            cpu: "2"
          limits:
            memory: "4Gi"
            cpu: "4"
        env:
        - name: NODE_ENV
          value: production
```

## Directory Structure

```
project/
├── nuxt.config.ts                 # Service configuration
├── server/
│   ├── dicom/                      # Event handlers directory
│   │   ├── primary-scp.onFileStored.ts
│   │   ├── primary-scp.onStudyCompleted.ts
│   │   └── primary-scp.onServerStarted.ts
│   └── api/
│       └── dicom/
│           └── services/
│               ├── index.get.ts    # List services
│               ├── index.post.ts   # Create service
│               └── [name]/
│                   ├── start.post.ts
│                   └── stop.post.ts
└── src/
    └── runtime/
        └── server/
            ├── utils/
            │   ├── dicomEvents.ts      # Event system
            │   ├── configManager.ts    # Config merger
            │   ├── storeSCPManager.ts  # Service lifecycle
            │   ├── scanDicomHandlers.ts # Auto-discovery
            │   └── schema.ts           # Configuration schema
            ├── composables/
            │   └── defineDicomEvent.ts # Event definition API
            └── plugins/
                └── initDicomServices.ts # Initialization
```

## Development Tips

### 1. Enable Verbose Logging

```typescript
dicom: {
  services: {
    storeSCP: {
      verbose: true  // See detailed DICOM protocol logs
    }
  }
}
```

### 2. Use Development Ports

```typescript
dicom: {
  services: {
    storeSCP: {
      port: 4446  // Standard DICOM requires port 104 with sudo
    }
  }
}
```

### 3. Test with dcmtk Tools

```bash
# Send test file (install dcmtk first)
storescu -aec MY-SCP localhost 4446 test.dcm

# Receive test files
storescp +r +d localhost 4446 -od ./received
```

### 4. Database Integration (Future)

The module is configured with a sqlite database connector:

```typescript
// Access in event handlers (when DB integration is implemented)
const db = useDatabase('dicom')
await db.query(`SELECT * FROM files WHERE study_uid = ?`, [studyUid])
```

## Migration Guide

### From Process-Based to Inline

**Before (Process-based):**
```typescript
// Old config
storeSCP: {
  autorun: false,
  port: '4446',
  outDir: 'dicom',
  servicePaths: { storeSCP: './storescp/server.js' }
}
```

**After (Inline):**
```typescript
// New config
storeSCP: {
  name: 'primary',
  port: 4446,
  outDir: './dicom-storage',
  autoStart: true
}
```

**Event Handlers:**
```typescript
// Old way (server/dicom plugins)
// New way (server/dicom event handlers with defineDicomEvent)
export default defineDicomEvent('OnFileStored', async (payload) => {
  // Handler logic
})
```

## Advanced Topics

### Custom Storage Backend

While the module supports Filesystem and S3, you can extend it:

1. Fork the `node-dicom-rs` library
2. Add custom storage backend to StoreScp
3. Use it in your Nuxt config

### Event Pipeline Integration

When `nhealthorg/nvent` event system is ready, the module will support:

```typescript
// Future API
storeSCP: {
  eventPipeline: 'nvent-bus',  // Route events through nvent system
  eventNamespace: 'dicom.storescp'
}
```

## Troubleshooting

### Port Permission Denied

```
Error: listen EACCES: permission denied 0.0.0.0:104
```

Solution: Use port > 1024 or run with sudo

### Files Not Stored

Check:
1. `outDir` exists and is writable
2. Disk space available
3. DICOM tags in `extractTags` configuration match actual data

### Study Not Completing

Increase `studyTimeout`:
```typescript
storeSCP: {
  studyTimeout: 60  // Wait 60 seconds instead of default 30
}
```

## Support & Contributing

For issues, feature requests, or contributions:
- Repository: https://github.com/DevJoghurt/nuxt-dicom
- node-dicom-rs: https://github.com/DevJoghurt/node-dicom-rs
- Documentation: https://github.com/DevJoghurt/node-dicom-rs/blob/main/docs/storescp.md

## License

MIT
