/**
 * FUNC-01: Server-side time-record policy validation engine.
 *
 * Pure, I/O-free validation of a single time record (or a batch) against the
 * load policies described in the Operations Manual. It has NO dependency on
 * Cloudflare/D1/Hono, so it is safe to import from routes, cron handlers and
 * unit tests alike, and is fully deterministic given its inputs.
 *
 * Policies implemented:
 *   - Minimum duration of 0.5h                     -> error   (< 0.5h)
 *   - Maximum duration of 24h per record           -> error   (> 24h)
 *   - Meeting (work_type 'meeting') longer than 2h -> warning
 *   - Internal (work_type 'internal') longer than 4h -> warning
 *   - Date must not be in the future               -> error   (> today)
 *   - Project (work_type 'project') description with
 *     fewer than 10 characters                     -> warning
 */

/** Policy thresholds. Exported so callers/tests can reference the source of truth. */
export const POLICY = {
  MIN_DURATION_HOURS: 0.5,
  MAX_DURATION_HOURS: 24,
  MEETING_WARN_HOURS: 2,
  INTERNAL_WARN_HOURS: 4,
  MIN_PROJECT_DESCRIPTION_LENGTH: 10,
} as const

/** Minimal shape needed to validate a record. Extra fields are ignored. */
export interface ValidatableTimeRecord {
  duration_decimal?: number
  work_type?: string
  date?: string
  description?: string
  [key: string]: unknown
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export interface ValidationOptions {
  /**
   * Reference "today" used for the future-date check. Accepts a `YYYY-MM-DD`
   * string or a `Date`. Defaults to the current date. Injectable to keep the
   * function deterministic in tests.
   */
  today?: string | Date
}

/** Normalise a Date or ISO/date string down to a `YYYY-MM-DD` calendar day. */
function toDateOnly(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }
  return String(value).slice(0, 10)
}

/**
 * Validate a single time record against the load policies.
 * `valid` is true when there are no blocking `errors` (warnings do not block).
 */
export function validateTimeRecord(
  record: ValidatableTimeRecord,
  options: ValidationOptions = {}
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  const duration =
    typeof record?.duration_decimal === 'number' ? record.duration_decimal : NaN
  const workType = record?.work_type
  const description =
    typeof record?.description === 'string' ? record.description : ''

  // --- Duration policies -------------------------------------------------
  if (!Number.isFinite(duration)) {
    errors.push('La duración (duration_decimal) es requerida y debe ser numérica')
  } else {
    if (duration < POLICY.MIN_DURATION_HOURS) {
      errors.push(
        `La duración mínima permitida es ${POLICY.MIN_DURATION_HOURS}h (recibido ${duration}h)`
      )
    }
    if (duration > POLICY.MAX_DURATION_HOURS) {
      errors.push(
        `La duración máxima por registro es ${POLICY.MAX_DURATION_HOURS}h (recibido ${duration}h)`
      )
    }
    if (workType === 'meeting' && duration > POLICY.MEETING_WARN_HOURS) {
      warnings.push(
        `Una reunión de ${duration}h supera las ${POLICY.MEETING_WARN_HOURS}h recomendadas`
      )
    }
    if (workType === 'internal' && duration > POLICY.INTERNAL_WARN_HOURS) {
      warnings.push(
        `El trabajo interno de ${duration}h supera las ${POLICY.INTERNAL_WARN_HOURS}h recomendadas`
      )
    }
  }

  // --- Date policy: no future records ------------------------------------
  if (record?.date) {
    const recordDate = toDateOnly(record.date)
    const today = toDateOnly(options.today ?? new Date())
    // Lexicographic comparison is correct for zero-padded YYYY-MM-DD strings.
    if (recordDate > today) {
      errors.push(`La fecha ${recordDate} está en el futuro (hoy: ${today})`)
    }
  }

  // --- Description policy for project work (soft) ------------------------
  if (
    workType === 'project' &&
    description.trim().length < POLICY.MIN_PROJECT_DESCRIPTION_LENGTH
  ) {
    warnings.push(
      `La descripción de un proyecto debería tener al menos ${POLICY.MIN_PROJECT_DESCRIPTION_LENGTH} caracteres`
    )
  }

  return { valid: errors.length === 0, errors, warnings }
}

/** Per-record validation result enriched with its index in the batch. */
export interface IndexedValidationResult extends ValidationResult {
  index: number
}

/** Aggregated result for a batch of records. */
export interface BatchValidationResult {
  total: number
  validCount: number
  invalidCount: number
  totalErrors: number
  totalWarnings: number
  results: IndexedValidationResult[]
}

/**
 * Validate a batch of records and return per-record results plus aggregates.
 */
export function validateBatch(
  records: ValidatableTimeRecord[],
  options: ValidationOptions = {}
): BatchValidationResult {
  const results: IndexedValidationResult[] = (records || []).map(
    (record, index) => ({ index, ...validateTimeRecord(record, options) })
  )

  return {
    total: results.length,
    validCount: results.filter((r) => r.valid).length,
    invalidCount: results.filter((r) => !r.valid).length,
    totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
    totalWarnings: results.reduce((sum, r) => sum + r.warnings.length, 0),
    results,
  }
}
