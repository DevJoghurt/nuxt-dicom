import { defineEventHandler, getRouterParam, readBody, createError, useRuntimeConfig } from '#imports'
import { FindScu } from '@nuxthealth/node-dicom'
import type { PacsServerConfig } from '../../../../../utils/schema'

/**
 * POST /api/dicom/pacs/:name/find
 *
 * Execute a C-FIND (FindSCU) query against the named PACS server.
 * Body:
 *   patientName?           {string} DICOM wildcard — e.g. "DOE^*"
 *   patientId?             {string} Exact or wildcard patient ID
 *   patientBirthDateFrom?  {string} Birth date start — YYYYMMDD
 *   patientBirthDateTo?    {string} Birth date end   — YYYYMMDD
 *   studyDateFrom?         {string} Study date start — YYYYMMDD (StudyRoot)
 *   studyDateTo?           {string} Study date end   — YYYYMMDD (StudyRoot)
 *   modality?              {string} Modality code — e.g. "CT", "MR" (StudyRoot)
 *   studyDescription?      {string} Wildcard study description (StudyRoot)
 *   accessionNumber?       {string} Exact accession number (StudyRoot)
 *   queryModel?            {'StudyRoot'|'PatientRoot'|'ModalityWorklist'} overrides PACS default
 */
export default defineEventHandler(async (event) => {
  const pacsName = getRouterParam(event, 'name')
  if (!pacsName) {
    throw createError({ statusCode: 400, message: 'PACS name is required' })
  }

  const body = await readBody<{
    patientName?: string
    patientId?: string
    patientBirthDateFrom?: string
    patientBirthDateTo?: string
    studyDateFrom?: string
    studyDateTo?: string
    modality?: string
    studyDescription?: string
    accessionNumber?: string
    queryModel?: 'StudyRoot' | 'PatientRoot' | 'ModalityWorklist'
  }>(event)

  // ── Resolve PACS config ───────────────────────────────────────────────────
  const runtimeConfig = useRuntimeConfig()
  const dicomConfig = runtimeConfig.dicom as Record<string, unknown>
  const allPacs = (dicomConfig?.pacs as PacsServerConfig[] | undefined) ?? []
  const pacsConfig = allPacs.find(p => p.name === pacsName)

  if (!pacsConfig) {
    throw createError({ statusCode: 404, message: `PACS "${pacsName}" not found` })
  }

  const queryModel = body?.queryModel ?? pacsConfig.queryModel ?? 'PatientRoot'

  // ── Build date range strings ──────────────────────────────────────────────
  const buildDateRange = (from?: string, to?: string) => {
    if (from && to) return `${from}-${to}`
    if (from) return `${from}-`
    if (to) return `-${to}`
    return ''
  }

  const birthDateRange = buildDateRange(body?.patientBirthDateFrom, body?.patientBirthDateTo)
  const studyDateRange = buildDateRange(body?.studyDateFrom, body?.studyDateTo)

  // ── Build DICOM query object ──────────────────────────────────────────────
  // Shared patient-level identifiers (all models)
  const query: Record<string, string> = {
    PatientName: body?.patientName ?? '',
    PatientID: body?.patientId ?? '',
    PatientBirthDate: birthDateRange, // empty = return attribute, non-empty = filter
    PatientSex: '',
  }

  if (queryModel === 'PatientRoot') {
    // Patient-level C-FIND: patient demographics + patient-level counts
    query.NumberOfPatientRelatedStudies = ''
    query.NumberOfPatientRelatedSeries = ''
    query.NumberOfPatientRelatedInstances = ''
  }
  else {
    // StudyRoot / ModalityWorklist: study-level attributes
    query.StudyInstanceUID = ''
    query.StudyDate = studyDateRange
    query.StudyTime = ''
    query.StudyDescription = body?.studyDescription ?? ''
    query.AccessionNumber = body?.accessionNumber ?? ''
    query.ModalitiesInStudy = body?.modality ?? ''
    query.NumberOfStudyRelatedSeries = ''
    query.NumberOfStudyRelatedInstances = ''
    query.ReferringPhysicianName = ''
    query.InstitutionName = ''
  }

  // ── Execute FindSCU ───────────────────────────────────────────────────────

  const finder = new FindScu({
    addr: pacsConfig.addr,
    callingAeTitle: pacsConfig.callingAeTitle ?? 'FIND-SCU',
    ...(pacsConfig.calledAeTitle ? { calledAeTitle: pacsConfig.calledAeTitle } : {}),
    ...(pacsConfig.maxPduLength ? { maxPduLength: pacsConfig.maxPduLength } : {}),
    verbose: pacsConfig.verbose ?? false,
  })

  try {
    let totalResults = 0
    let durationSeconds = 0

    const results = await finder.find({
      query,
      queryModel,
      onCompleted: (_err, ev) => {
        totalResults = ev.data?.totalResults ?? 0
        durationSeconds = ev.data?.durationSeconds ?? 0
      },
    }) as Array<{ attributes: Record<string, string> }>

    return {
      results: results.map(r => r.attributes),
      totalResults: totalResults || results.length,
      durationSeconds,
    }
  }
  catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw createError({ statusCode: 502, message: `C-FIND failed: ${message}` })
  }
})
