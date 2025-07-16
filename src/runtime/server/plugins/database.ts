import { defineNitroPlugin, useDatabase } from '#imports'

export default defineNitroPlugin(async (nitro) => {
	const db = useDatabase('dicom')
	if (!db) {
		throw new Error('Database "dicom" is not defined. Please check your configuration.')
	}
	// create schema if it doesn't exist
	await db.sql`CREATE TABLE IF NOT EXISTS services ("id" TEXT PRIMARY KEY, "type" TEXT, "status" TEXT, "config" JSON, "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP)`;
})