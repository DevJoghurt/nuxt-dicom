import { promises as fs } from 'node:fs'
import { join, extname, basename } from 'node:path'
import { DicomEventTypeEnum } from '../runtime/types'

/**
 * Scanned DICOM event handler metadata
 */
export interface ScannedDicomEventHandler {
  serviceName: string
  eventType: string
  eventId: string // Combined service_eventType
  filePath: string
  fileName: string
  importPath: string // Relative import path for templates
  name: string // Handler name - unique identifier (priority: config name > file name without ext)
  description?: string // Handler description (optional, from config)
}

/**
 * Scan the server/dicom directory for DICOM event handlers
 * This runs at build time and returns metadata for template generation
 *
 * Handler files must export a default function wrapped with defineDicomEvent.
 * File naming follows the pattern: `{serviceName}.{eventType}.ts`
 *
 * @example
 * ```
 * server/dicom/storeScp.onFileStored.ts
 * export default defineDicomEvent('storeScp_onFileStored', async (payload) => {
 *   console.log('File stored:', payload.file)
 * })
 * ```
 */
export async function scanDicomEventHandlers(
  dicomDir: string,
): Promise<ScannedDicomEventHandler[]> {
  const handlers: ScannedDicomEventHandler[] = []

  // Check if directory exists
  try {
    await fs.stat(dicomDir)
  }
  catch {
    // Directory doesn't exist, return empty array
    return handlers
  }

  try {
    const files = await fs.readdir(dicomDir, { withFileTypes: true })

    for (const file of files) {
      if (!file.isFile()) continue

      const ext = extname(file.name)
      // Only process .ts files (or .js in production)
      if (!['.ts', '.js'].includes(ext)) continue

      const filePath = join(dicomDir, file.name)
      const importPath = filePath.replace(/\\/g, '/')

      // Try to load event info from file by reading and parsing
      let eventId: string | undefined
      let serviceName: string | undefined
      let eventType: string | undefined
      let handlerName: string | undefined
      let description: string | undefined

      try {
        // Read file content
        const fileContent = await fs.readFile(filePath, 'utf-8')

        // Parse defineDicomEvent call using regex
        // Match: export default defineDicomEvent('storeScp_onFileStored', ...)
        const eventMatch = fileContent.match(
          /export\s+default\s+defineDicomEvent\s*\(\s*['"]([^'"]+)['"]\s*,/,
        )

        if (!eventMatch) {
          console.warn(
            `[nuxt-dicom] Handler file ${file.name} does not export a handler via defineDicomEvent(). Skipping registration.`,
          )
          continue
        }

        eventId = eventMatch[1]!

        // Validate event ID format (should be service_eventType)
        if (!Object.values(DicomEventTypeEnum).includes(eventId as DicomEventTypeEnum)) {
          console.warn(
            `[nuxt-dicom] Invalid event ID in ${file.name}: ${eventId}. Expected one of: ${Object.values(DicomEventTypeEnum).join(', ')}`,
          )
          continue
        }

        // Extract service and eventType from eventId (e.g., 'storeScp_onFileStored')
        const [service, ...eventParts] = eventId.split('_')
        serviceName = service
        eventType = eventParts.join('_')

        // Generate fallback name from file name (without extension)
        // e.g., 'storeScp.onFileStored.ts' -> 'storeScp.onFileStored'
        const fileNameWithoutExt = basename(file.name, extname(file.name))

        // Parse optional config export using regex
        // Match: export const config = defineDicomEventConfig({ ... })
        const configMatch = fileContent.match(
          /export\s+const\s+config\s*=\s*defineDicomEventConfig\s*\(\s*(\{[\s\S]*?\})\s*\)/,
        )

        if (configMatch) {
          // Extract config object - configMatch[1] is guaranteed to exist because it matched
          const configStr = configMatch[1]!

          // Parse optional config fields
          const nameMatch = configStr.match(/name\s*:\s*['"]([^'"]+)['"]/)?.[1]
          const descMatch = configStr.match(/description\s*:\s*['"]([^'"]+)['"]/)?.[1]

          // Prioritize config name if provided, otherwise use file name as fallback
          handlerName = nameMatch || fileNameWithoutExt
          description = descMatch
        }
        else {
          // No config found, use file name as handler name
          handlerName = fileNameWithoutExt
        }
      }
      catch (err) {
        console.warn(
          `[nuxt-dicom] Failed to parse handler from ${file.name}:`,
          err instanceof Error ? err.message : String(err),
        )
        continue
      }

      handlers.push({
        name: handlerName!,
        description,
        serviceName: serviceName!,
        eventType: eventType!,
        eventId: eventId!,
        filePath,
        fileName: file.name,
        importPath,
      })
    }
  }
  catch (error) {
    console.error(`[nuxt-dicom] Error scanning DICOM event handlers in ${dicomDir}:`, error)
  }

  return handlers
}

/**
 * Generate import statements for scanned handlers
 */
export function generateHandlerImports(
  handlers: ScannedDicomEventHandler[],
): string {
  if (handlers.length === 0) return ''

  return handlers
    .map((handler, idx) => {
      const varName = `handler_${idx}`
      return `import ${varName} from '${handler.importPath}'`
    })
    .join('\n')
}

/**
 * Generate handler registration code
 */
export function generateHandlerRegistrations(
  handlers: ScannedDicomEventHandler[],
): string {
  if (handlers.length === 0) return ''

  const registrations = handlers
    .map((handler, idx) => {
      const varName = `handler_${idx}`
      // Register handler by name so it can be looked up dynamically
      return `  dicomEventEmitter.registerNamedHandler('${handler.name}', ${varName}.handler, ${varName}.config)`
    })
    .join('\n')

  return `
export function registerDicomHandlers() {
${registrations}
  console.log('[nuxt-dicom] Registered ${handlers.length} DICOM event handler(s)')
}`
}

/**
 * Generate the complete handlers template
 */
export function generateHandlersTemplate(
  handlers: ScannedDicomEventHandler[],
): string {
  if (handlers.length === 0) {
    return `import { dicomEventEmitter } from '#imports'

export function registerDicomHandlers() {
  // No handlers found
}
`
  }

  const imports = generateHandlerImports(handlers)
  const registrations = generateHandlerRegistrations(handlers)

  return `import { dicomEventEmitter } from '#imports'

${imports}

${registrations}
`
}
