import { ref, reactive } from '#imports'

export interface BrowseNode {
  key: string
  name: string
  isDirectory: boolean
  size?: number
  mtime?: string
}

export interface TreeNode extends BrowseNode {
  children?: TreeNode[]
  isLoading?: boolean
  isLoaded?: boolean
}

export function useStorageFiles(storageName: string) {
  const rootNodes = ref<TreeNode[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  // Track which keys have had their children loaded
  const loadedKeys = reactive(new Set<string>())

  async function fetchLevel(base: string = ''): Promise<BrowseNode[]> {
    const params = new URLSearchParams({ shallow: 'true' })
    if (base) params.set('base', base)
    const response = await $fetch<BrowseNode[]>(
      `/api/dicom/storages/${storageName}/browse?${params.toString()}`,
    )
    return response
  }

  async function fetchRoot() {
    isLoading.value = true
    error.value = null
    loadedKeys.clear()
    try {
      const nodes = await fetchLevel('')
      rootNodes.value = nodes.map(n => ({ ...n, isLoaded: !n.isDirectory }))
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
    }
    finally {
      isLoading.value = false
    }
  }

  async function expandNode(node: TreeNode) {
    if (!node.isDirectory || loadedKeys.has(node.key)) return

    node.isLoading = true
    try {
      const children = await fetchLevel(node.key)
      node.children = children.map(n => ({ ...n, isLoaded: !n.isDirectory }))
      node.isLoaded = true
      loadedKeys.add(node.key)
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
    }
    finally {
      node.isLoading = false
    }
  }

  function formatFileSize(bytes?: number): string {
    if (!bytes) return '—'
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unit = 0
    while (size >= 1024 && unit < units.length - 1) {
      size /= 1024
      unit++
    }
    return `${size.toFixed(unit > 0 ? 1 : 0)} ${units[unit]}`
  }

  function formatDate(date?: string): string {
    if (!date) return '—'
    try {
      return new Date(date).toLocaleString()
    }
    catch {
      return date
    }
  }

  async function downloadFile(key: string) {
    const url = `/api/dicom/storages/${storageName}/files/download?key=${encodeURIComponent(key)}`
    const a = document.createElement('a')
    a.href = url
    a.download = key.split(':').pop() ?? key
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return {
    rootNodes,
    isLoading,
    error,
    fetchRoot,
    expandNode,
    formatFileSize,
    formatDate,
    downloadFile,
  }
}
