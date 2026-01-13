# Nuxt DICOM Module - Architecture Diagrams

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Nuxt Application                             │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │             Runtime Configuration                        │   │
│  │  (Merged: nuxt.config + Database + Runtime updates)     │   │
│  └────────────────────┬─────────────────────────────────────┘   │
│                       │                                           │
│  ┌────────────────────▼─────────────────────────────────────┐   │
│  │            DicomConfigManager                             │   │
│  │  ─ Manages static/dynamic config merge                   │   │
│  │  ─ Provides config to services                           │   │
│  │  ─ Database integration point                            │   │
│  └────────────────────┬─────────────────────────────────────┘   │
│                       │                                           │
│      ┌────────────────┼────────────────┐                         │
│      │                │                │                         │
│      ▼                ▼                ▼                         │
│  ┌────────┐      ┌────────┐      ┌────────┐                     │
│  │StoreSCP│      │StoreSCP│      │StoreSCP│                     │
│  │ Port   │      │ Port   │      │ Port   │                     │
│  │ 4446   │      │ 4447   │      │ 4448   │                     │
│  └────┬───┘      └────┬───┘      └────┬───┘                     │
│       │               │               │                          │
│       └───────────────┼───────────────┘                          │
│                       │                                           │
│       ┌───────────────▼───────────────┐                          │
│       │   DicomEventEmitter           │                          │
│       │   ─ Central event hub         │                          │
│       │   ─ Handler registry          │                          │
│       │   ─ Event dispatch            │                          │
│       └───────────────┬───────────────┘                          │
│                       │                                           │
│       ┌───────────────┼───────────────┐                          │
│       │               │               │                          │
│       ▼               ▼               ▼                          │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐                      │
│  │  Auto   │    │ Runtime │    │Database │                      │
│  │Discovered│    │Handlers │    │Handlers │                     │
│  │Handlers │    │(API)    │    │(Future) │                     │
│  └─────────┘    └─────────┘    └─────────┘                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Event Flow

```
DICOM Client                    StoreSCP Server              Event System              Handlers
     │                               │                            │                       │
     ├─ Send File ─────────────────→ │                            │                       │
     │                               │                            │                       │
     │                          ┌────▼────┐                       │                       │
     │                          │ Receive │                       │                       │
     │                          │ & Store │                       │                       │
     │                          │  File   │                       │                       │
     │                          └────┬────┘                       │                       │
     │                               │                            │                       │
     │                          ┌────▼──────────────────────┐    │                       │
     │                          │ Emit OnFileStored Event   │────┼──→ Registered Handlers
     │                          └────┬──────────────────────┘    │          │
     │                               │                            │          │
     │                          ┌────▼──────────────────────┐    │          ▼
     │                          │ More files arrive...      │    │    Execute Handler 1
     │                          │ Study timeout counting... │    │          │
     │                          └────┬──────────────────────┘    │          ├─ Log File
     │                               │                            │          ├─ Store DB
     │                          ┌────▼──────────────────────┐    │          ├─ Send Webhook
     │                          │ No new files for N sec    │    │          └─ Trigger Processing
     │                          │ Study is complete!        │    │
     │                          └────┬──────────────────────┘    │    Execute Handler 2
     │                               │                            │          │
     │                          ┌────▼──────────────────────┐    │          └─ Archive
     │                          │ Emit OnStudyCompleted     │────┼──→ Registered Handlers
     │                          │ Event with all data       │    │          │
     │                          └───────────────────────────┘    │          ▼
     │                               │                            │    Process Study
     │                               │                            │
     ▼                               ▼                            ▼
```

## Configuration Merge Flow

```
┌────────────────────────────────────────────────────────────┐
│           Configuration Sources                             │
└────────────────────────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
   ┌─────────┐  ┌──────────┐  ┌────────────┐
   │nuxt.    │  │Runtime   │  │SQLite      │
   │config   │  │Updates   │  │Database    │
   │(static) │  │(API)     │  │(Dynamic)   │
   └────┬────┘  └─────┬────┘  └─────┬──────┘
        │             │             │
        │     Priority (highest first)
        │             │             │
        └─────────────┼─────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │  DicomConfigManager         │
        │  ┌─────────────────────────┐│
        │  │ Merge Logic             ││
        │  │ Dynamic > Static        ││
        │  │ Latest > Original       ││
        │  └─────────────────────────┘│
        └────────────┬────────────────┘
                     │
                     ▼
        ┌─────────────────────────────┐
        │  Merged Runtime Config      │
        │  (Used by all services)     │
        └─────────────────────────────┘
```

## Service Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                   Service Lifecycle                         │
└─────────────────────────────────────────────────────────────┘

  1. Create                    2. Configure              3. Start
  ┌──────────┐                ┌──────────┐             ┌──────────┐
  │ Validate │─────NO────────→│ Invalid  │             │ Listen   │
  │ Config   │                │ Error    │             │ on Port  │
  └────┬─────┘                └──────────┘             └────┬─────┘
       │                                                    │
       YES                                                  │
       │                                              ┌─────┴──────┐
       ▼                                              │            │
  ┌──────────┐              ┌──────────┐         SUCCESS       FAIL
  │ Create   │─────────────→│ Register │─────────────┤            │
  │ StoreScp │              │ Events   │             │            ▼
  │ Instance │              │ Handlers │             │       ┌──────────┐
  └──────────┘              └──────────┘             │       │ OnError  │
                                                      │       │ Event    │
                                            ┌─────────▼──────┐└──────────┘
                                            │                │
                                            ▼                ▼
                                      ┌──────────┐    ┌──────────┐
                                      │Running   │    │Stopped   │
                                      │Service   │    │Service   │
                                      └────┬─────┘    └──────────┘
                                           │
                                    ┌──────┴──────┐
                                    │             │
                              4. Stop       5. Remove
                                    │             │
                                    ▼             ▼
                              ┌──────────┐  ┌──────────┐
                              │Cleanup   │  │Delete    │
                              │Resources │  │Instance  │
                              └──────────┘  └──────────┘
```

## Handler Discovery Process

```
┌─────────────────────────────────────────────────────────┐
│           Handler Discovery & Registration               │
└─────────────────────────────────────────────────────────┘

1. Scan Directory
┌──────────────┐
│ server/dicom │
└──────┬───────┘
       │
       ├─ storeScp.onFileStored.ts
       ├─ storeScp.onStudyCompleted.ts
       ├─ ct-receiver.onFileStored.ts
       └─ (other files filtered out)
       │
       ▼
2. Parse Files
┌─────────────────────────────────┐
│ Extract:                        │
│ - Service Name (from filename)  │
│ - Event Type (from filename)    │
│ - Handler Function (from export)│
└─────────┬───────────────────────┘
          │
          ▼
3. Validate
┌─────────────────────────────────┐
│ Check:                          │
│ - Valid event type?             │
│ - Valid handler export?         │
│ - No parsing errors?            │
└─────────┬───────────────────────┘
          │
      ┌───┴───┐
      │       │
    VALID   INVALID
      │       │
      ▼       ▼
4a. Register  4b. Log Warning
┌──────────────────────────┐
│ DicomEventEmitter.on(    │
│   serviceName,           │
│   eventType,             │
│   handlerFunction        │
│ )                        │
└──────────┬───────────────┘
           │
           ▼
5. Ready for Events
┌──────────────────────────┐
│ Handler now receives     │
│ events from its service  │
└──────────────────────────┘
```

## Data Flow for DICOM File Reception

```
DICOM Network                        StoreSCP Instance                    Event System
      │                                     │                                 │
      ├─ DICOM C-STORE Request ────────────→│                                │
      │                                     │                                │
      │                            ┌────────▼────────┐                      │
      │                            │ Receive File    │                      │
      │                            │ Parse Tags      │                      │
      │                            │ Write to Disk   │                      │
      │                            └────────┬────────┘                      │
      │                                     │                                │
      ├─ C-STORE Response ←────────────────┤                                │
      │ (Success/Failure)                   │                                │
      │                                     │                                │
      │                            ┌────────▼─────────────────┐            │
      │                            │ Build OnFileStored Event  │            │
      │                            │ - File path               │            │
      │                            │ - UIDs                    │            │
      │                            │ - Extracted tags          │            │
      │                            └────────┬─────────────────┘            │
      │                                     │                                │
      │                                     └───────────────────────────────→│
      │                                                                       │
      │                                                    ┌──────────────────┴─┐
      │                                                    │                    │
      │                                        ┌───────────▼─────┐ ┌──────────▼────┐
      │                                        │ Handler 1       │ │ Handler 2      │
      │                                        │ - Log file      │ │ - Store in DB  │
      │                                        │ - Send webhook  │ │ - Notify admin │
      │                                        └─────────────────┘ └────────────────┘
      │
      ├─ More files from same study ──────→│
      │                                     │ (Study timer resets on each file)
      │                                     │
      │ (30 seconds of no new files)        │
      │                                     │
      │                            ┌────────▼──────────────────┐
      │                            │ Study Timeout Fired       │
      │                            │ Build OnStudyCompleted    │
      │                            │ Event with all files      │
      │                            └────────┬─────────────────┘
      │                                     │
      │                                     └─────────────────────────────→│
      │                                                                     │
      │                                                    ┌────────────────┴────┐
      │                                                    │                     │
      │                                        ┌───────────▼──────┐ ┌──────────▼─────┐
      │                                        │ Handler 1        │ │ Handler 2       │
      │                                        │ - Archive Study  │ │ - Trigger Report│
      │                                        │ - Cleanup Cache  │ │ - Update PACS   │
      │                                        └──────────────────┘ └─────────────────┘
      │
      ▼
```

## API Endpoints

```
┌────────────────────────────────────────────────────────┐
│              Dynamic Service Management                 │
└────────────────────────────────────────────────────────┘

GET /api/dicom/services
├─ List all services
├─ Return: { services: [...] }
└─ Status: running / stopped

POST /api/dicom/services
├─ Create new service
├─ Body: { name, config }
└─ Return: created service info

POST /api/dicom/services/[name]/start
├─ Start a service
├─ Precondition: not already running
└─ Return: success message

POST /api/dicom/services/[name]/stop
├─ Stop a service
├─ Precondition: currently running
└─ Return: success message
```

## File Organization

```
project/
│
├── nuxt.config.ts                    ← Service configuration
│
├── server/
│   ├── dicom/                        ← Event handlers directory
│   │   ├── storeScp.onFileStored.ts
│   │   ├── storeScp.onStudyCompleted.ts
│   │   └── storeScp.onServerStarted.ts
│   │
│   └── api/dicom/services/           ← Management APIs
│       ├── index.get.ts              ← List services
│       ├── index.post.ts             ← Create service
│       └── [name]/
│           ├── start.post.ts
│           └── stop.post.ts
│
├── src/
│   ├── module.ts                     ← Module definition
│   │
│   └── runtime/
│       └── server/
│           ├── utils/
│           │   ├── dicomEvents.ts    ← Event system
│           │   ├── configManager.ts  ← Config merger
│           │   ├── storeSCPManager.ts ← Service lifecycle
│           │   ├── scanDicomHandlers.ts ← Auto-discovery
│           │   └── schema.ts         ← Configuration schema
│           │
│           ├── composables/
│           │   └── defineDicomEvent.ts ← Event API
│           │
│           ├── plugins/
│           │   └── initDicomServices.ts ← Initialization
│           │
│           └── api/                  ← Built-in APIs
│
└── docs/
    ├── REFACTORING.md               ← Full documentation
    ├── IMPLEMENTATION_SUMMARY.md    ← What was implemented
    └── QUICKSTART.md                ← Quick start guide
```

## Scaling Architecture

```
Development (Single Instance)
┌─────────────────────────┐
│    Nuxt Application     │
│  ┌───────────────────┐  │
│  │ StoreSCP Service  │  │
│  │ Port: 4446        │  │
│  └───────────────────┘  │
│  Resources: 1 CPU, 1GB  │
└─────────────────────────┘

Production (Multiple Instances)
┌──────────────────────────────────────────────────────────────┐
│                     Load Balancer / Ingress                   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Nuxt Pod 1   │  │ Nuxt Pod 2   │  │ Nuxt Pod 3   │      │
│  │ Port 4446    │  │ Port 4446    │  │ Port 4446    │      │
│  │ 2 CPU, 2GB   │  │ 2 CPU, 2GB   │  │ 2 CPU, 2GB   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│        │                  │                  │               │
│        └──────────────────┼──────────────────┘               │
│                           ▼                                  │
│                  ┌──────────────────┐                        │
│                  │  Shared Database │                        │
│                  │   (SQLite, etc)  │                        │
│                  └──────────────────┘                        │
│                                                              │
└──────────────────────────────────────────────────────────────┘

Scale:
- Horizontal: Add more Pod instances
- Vertical: Increase CPU/Memory per instance
- Services: Configure multiple ports (4446, 4447, 4448)
```
