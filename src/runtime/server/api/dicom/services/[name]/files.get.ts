import { defineEventHandler, getRouterParam, createError, getQuery, useStorage } from '#imports'

/**
 * GET /api/dicom/services/:name/files
 * List files stored by a DICOM service in a tree structure
 */
export default defineEventHandler(async (event) => {
  const serviceName = getRouterParam(event, 'name')
  if (!serviceName) {
    throw createError({
      statusCode: 400,
      message: 'Service name is required',
    })
  }

  const query = getQuery(event)
  const path = (query.path as string) || ''

  try {
    const storage = useStorage(`dicom:${serviceName}`)

    // Get all keys under the path
    const keys = await storage.getKeys(path)

    // Build tree structure
    interface FileNode {
      path: string
      name: string
      isDirectory: boolean
      size?: number
      mtime?: string
      children?: FileNode[]
    }

    const buildTree = (keys: string[]): FileNode[] => {
      const root: FileNode[] = []
      const nodeMap: Map<string, FileNode> = new Map()

      // Sort keys to ensure parents are processed before children
      const sortedKeys = keys.sort()

      for (const key of sortedKeys) {
        // Split on ':' since DICOM storage uses StudyUID:SeriesUID:InstanceUID format
        const parts = key.split(':').filter(p => p) // Remove empty parts
        let currentPath = ''

        for (let i = 0; i < parts.length; i++) {
          const part = parts[i]!
          const parentPath = currentPath
          currentPath = currentPath ? `${currentPath}:${part}` : part
          const isLastPart = i === parts.length - 1
          const isDirectory = !isLastPart // All parts except last are directories

          // Create node if it doesn't exist
          if (!nodeMap.has(currentPath)) {
            const node: FileNode = {
              path: currentPath,
              name: part,
              isDirectory,
              children: isDirectory ? [] : undefined,
            }
            nodeMap.set(currentPath, node)

            // Add to parent's children or root
            if (parentPath) {
              const parent = nodeMap.get(parentPath)
              if (parent && parent.children) {
                parent.children.push(node)
              }
            }
            else {
              root.push(node)
            }
          }
        }
      }

      return root
    }

    const tree = buildTree(keys)

    // Recursively get file metadata (size and mtime)
    const addFileMetadata = async (nodes: FileNode[]) => {
      for (const node of nodes) {
        if (!node.isDirectory && node.path) {
          try {
            const meta = await storage.getMeta(node.path)
            node.size = meta?.size
            node.mtime = meta?.mtime?.toISOString()
          }
          catch {
            // Ignore errors for individual files
          }
        }
        if (node.children) {
          await addFileMetadata(node.children)
        }
      }
    }

    await addFileMetadata(tree)

    return {
      serviceName,
      path,
      tree,
    }
  }
  catch (error) {
    console.error(`[nuxt-dicom] Error listing files for ${serviceName}:`, error)
    throw createError({
      statusCode: 500,
      message: `Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }
})
