import { defineNitroPlugin, useDatabase } from '#imports'

export default defineNitroPlugin(async (nitro) => {
    const db = useDatabase('dicom')
    if (!db) {
        throw new Error('Database "dicom" is not defined. Please check your configuration.')
    }
    // Haupttabelle: Prozess
    await db.sql`
        CREATE TABLE IF NOT EXISTS process (
            "id" INTEGER PRIMARY KEY  AUTOINCREMENT,
            "type" TEXT,
            "status" TEXT,
            "config" JSON,
            "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP
        )`;

    // Trigger für automatisches Aktualisieren von updatedAt
    await db.sql`
        CREATE TRIGGER IF NOT EXISTS process_updatedAt_trigger
        AFTER UPDATE ON process
        FOR EACH ROW
        BEGIN
            UPDATE process SET updatedAt = CURRENT_TIMESTAMP WHERE id = OLD.id;
        END;
    `;

    // Event-Service-Tabelle
    await db.sql`
        CREATE TABLE IF NOT EXISTS event_service (
            "id" INTEGER PRIMARY KEY  AUTOINCREMENT,
            "name" TEXT UNIQUE,
            "config" JSON,
            "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP
        )`;

    // Trigger für event_service.updatedAt
    await db.sql`
        CREATE TRIGGER IF NOT EXISTS event_service_updatedAt_trigger
        AFTER UPDATE ON event_service
        FOR EACH ROW
        BEGIN
            UPDATE event_service SET updatedAt = CURRENT_TIMESTAMP WHERE id = OLD.id;
        END;
    `;

    // Trigger-Tabelle
    await db.sql`
        CREATE TABLE IF NOT EXISTS event_service_trigger (
            "id" INTEGER PRIMARY KEY AUTOINCREMENT,
            "eventServiceId" INTEGER,
            "processId" INTEGER,
            "triggeredAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (eventServiceId) REFERENCES event_service(id) ON DELETE CASCADE,
            FOREIGN KEY (processId) REFERENCES process(id) ON DELETE CASCADE
        )`;

    // Log-Tabelle für Trigger
    await db.sql`
        CREATE TABLE IF NOT EXISTS event_service_trigger_log (
            "id" INTEGER PRIMARY KEY AUTOINCREMENT,
            "eventServiceTriggerId" INTEGER,
            "message" TEXT,
            "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (eventServiceTriggerId) REFERENCES event_service_trigger(id) ON DELETE CASCADE
        )`;

    // Prozess-Log
    await db.sql`
        CREATE TABLE IF NOT EXISTS process_log (
            "id" INTEGER PRIMARY KEY AUTOINCREMENT,
            "processId" INTEGER,
            "message" TEXT,
            "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (processId) REFERENCES process(id) ON DELETE CASCADE
        )`;

    // Prozess-Events
    await db.sql`
        CREATE TABLE IF NOT EXISTS process_event (
            "id" INTEGER PRIMARY KEY AUTOINCREMENT,
            "processId" INTEGER,
            "type" TEXT,
            "data" JSON,
            "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (processId) REFERENCES process(id) ON DELETE CASCADE
        )`;

    // Indizes für schnelle Abfragen
    await db.sql`CREATE INDEX IF NOT EXISTS idx_process_type ON process(type)`;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_event_service_name ON event_service(name)`;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_trigger_processId ON event_service_trigger(processId)`;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_trigger_eventServiceId ON event_service_trigger(eventServiceId)`;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_log_processId ON process_log(processId)`;
    await db.sql`CREATE INDEX IF NOT EXISTS idx_event_processId ON process_event(processId)`;
})