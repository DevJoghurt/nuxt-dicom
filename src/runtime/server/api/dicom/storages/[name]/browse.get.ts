import { defineEventHandler, getRouterParam, getQuery, createError, useStorage, getStorageByName } from '#imports'

export interface BrowseNode {
  key: string
  name: string
  isDirectory: boolean
  size?: number
  mtime?: string
}

/**
 * GET /api/dicom/storages/:name/browse
 *
 * Lazy-browsable storage listing. Supports large storages by returning
 * only one directory level at a time.
 *
 * Query params:
 *  - base: path prefix to list under (default: root)
 *  - shallow: if "true" (default), return only the immediate level
 *             if "false", return the full subtree from base
 */
export default defineEventHandler(async (event) => {
  const storageName = getRouterParam(event, 'name')
  if (!storageName) {
    throw createError({ statusCode: 400, statusMessage: 'Storage name is required' })
  }

  const info = getStorageByName(storageName)
  if (!info) {
    throw createError({ statusCode: 404, statusMessage: `Storage "${storageName}" not found` })
  }

  const query = getQuery(event)
  const base = (query.base as string) || ''
  const shallow = query.shallow !== 'false' // default: shallow=true

  try {
    const storage = useStorage(info.mountPoint)

    // Get all keys under the given base prefix
    const allKeys = await storage.getKeys(base || undefined)

    if (allKeys.length === 0) {
      return []
    }

    if (!shallow) {
      // Full subtree: build tree structure same way as service files endpoint
      return buildFullTree(allKeys, base)
    }

    // Shallow: extract just the immediate children of `base`
    // Strip the base prefix to get relative paths
    const separator = ':'
    const prefix = base ? `${base}${separator}` : ''

    const relativeKeys = base
      ? allKeys
          .filter(k => k.startsWith(prefix))
          .map(k => k.slice(prefix.length))
      : allKeys

    // Extract only the first segment of each relative key
    const nodeMap = new Map<string, { isDirectory: boolean, key: string }>()

    for (const rel of relativeKeys) {
      const segments = rel.split(separator)
      const firstName = segments[0]!
      const isDirectory = segments.length > 1

      if (!nodeMap.has(firstName)) {
        nodeMap.set(firstName, {
          isDirectory,
          key: base ? `${base}${separator}${firstName}` : firstName,
        })
      }
      else if (isDirectory) {
        // If we've seen this name before as a file, upgrade to directory
        nodeMap.get(firstName)!.isDirectory = true
      }
    }

    // For leaf files, fetch metadata (size, mtime)
    const nodes: BrowseNode[] = []
    for (const [name, info] of nodeMap) {
      const node: BrowseNode = { key: info.key, name, isDirectory: info.isDirectory }

      if (!info.isDirectory) {
        try {
          const meta = await storage.getMeta(info.key)
          if (meta) {
            node.size = (meta.size as number | undefined)
            node.mtime = meta.mtime ? new Date(meta.mtime as Date).toISOString() : undefined
          }
        }
        catch {
          // Meta not available — proceed without it
        }
      }

      nodes.push(node)
    }

    return nodes.sort((a, b) => {
      // Directories first, then alphabetical
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw createError({ statusCode: 500, statusMessage: message })
  }
})

interface FileNode {
  key: string
  name: string
  isDirectory: boolean
  size?: number
  mtime?: string
  children?: FileNode[]
}

function buildFullTree(keys: string[], _base: string): FileNode[] {
  const root: FileNode[] = []
  const nodeMap = new Map<string, FileNode>()
  const sep = ':'

  for (const key of [...keys].sort()) {
    const parts = key.split(sep).filter(Boolean)
    let currentPath = ''

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!
      const parentPath = currentPath
      currentPath = currentPath ? `${currentPath}${sep}${part}` : part
      const isDirectory = i < parts.length - 1

      if (!nodeMap.has(currentPath)) {
        const node: FileNode = { key: currentPath, name: part, isDirectory, children: isDirectory ? [] : undefined }
        nodeMap.set(currentPath, node)

        if (parentPath) {
          nodeMap.get(parentPath)?.children?.push(node)
        }
        else {
          root.push(node)
        }
      }
    }
  }

  return root
}
