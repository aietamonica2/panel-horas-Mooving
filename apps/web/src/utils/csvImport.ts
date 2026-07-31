/**
 * CSV import utilities for Toggl / Clockify style exports (DATA-01 + DATA-02).
 *
 * The real export is an 18-column, fully double-quoted, comma-separated file:
 *   0 Proyecto | 1 Cliente | 2 Descripción | 3 Equipo | 4 Usuario | 5 Grupo |
 *   6 Correo | 7 Etiquetas | 8 Facturable | 9 Fecha inicio | 10 Hora inicio |
 *   11 Fecha fin | 12 Hora fin | 13 Duración (h HH:MM:SS) | 14 Duración (decimal) |
 *   15 Tarifa USD | 16 Importe USD | 17 Fecha creación
 *
 * The old importer used `line.split(',')` which breaks on quoted commas
 * (e.g. a client called "Camuzzi, team soporte") and mapped columns by a fixed
 * — and wrong — position, fabricating a 1.0 duration and today()'s date for any
 * missing value. This module replaces that with a real RFC-4180 parser plus a
 * header-name-based mapper that rejects (never fabricates) invalid rows.
 */

import { TimeRecord } from '../types'

type WorkType = TimeRecord['work_type']

/** A mapped record. rate_usd / amount_usd / start_time are extra fields the
 *  backend ignores if it doesn't know them, so we keep them optional and off the
 *  base type. */
export interface TogglTimeRecord extends TimeRecord {
  rate_usd?: number
  amount_usd?: number
  /** Start-of-entry clock time ("Hora inicio", e.g. "09:00"). Part of the DATA-04
   *  natural key so two entries at different times aren't treated as duplicates. */
  start_time?: string
}

export interface RejectedRow {
  /** 1-based line number in the original file (header = line 1). */
  row: number
  reason: string
}

export interface MapResult {
  records: TogglTimeRecord[]
  rejected: RejectedRow[]
  /** DATA-04 — number of exact-duplicate rows removed during import. */
  duplicatesRemoved: number
}

/** DATA-04 — result of dedupeRecords: the deduped list plus how many were dropped. */
export interface DedupeResult {
  records: TogglTimeRecord[]
  duplicatesRemoved: number
}

/**
 * RFC-4180 compliant CSV parser.
 *
 * Respects double-quoted fields, commas and newlines inside quotes, and escaped
 * quotes (""). Handles \n and \r\n line endings and a leading UTF-8 BOM. Returns
 * an array of rows, each an array of raw (untrimmed) cell strings.
 */
export function parseCsv(text: string): string[][] {
  if (text == null) return []
  // Strip a leading UTF-8 BOM that Toggl/Clockify sometimes prepend.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)

  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0
  const n = text.length

  while (i < n) {
    const c = text[i]

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 2
        } else {
          inQuotes = false
          i += 1
        }
      } else {
        field += c
        i += 1
      }
      continue
    }

    if (c === '"') {
      inQuotes = true
      i += 1
    } else if (c === ',') {
      row.push(field)
      field = ''
      i += 1
    } else if (c === '\n' || c === '\r') {
      // Consume \r\n as a single line break.
      if (c === '\r' && text[i + 1] === '\n') i += 1
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      i += 1
    } else {
      field += c
      i += 1
    }
  }

  // Flush any trailing field/row that isn't terminated by a newline.
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows
}

/** Lowercase, strip diacritics and surrounding whitespace for tolerant matching. */
function normalize(s: string | undefined): string {
  return (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/** Index of the first header whose normalized text satisfies the predicate, or -1. */
function findCol(headers: string[], pred: (h: string) => boolean): number {
  return headers.findIndex((h) => pred(normalize(h)))
}

/** Safe cell accessor: returns '' for out-of-range or missing columns. */
function cell(row: string[], idx: number): string {
  if (idx < 0 || idx >= row.length) return ''
  return (row[idx] ?? '').trim()
}

/**
 * Convert a dd/mm/yyyy (or dd-mm-yyyy / dd.mm.yyyy, 2- or 4-digit year) date into
 * ISO yyyy-mm-dd. Also passes through values already in ISO form. Returns null when
 * the value is empty or not a recognizable, in-range date — the caller rejects it.
 */
export function toIsoDate(raw: string): string | null {
  const s = (raw || '').trim()
  if (!s) return null

  // dd/mm/yyyy and separators / - .  (ignore any trailing time component)
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/)
  if (m) {
    const d = parseInt(m[1], 10)
    const mo = parseInt(m[2], 10)
    let year = m[3]
    if (year.length === 2) year = '20' + year
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
    const mm = String(mo).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    return `${year}-${mm}-${dd}`
  }

  // Already ISO (yyyy-mm-dd, optional time)
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})\b/)
  if (iso) {
    const mo = parseInt(iso[2], 10)
    const d = parseInt(iso[3], 10)
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
    return `${iso[1]}-${iso[2]}-${iso[3]}`
  }

  return null
}

/**
 * Parse a numeric cell tolerantly: strips currency symbols/letters, treats a lone
 * comma as a decimal separator and comma+dot as thousands+decimal. Returns
 * undefined when there is no parseable number.
 */
export function parseNumber(raw: string | undefined): number | undefined {
  if (raw == null) return undefined
  let s = String(raw).trim()
  if (!s) return undefined
  s = s.replace(/[^0-9.,\-]/g, '')
  if (!s || s === '-' || s === '.' || s === ',') return undefined
  if (s.includes(',') && s.includes('.')) {
    // 1,234.56 -> comma is a thousands separator
    s = s.replace(/,/g, '')
  } else if (s.includes(',')) {
    // 8,50 -> comma is the decimal separator
    s = s.replace(',', '.')
  }
  const n = parseFloat(s)
  return isNaN(n) ? undefined : n
}

/** Derive a stable, consistent employee id from the email (preferred) or user name. */
function deriveEmployeeId(correo: string, usuario: string): string {
  const email = (correo || '').trim().toLowerCase()
  if (email.includes('@')) return email.split('@')[0]
  if (email) return email
  const name = normalize(usuario)
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
  return name || 'unknown'
}

/** Slugify a name into a stable id (used for client/project ids). */
function slug(s: string): string {
  return (
    normalize(s)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'na'
  )
}

/**
 * Derive the work type from the project and description.
 *   - Proyecto contains "interna"                         -> internal
 *   - Proyecto/Descripción contains reunion|daily|sync    -> meeting
 *   - Proyecto/Descripción contains capacitacion|onboarding -> training
 *   - otherwise                                           -> project
 * Matching is accent-insensitive (normalize strips diacritics).
 */
export function deriveWorkType(proyecto: string, descripcion: string): WorkType {
  const p = normalize(proyecto)
  const both = `${p} ${normalize(descripcion)}`
  if (p.includes('interna') || p.includes('interno')) return 'internal'
  if (/reunion|daily|sync/.test(both)) return 'meeting'
  if (/capacitacion|onboarding/.test(both)) return 'training'
  return 'project'
}

/**
 * DATA-03 — Client consolidation (Interno -> Mooving).
 *
 * In the business the clients "Interno" and "Mooving" are the SAME corporate
 * client, so every entry logged under "Interno" must be consolidated into the
 * canonical corporate client "Mooving" (client_id 'mooving'). Entries logged
 * under a clearly-internal project ("Tareas Internas", "SENDA", "MKT") that
 * lives under Interno roll up the same way.
 *
 * The mapping is configurable here: key = normalized (lowercase, accent-stripped)
 * source client name, value = canonical { id, name }. Add aliases as the business
 * grows without touching mapTogglRows.
 */
export const CLIENT_ALIASES: Record<string, { id: string; name: string }> = {
  interno: { id: 'mooving', name: 'Mooving' },
  mooving: { id: 'mooving', name: 'Mooving' },
}

/** Normalized project names that live under "Interno" and also roll up to Mooving. */
const INTERNAL_PROJECT_ALIASES = ['tareas internas', 'senda', 'mkt']

/**
 * Resolve the canonical client for a row (DATA-03). Returns the consolidated
 * { id, name } when an alias applies, or null when the raw client should be kept.
 */
export function consolidateClient(
  cliente: string,
  proyecto: string
): { id: string; name: string } | null {
  const c = normalize(cliente)
  if (CLIENT_ALIASES[c]) return CLIENT_ALIASES[c]

  // A blank client on a clearly-internal project also rolls up to Mooving, but we
  // never reassign an explicit external client whose project merely sounds internal.
  const p = normalize(proyecto)
  const isInternalProject =
    INTERNAL_PROJECT_ALIASES.includes(p) || p.includes('interna') || p.includes('interno')
  if (isInternalProject && c === '') return CLIENT_ALIASES.interno

  return null
}

/**
 * DATA-05 — Normalize an employee display name.
 *
 * Toggl exports names inconsistently: some are proper "Nombre Apellido"
 * ("Augusto Morelli"), others are the raw login handle ("monica.aieta" /
 * "monica_aieta"). A handle (no spaces) is split on . or _ and each part is
 * capitalized -> "Monica Aieta"; an already-proper name (contains a space) is
 * returned untouched so accents and casing are preserved.
 */
export function normalizeEmployeeName(raw: string): string {
  const s = (raw || '').trim()
  if (!s) return ''
  // Already a "Nombre Apellido" (has whitespace) -> keep as-is.
  if (/\s/.test(s)) return s
  const parts = s.split(/[._]+/).filter(Boolean)
  if (parts.length === 0) return s
  return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ')
}

/**
 * Natural key for DATA-04 dedup: identifies a single logged time entry by
 * employee + date + start time (if present) + project + duration + description.
 * Uses the stable derived ids/slugs and tolerant normalization for text.
 */
function naturalKey(r: TogglTimeRecord): string {
  return [
    r.employee_id || normalize(r.employee_name),
    r.date,
    r.start_time || '',
    r.project_id || normalize(r.project_name),
    r.duration_decimal,
    normalize(r.description),
  ].join('|')
}

/**
 * DATA-04 — Remove exact-duplicate records by their natural key, keeping the
 * first occurrence and dropping later exact repeats. Returns the deduped list
 * plus how many rows were removed.
 */
export function dedupeRecords(records: TogglTimeRecord[]): DedupeResult {
  const seen = new Set<string>()
  const out: TogglTimeRecord[] = []
  let duplicatesRemoved = 0
  for (const r of records) {
    const key = naturalKey(r)
    if (seen.has(key)) {
      duplicatesRemoved++
      continue
    }
    seen.add(key)
    out.push(r)
  }
  return { records: out, duplicatesRemoved }
}

/**
 * Map parsed Toggl/Clockify rows into TimeRecords, detecting columns by header
 * NAME (tolerant to accents/variants) rather than fixed position, and validating
 * each row. Rows missing a valid duration or a valid date are pushed to `rejected`
 * with a reason instead of being fabricated.
 */
export function mapTogglRows(rows: string[][]): MapResult {
  const records: TogglTimeRecord[] = []
  const rejected: RejectedRow[] = []

  if (!rows || rows.length === 0) return { records, rejected, duplicatesRemoved: 0 }

  // Locate the header row: first row that carries a recognizable column title.
  let headerIdx = rows.findIndex((r) =>
    r.some((c) => {
      const nc = normalize(c)
      return (
        nc.includes('proyecto') ||
        nc.includes('project') ||
        nc.includes('duracion') ||
        nc.includes('duration') ||
        nc.includes('usuario') ||
        (nc.includes('fecha') && nc.includes('inicio'))
      )
    })
  )
  if (headerIdx === -1) headerIdx = 0

  const headers = rows[headerIdx] || []

  const idx = {
    proyecto: findCol(headers, (h) => h.includes('proyecto') || h.includes('project')),
    cliente: findCol(headers, (h) => h.includes('client')),
    descripcion: findCol(headers, (h) => h.includes('descrip')),
    usuario: findCol(headers, (h) => h.includes('usuario') || h.includes('user')),
    correo: findCol(headers, (h) => h.includes('correo') || h.includes('mail')),
    facturable: findCol(headers, (h) => h.includes('facturable') || h.includes('billable')),
    fechaInicio: findCol(
      headers,
      (h) => (h.includes('fecha') && h.includes('inicio')) || (h.includes('start') && h.includes('date'))
    ),
    horaInicio: findCol(
      headers,
      (h) => (h.includes('hora') && h.includes('inicio')) || (h.includes('start') && h.includes('time'))
    ),
    // Only the decimal duration column carries the word "decimal", so that alone
    // uniquely distinguishes it from "Duración (h HH:MM:SS)".
    duracionDecimal: findCol(headers, (h) => h.includes('decimal')),
    tarifa: findCol(headers, (h) => h.includes('tarifa') || h.includes('rate')),
    importe: findCol(headers, (h) => h.includes('importe') || h.includes('amount')),
  }

  for (let j = headerIdx + 1; j < rows.length; j++) {
    const row = rows[j]
    const lineNumber = j + 1 // 1-based line number in the original file

    // Skip completely blank lines silently (not a rejection).
    if (!row || row.every((c) => (c || '').trim() === '')) continue

    const proyecto = cell(row, idx.proyecto)
    const cliente = cell(row, idx.cliente)
    const descripcion = cell(row, idx.descripcion)
    const usuario = cell(row, idx.usuario)
    const correo = cell(row, idx.correo)
    const facturableRaw = cell(row, idx.facturable)
    const fechaRaw = cell(row, idx.fechaInicio)
    const horaRaw = cell(row, idx.horaInicio)
    const durRaw = cell(row, idx.duracionDecimal)

    // --- Validation: never fabricate a duration or a date ---
    const dur = parseNumber(durRaw)
    if (dur === undefined || dur <= 0) {
      rejected.push({ row: lineNumber, reason: `Duración inválida o faltante: "${durRaw}"` })
      continue
    }

    const date = toIsoDate(fechaRaw)
    if (!date) {
      rejected.push({ row: lineNumber, reason: `Fecha inválida o faltante: "${fechaRaw}"` })
      continue
    }

    const fact = normalize(facturableRaw)
    const isBillable = fact === 'si' || fact === 'yes' || fact === 'true' || fact === '1' ? 1 : 0

    let hours = Math.floor(dur)
    let minutes = Math.round((dur - hours) * 60)
    if (minutes === 60) {
      hours += 1
      minutes = 0
    }

    // DATA-03: consolidate "Interno" (and internal projects under it) into the
    // canonical corporate client "Mooving". null -> keep the raw client's slug.
    const canonicalClient = consolidateClient(cliente, proyecto)

    const record: TogglTimeRecord = {
      id: '',
      tenant_id: '',
      employee_id: deriveEmployeeId(correo, usuario),
      // DATA-05: normalize "monica.aieta" -> "Monica Aieta"; keep proper names as-is.
      employee_name: normalizeEmployeeName(usuario),
      client_id: canonicalClient ? canonicalClient.id : slug(cliente),
      client_name: canonicalClient ? canonicalClient.name : cliente,
      project_id: slug(proyecto),
      project_name: proyecto,
      duration_decimal: dur,
      duration_hours: hours,
      duration_minutes: minutes,
      date,
      work_type: deriveWorkType(proyecto, descripcion),
      description: descripcion,
      created_at: '',
      updated_at: '',
      is_billable: isBillable,
      source: 'toggl',
    }

    // DATA-04: keep the start time when present so it participates in the dedup key.
    if (horaRaw) record.start_time = horaRaw

    if (idx.tarifa >= 0) {
      const rate = parseNumber(cell(row, idx.tarifa))
      if (rate !== undefined) record.rate_usd = rate
    }
    if (idx.importe >= 0) {
      const amount = parseNumber(cell(row, idx.importe))
      if (amount !== undefined) record.amount_usd = amount
    }

    records.push(record)
  }

  // DATA-04: return the deduplicated records plus how many duplicates were removed.
  const deduped = dedupeRecords(records)
  return { records: deduped.records, rejected, duplicatesRemoved: deduped.duplicatesRemoved }
}
