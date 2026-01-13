# Testing the DICOM App

## Quick Start

### 1. Build the Module
```bash
yarn build
yarn dev:prepare
```

### 2. Start the Playground
```bash
cd playground
npm run dev
```

### 3. Access the App
- **Built-in Route**: http://localhost:3000/_dicom
- **Create Service**: http://localhost:3000/_dicom/services/new

## Testing the Features

### Service Overview
1. Navigate to `/_dicom`
2. You should see:
   - Stats cards (Total Services, Running, DICOM Files, Total Events)
   - Service list (empty initially)
   - "New Service" button

### Create a Service
1. Click "New Service"
2. **Step 1 - Basic Info**:
   - Name: `test-scp`
   - Port: `11112`
   - AET Title: `TESTSERVER`
   - Click "Next"
3. **Step 2 - Storage**:
   - Path: `/tmp/dicom-store`
   - Toggle "Auto Start": on
   - Click "Next"
4. **Step 3 - Review**:
   - Verify all settings
   - Click "Create Service"

### Service Details
1. After creation, click on the service in the list
2. Should show tabs:
   - **Configuration**: Service settings you just entered
   - **Events**: (empty initially) Will show DICOM events
   - **Live Logs**: Terminal-style output with connection log

### Start/Stop Service
1. In the details page, click "Start" button
2. Status badge should change to "Running" (green)
3. Log tab should show "Service started" message
4. Click "Stop" to stop the service

## API Testing (curl)

### List Services
```bash
curl http://localhost:3000/api/dicom/services
```

Expected:
```json
[
  {
    "name": "test-scp",
    "port": 11112,
    "applicationEntityTitle": "TESTSERVER",
    "storePath": "/tmp/dicom-store",
    "autoStart": true,
    "status": "running",
    "fileCount": 0,
    "eventCount": 0,
    "lastActivityAt": 1704000000000
  }
]
```

### Get Service Details
```bash
curl http://localhost:3000/api/dicom/services/test-scp
```

### Get Service Events
```bash
curl http://localhost:3000/api/dicom/services/test-scp/events?limit=10
```

### Start Service
```bash
curl -X POST http://localhost:3000/api/dicom/services/test-scp/start
```

### Stop Service
```bash
curl -X POST http://localhost:3000/api/dicom/services/test-scp/stop
```

### Create Service
```bash
curl -X POST http://localhost:3000/api/dicom/services \
  -H "Content-Type: application/json" \
  -d '{
    "name": "new-service",
    "port": 11113,
    "applicationEntityTitle": "NEWSVC",
    "storePath": "/tmp/dicom-new",
    "autoStart": false
  }'
```

## Component Testing

### Use as Global Component
Update `playground/app.vue`:
```vue
<template>
  <div>
    <h1>My DICOM Dashboard</h1>
    <DicomApp />
  </div>
</template>
```

### Use with Custom Layout
Update `nuxt.config.ts`:
```ts
export default defineNuxtConfig({
  dicom: {
    route: true,
    routePath: '/_dicom',
    layout: 'custom' // Uses layouts/custom.vue
  }
})
```

## Dark Mode Testing
- Press `Ctrl+Shift+L` or use your theme toggle
- App should smoothly transition between light/dark themes
- All components should maintain contrast

## Responsive Design Testing
1. Open DevTools (F12)
2. Toggle device toolbar
3. Test on:
   - Mobile (375px)
   - Tablet (768px)
   - Desktop (1440px)
4. Stats cards should adapt: 1 col → 2 cols → 4 cols

## Performance Debugging

### Check Auto-refresh
1. Open DevTools Network tab
2. Navigate to services overview
3. Should see `/api/dicom/services` requests every 5 seconds
4. Navigate to service detail
5. Should see requests every 3 seconds
6. Leave page - requests should stop on unmount

### Memory Leaks
1. Open DevTools Memory tab
2. Navigate between pages (5-10 times)
3. Take heap snapshot
4. No significant growth should occur

## Error Cases

### Invalid Service Creation
```bash
# Missing required fields
curl -X POST http://localhost:3000/api/dicom/services \
  -H "Content-Type: application/json" \
  -d '{"name": "test"}'
# Expected: 400 - "Missing required fields: name, port"
```

### Duplicate Service Name
```bash
# Create service twice with same name
curl -X POST http://localhost:3000/api/dicom/services \
  -H "Content-Type: application/json" \
  -d '{"name": "dup", "port": 11114, "applicationEntityTitle": "DUP", "storePath": "/tmp"}'

# Second attempt:
# Expected: 409 - "Service 'dup' already exists"
```

### Non-existent Service
```bash
curl http://localhost:3000/api/dicom/services/doesnotexist
# Expected: 404 - "Service 'doesnotexist' not found"
```

## Database Testing

### Check Database Schema
```bash
sqlite3 .data/dicom.db ".schema"
```

Should see:
- `storescp_config` table (service configuration)
- `dicom_events` table (event log)
- Indexes on serviceName and eventType

### Query Events for Service
```bash
sqlite3 .data/dicom.db \
  "SELECT eventType, COUNT(*) FROM dicom_events WHERE serviceName='test-scp' GROUP BY eventType;"
```

## Known Limitations

1. **File Count**: Currently always 0 - needs DB aggregation query
2. **Event Count**: Currently always 0 - needs DB aggregation query
3. **No Event Creation**: Events only appear when handlers fire actual DICOM events
4. **No Edit Service**: Can only create and start/stop services
5. **No Delete Service**: No delete endpoint implemented yet
6. **Polling Only**: Uses polling instead of WebSocket for real-time updates

## Browser Compatibility
Tested and working on:
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

Requires ES2020 features (optional chaining, nullish coalescing)
