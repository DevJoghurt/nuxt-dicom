# Quick Start Guide - Nuxt DICOM Module v0.2.0+

## Installation

```bash
npm install @nuxthealth/dicom @nuxthealth/node-dicom
```

## Basic Setup (5 minutes)

### 1. Enable the Module

**`nuxt.config.ts`**
```typescript
export default defineNuxtConfig({
  modules: ['@nuxthealth/dicom'],
  
  dicom: {
    services: {
      storeSCP: {
        port: 4446,
        callingAETitle: 'MY-SCP',
        outDir: './dicom-files'
      }
    }
  }
})
```

### 2. Create an Event Handler

**`server/dicom/storeScp.onFileStored.ts`**
```typescript
import { defineDicomEvent } from '#imports'

export default defineDicomEvent('OnFileStored', async (payload) => {
  console.log('✓ File received:', {
    file: payload.file,
    patient: payload.tags?.PatientName,
    modality: payload.tags?.Modality
  })
})
```

### 3. Run Your App

```bash
npm run dev
```

The DICOM server is now running on port 4446!

---

## Common Tasks

### Send a Test File

Using dcmtk tools:
```bash
# Install: brew install dcmtk
storescu -aec MY-SCP localhost 4446 test.dcm
```

### Handle Study Completion

**`server/dicom/storeScp.onStudyCompleted.ts`**
```typescript
import { defineDicomEvent } from '#imports'

export default defineDicomEvent('OnStudyCompleted', async (payload) => {
  const fileCount = payload.series.reduce((sum, s) => 
    sum + s.instances.length, 0
  )
  
  console.log(`Study ${payload.studyInstanceUid} complete: ${fileCount} files`)
})
```

### Extract DICOM Tags

```typescript
dicom: {
  services: {
    storeSCP: {
      extractTags: [
        'PatientName',
        'PatientID', 
        'PatientAge',
        'StudyDate',
        'StudyDescription',
        'Modality',
        'SeriesDescription',
        'InstanceNumber'
      ]
    }
  }
}
```

### Multiple Services (CT + MR)

```typescript
dicom: {
  services: {
    storeSCP: [
      {
        name: 'ct-receiver',
        port: 4446,
        callingAETitle: 'CT-SCP'
      },
      {
        name: 'mri-receiver',
        port: 4447,
        callingAETitle: 'MRI-SCP'
      }
    ]
  }
}
```

Then create handlers for each:
- `server/dicom/ct-receiver.onFileStored.ts`
- `server/dicom/mri-receiver.onFileStored.ts`

### Store to S3

```typescript
dicom: {
  services: {
    storeSCP: {
      storageBackend: 'S3',
      s3Config: {
        bucket: 'medical-dicom',
        accessKey: process.env.AWS_ACCESS_KEY_ID,
        secretKey: process.env.AWS_SECRET_ACCESS_KEY,
        endpoint: 'https://s3.amazonaws.com',
        region: 'us-east-1'
      }
    }
  }
}
```

### Manage Services at Runtime

```typescript
// List all services
const { services } = await $fetch('/api/dicom/services')

// Start/stop services
await $fetch('/api/dicom/services/ct-receiver/start', { method: 'POST' })
await $fetch('/api/dicom/services/ct-receiver/stop', { method: 'POST' })

// Create new service
await $fetch('/api/dicom/services', {
  method: 'POST',
  body: {
    name: 'new-scp',
    config: { port: 4448, ... }
  }
})
```

---

## Event Types & Payloads

### OnFileStored
```typescript
interface OnFileStoredPayload {
  serviceName: string
  file: string                      // File path
  sopInstanceUid: string
  studyInstanceUid: string
  seriesInstanceUid: string
  tags?: Record<string, string>     // Extracted DICOM tags
}
```

### OnStudyCompleted
```typescript
interface OnStudyCompletedPayload {
  serviceName: string
  studyInstanceUid: string
  series: Array<{
    seriesInstanceUid: string
    instances: Array<{
      sopInstanceUid: string
      file: string
      tags?: Record<string, string>
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

---

## Troubleshooting

### "Port already in use"
```typescript
// Use a different port
dicom: {
  services: {
    storeSCP: { port: 4448 }  // Change from 4446
  }
}
```

### "Permission denied (port 104)"
```typescript
// Port 104 requires root. Use port > 1024
dicom: {
  services: {
    storeSCP: { port: 4446 }  // Not 104
  }
}
```

### "Files not storing"
Check:
1. `outDir` directory exists and is writable
2. Disk space available
3. `storageBackend` is 'Filesystem' or S3 config is correct

### "Study not completing"
```typescript
// Increase timeout if study has many files
dicom: {
  services: {
    storeSCP: { studyTimeout: 60 }  // Increase from default 30
  }
}
```

### Enable verbose logging
```typescript
dicom: {
  services: {
    storeSCP: { verbose: true }  // See DICOM protocol details
  }
}
```

---

## File Naming Convention

All handlers must be in `server/dicom/` and follow this pattern:

```
{serviceName}.{eventType}.ts

Examples:
- storeScp.onFileStored.ts
- storeScp.onStudyCompleted.ts
- storeScp.onServerStarted.ts
- ct-receiver.onFileStored.ts
- mri-receiver.onStudyCompleted.ts
```

---

## Next Steps

1. **Review Full Documentation**: See `REFACTORING.md` for complete guide
2. **Configuration Reference**: See `REFACTORING.md` for all config options
3. **Advanced Examples**: Check `playground/server/dicom/*.example.ts`
4. **Scaling**: Read scaling section in `REFACTORING.md` for deployment strategies

---

## Support

- 📚 Full Documentation: `REFACTORING.md`
- 💡 Implementation Summary: `IMPLEMENTATION_SUMMARY.md`
- 🔗 node-dicom-rs: https://github.com/DevJoghurt/node-dicom-rs
- 📖 StoreSCP Docs: https://github.com/DevJoghurt/node-dicom-rs/blob/main/docs/storescp.md
