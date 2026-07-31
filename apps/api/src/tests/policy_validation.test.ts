import { describe, it, expect } from 'vitest'
import { validateTimeRecord, validateBatch } from '../lib/policyValidation'

// A record that satisfies every policy: 4h of project work, a past date and a
// description well over 10 characters. Used as the baseline that individual
// cases override one field at a time.
const base = {
  employee_id: 'emp_1',
  employee_name: 'Empleado Uno',
  client_id: 'cli_1',
  client_name: 'Cliente Uno',
  project_id: 'proj_1',
  project_name: 'Proyecto Uno',
  duration_decimal: 4,
  date: '2025-01-15',
  work_type: 'project' as const,
  description: 'Descripción suficientemente larga',
}

describe('validateTimeRecord (FUNC-01)', () => {
  it('a fully valid record returns valid=true with no errors or warnings', () => {
    const res = validateTimeRecord(base)
    expect(res.valid).toBe(true)
    expect(res.errors).toHaveLength(0)
    expect(res.warnings).toHaveLength(0)
  })

  it('duration below the 0.5h minimum produces a blocking error', () => {
    const res = validateTimeRecord({ ...base, duration_decimal: 0.25 })
    expect(res.valid).toBe(false)
    expect(res.errors.some((e) => /mínima/i.test(e))).toBe(true)
  })

  it('duration above the 24h maximum produces a blocking error', () => {
    const res = validateTimeRecord({ ...base, duration_decimal: 25 })
    expect(res.valid).toBe(false)
    expect(res.errors.some((e) => /máxima/i.test(e))).toBe(true)
  })

  it('a meeting longer than 2h produces a warning but stays valid', () => {
    const res = validateTimeRecord({
      ...base,
      work_type: 'meeting',
      duration_decimal: 3,
    })
    expect(res.valid).toBe(true)
    expect(res.errors).toHaveLength(0)
    expect(res.warnings.some((w) => /reunión/i.test(w))).toBe(true)
  })

  it('internal work longer than 4h produces a warning but stays valid', () => {
    const res = validateTimeRecord({
      ...base,
      work_type: 'internal',
      duration_decimal: 5,
    })
    expect(res.valid).toBe(true)
    expect(res.errors).toHaveLength(0)
    expect(res.warnings.some((w) => /interno/i.test(w))).toBe(true)
  })

  it('a future date produces a blocking error', () => {
    const res = validateTimeRecord({ ...base, date: '2099-12-31' })
    expect(res.valid).toBe(false)
    expect(res.errors.some((e) => /futuro/i.test(e))).toBe(true)
  })

  it('honours an injected reference date via options.today', () => {
    const res = validateTimeRecord(
      { ...base, date: '2026-08-01' },
      { today: '2026-07-31' }
    )
    expect(res.valid).toBe(false)
    expect(res.errors.some((e) => /futuro/i.test(e))).toBe(true)
  })

  it('a short description on a project produces a warning but stays valid', () => {
    const res = validateTimeRecord({ ...base, description: 'corta' })
    expect(res.valid).toBe(true)
    expect(res.errors).toHaveLength(0)
    expect(res.warnings.some((w) => /descripción/i.test(w))).toBe(true)
  })

  it('boundary durations (exactly 0.5h and 24h) are accepted', () => {
    expect(validateTimeRecord({ ...base, duration_decimal: 0.5 }).valid).toBe(true)
    expect(validateTimeRecord({ ...base, duration_decimal: 24 }).valid).toBe(true)
  })

  it('a missing/non-numeric duration is a blocking error', () => {
    const res = validateTimeRecord({ ...base, duration_decimal: undefined })
    expect(res.valid).toBe(false)
    expect(res.errors.length).toBeGreaterThan(0)
  })
})

describe('validateBatch (FUNC-01)', () => {
  it('aggregates per-row results and valid/invalid/warning counts', () => {
    const batch = validateBatch([
      base, // valid, no warnings
      { ...base, duration_decimal: 0.25 }, // invalid (min duration)
      { ...base, work_type: 'meeting', duration_decimal: 3 }, // valid, 1 warning
    ])

    expect(batch.total).toBe(3)
    expect(batch.validCount).toBe(2)
    expect(batch.invalidCount).toBe(1)
    expect(batch.totalWarnings).toBe(1)
    expect(batch.results[0].index).toBe(0)
    expect(batch.results[1].valid).toBe(false)
    expect(batch.results[2].warnings.length).toBeGreaterThan(0)
  })
})
