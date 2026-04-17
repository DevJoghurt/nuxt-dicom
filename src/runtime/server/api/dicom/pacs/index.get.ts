import { defineEventHandler, useRuntimeConfig } from '#imports'
import type { PacsServerConfig } from '../../../../utils/schema'

/**
 * GET /api/dicom/pacs
 * Returns all configured PACS servers (without sensitive credentials).
 */
export default defineEventHandler(() => {
  const runtimeConfig = useRuntimeConfig()
  const dicomConfig = runtimeConfig.dicom as Record<string, unknown>
  const pacs = (dicomConfig?.pacs as PacsServerConfig[] | undefined) ?? []

  return pacs.map(p => ({
    name: p.name,
    label: p.label ?? p.name,
    description: p.description,
    addr: p.addr,
    calledAeTitle: p.calledAeTitle,
    callingAeTitle: p.callingAeTitle,
    queryModel: p.queryModel,
  }))
})
