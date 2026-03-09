import { useRuntimeConfig } from '#imports'

export interface StorageInfo {
  name: string
  storageBackend: 'Filesystem' | 'S3'
  outDir: string
  autoDeleteAfterDays: number
  storeWithFileMeta: boolean
  usedBy: string[]
  mountPoint: string
}

export function getRegisteredStorages(): StorageInfo[] {
  const config = useRuntimeConfig().dicom as {
    services?: Array<{ name: string, storageKey?: string }>
    storages?: Array<{
      name: string
      storageBackend: string
      outDir: string
      autoDeleteAfterDays: number
      storeWithFileMeta: boolean
    }>
  }

  const services = config.services ?? []
  const storages = config.storages ?? []

  return storages.map(storage => ({
    name: storage.name,
    storageBackend: storage.storageBackend as 'Filesystem' | 'S3',
    outDir: storage.outDir,
    autoDeleteAfterDays: storage.autoDeleteAfterDays,
    storeWithFileMeta: storage.storeWithFileMeta,
    usedBy: services.filter(s => s.storageKey === storage.name).map(s => s.name),
    mountPoint: `dicom-storage:${storage.name}`,
  }))
}

export function getStorageByName(name: string): StorageInfo | undefined {
  return getRegisteredStorages().find(s => s.name === name)
}
