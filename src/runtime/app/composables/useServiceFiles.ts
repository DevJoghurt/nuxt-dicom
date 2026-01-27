import type { Ref } from 'vue'
import type { TreeItem } from '@nuxt/ui'
import { ref } from '#imports'

interface FileNode {
  path: string
  name: string
  isDirectory: boolean
  size?: number
  mtime?: string
  children?: FileNode[]
}

interface FileBrowserState {
  tree: Ref<TreeItem[]>
  isLoading: Ref<boolean>
  error: Ref<string | null>
}

/**
 * Composable for browsing DICOM service files
 * Fetches file tree and provides download functionality
 */
export function useServiceFiles(serviceName: string): FileBrowserState & {
  fetchFiles: () => Promise<void>
  downloadFile: (path: string) => Promise<void>
  deleteFile: (path: string) => Promise<void>
  cleanupOldFiles: (days: number) => Promise<void>
  formatFileSize: (bytes?: number) => string
  formatDate: (date?: string) => string
} {
  const tree = ref<TreeItem[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Convert FileNode to TreeItem format
   */
  const convertToTreeItems = (nodes: FileNode[]): TreeItem[] => {
    return nodes.map((node) => {
      const treeItem: TreeItem = {
        label: node.name,
        ...(node.size && !node.isDirectory
          ? {
              trailingIcon: undefined,
            }
          : {}),
      }

      // Set icons based on type
      if (node.isDirectory) {
        // Folders will use expanded-icon and collapsed-icon from Tree component
        // Don't set icon here, let the Tree component handle it
      }
      else {
        // Files get specific icons
        treeItem.icon = node.name.endsWith('.dcm')
          ? 'i-lucide-file-image'
          : 'i-lucide-file'
      }

      if (node.children && node.children.length > 0) {
        treeItem.children = convertToTreeItems(node.children)
        treeItem.defaultExpanded = false
      }

      // Store path as custom property for download
      ;(treeItem as any).path = node.path
      ;(treeItem as any).size = node.size
      ;(treeItem as any).mtime = node.mtime
      ;(treeItem as any).isDirectory = node.isDirectory

      // Add onSelect handler for files only
      if (!node.isDirectory) {
        treeItem.onSelect = async (e) => {
          e.preventDefault()
          await downloadFile(node.path)
        }
      }
      else {
        // Prevent folders from being selected, only allow expand/collapse
        treeItem.onSelect = (e) => {
          e.preventDefault()
        }
      }

      return treeItem
    })
  }

  /**
   * Fetch file tree from API
   */
  const fetchFiles = async () => {
    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch<{ tree: FileNode[] }>(
        `/api/dicom/services/${serviceName}/files`,
      )
      tree.value = convertToTreeItems(response.tree)
    }
    catch (err) {
      console.error('Error fetching files:', err)
      error.value = err instanceof Error ? err.message : 'Failed to load files'
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * Download a file
   */
  const downloadFile = async (path: string) => {
    try {
      // Create a temporary link to trigger download
      const url = `/api/dicom/services/${serviceName}/files/download?path=${encodeURIComponent(path)}`
      const a = document.createElement('a')
      a.href = url
      a.download = path.split(':').pop() || 'file.dcm'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
    catch (err) {
      console.error('Error downloading file:', err)
      error.value = err instanceof Error ? err.message : 'Failed to download file'
    }
  }

  /**
   * Delete a file
   */
  const deleteFile = async (path: string) => {
    try {
      await $fetch(`/api/dicom/services/${serviceName}/files/delete`, {
        method: 'DELETE',
        query: { path },
      })

      // Refresh the tree after deletion
      await fetchFiles()
    }
    catch (err) {
      console.error('Error deleting file:', err)
      error.value = err instanceof Error ? err.message : 'Failed to delete file'
      throw err
    }
  }

  /**
   * Cleanup old files
   */
  const cleanupOldFiles = async (days: number) => {
    try {
      isLoading.value = true
      error.value = null

      const response = await $fetch<{ deletedCount: number }>(`/api/dicom/services/${serviceName}/cleanup`, {
        method: 'POST',
        query: { days },
      })

      console.log(`Deleted ${response.deletedCount} files older than ${days} days`)

      // Refresh the tree after cleanup
      await fetchFiles()
    }
    catch (err) {
      console.error('Error cleaning up files:', err)
      error.value = err instanceof Error ? err.message : 'Failed to cleanup files'
      throw err
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * Format file size in human-readable format
   */
  const formatFileSize = (bytes?: number): string => {
    if (!bytes)
      return ''

    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`
  }

  /**
   * Format date in human-readable format
   */
  const formatDate = (date?: string): string => {
    if (!date)
      return ''

    try {
      const d = new Date(date)
      return d.toLocaleString()
    }
    catch {
      return ''
    }
  }

  return {
    tree,
    isLoading,
    error,
    fetchFiles,
    downloadFile,
    deleteFile,
    cleanupOldFiles,
    formatFileSize,
    formatDate,
  }
}
