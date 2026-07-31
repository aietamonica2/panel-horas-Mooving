import { describe, it, expect } from 'vitest'
import {
  parseCsv,
  mapTogglRows,
  dedupeRecords,
  normalizeEmployeeName,
  consolidateClient,
  CLIENT_ALIASES,
} from './csvImport'

/** The real 18-column Toggl/Clockify header (fully quoted, comma separated). */
const HEADER =
  '"Proyecto","Cliente","Descripción","Equipo","Usuario","Grupo","Correo","Etiquetas","Facturable","Fecha inicio","Hora inicio","Fecha fin","Hora fin","Duración (h)","Duración (decimal)","Tarifa (USD)","Importe (USD)","Fecha creación"'

/** Build one fully-quoted CSV line from 18 cell values. */
function line(cells: string[]): string {
  return cells.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')
}

describe('parseCsv (RFC-4180)', () => {
  it('(a) keeps a quoted field with an internal comma as a single column without misaligning', () => {
    const raw = line([
      'Portal',
      'Camuzzi, team soporte', // <- comma inside quotes must NOT split the row
      'Deploy',
      'Team A',
      'Mónica Aieta',
      'Grupo',
      'monica.aieta@moovingtech.com',
      'tag',
      'Sí',
      '09/06/2026',
      '09:00',
      '09/06/2026',
      '12:00',
      '03:00:00',
      '3.00',
      '50',
      '150',
      '09/06/2026',
    ])

    const rows = parseCsv(raw)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toHaveLength(18)
    // The client with the comma stays intact in column 1...
    expect(rows[0][1]).toBe('Camuzzi, team soporte')
    // ...and everything downstream stays aligned (decimal duration still at col 14).
    expect(rows[0][14]).toBe('3.00')
    expect(rows[0][17]).toBe('09/06/2026')
  })

  it('handles quoted newlines and escaped quotes', () => {
    const raw = '"a","b\nstill b","c""quoted"""'
    const rows = parseCsv(raw)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toEqual(['a', 'b\nstill b', 'c"quoted"'])
  })
})

describe('mapTogglRows', () => {
  const csv = [
    HEADER,
    // (e) valid row, start date 09/06/2026 -> 2026-06-09, billable
    line([
      'Portal Camuzzi',
      'Camuzzi, team soporte',
      'Deploy inicial',
      'T',
      'Mónica Aieta',
      'G',
      'monica.aieta@moovingtech.com',
      '',
      'Sí',
      '09/06/2026',
      '09:00',
      '09/06/2026',
      '12:00',
      '03:00:00',
      '3.00',
      '50',
      '150',
      '09/06/2026',
    ]),
    // (b) "Daily proyectos X" -> meeting
    line([
      'Soporte',
      'ClienteX',
      'Daily proyectos X',
      'T',
      'Juan Perez',
      'G',
      'juan@x.com',
      '',
      'No',
      '10/06/2026',
      '09:00',
      '10/06/2026',
      '09:30',
      '00:30:00',
      '0.50',
      '0',
      '0',
      '10/06/2026',
    ]),
    // (c) "Capacitación Bauti" -> training
    line([
      'Capacitación Bauti',
      'ClienteY',
      'Sesión de onboarding',
      'T',
      'Ana Gomez',
      'G',
      'ana@x.com',
      '',
      'No',
      '11/06/2026',
      '09:00',
      '11/06/2026',
      '11:00',
      '02:00:00',
      '2.00',
      '0',
      '0',
      '11/06/2026',
    ]),
    // (d) missing start date -> rejected, NOT fabricated
    line([
      'Proyecto Z',
      'ClienteZ',
      'SIN FECHA ROW',
      'T',
      'Leo Diaz',
      'G',
      'leo@x.com',
      '',
      'Sí',
      '', // <- no date
      '09:00',
      '',
      '12:00',
      '03:00:00',
      '3.00',
      '50',
      '150',
      '12/06/2026',
    ]),
  ].join('\n')

  const { records, rejected } = mapTogglRows(parseCsv(csv))

  it('imports the valid rows and rejects the invalid one', () => {
    expect(records).toHaveLength(3)
    expect(rejected).toHaveLength(1)
  })

  it('(e) converts dd/mm/yyyy 09/06/2026 into ISO 2026-06-09', () => {
    const monica = records.find((r) => r.employee_name === 'Mónica Aieta')
    expect(monica).toBeDefined()
    expect(monica?.date).toBe('2026-06-09')
  })

  it('(b) classifies "Daily proyectos X" as a meeting', () => {
    const daily = records.find((r) => r.description === 'Daily proyectos X')
    expect(daily).toBeDefined()
    expect(daily?.work_type).toBe('meeting')
  })

  it('(c) classifies "Capacitación Bauti" as training', () => {
    const training = records.find((r) => r.project_name === 'Capacitación Bauti')
    expect(training).toBeDefined()
    expect(training?.work_type).toBe('training')
  })

  it('(d) sends the row without a date to rejected and never fabricates it', () => {
    // The invalid row must not appear among the imported records...
    expect(records.find((r) => r.description === 'SIN FECHA ROW')).toBeUndefined()
    // ...and it must be reported as rejected with a date-related reason.
    expect(rejected).toHaveLength(1)
    expect(rejected[0].reason.toLowerCase()).toContain('fecha')
    // No fabricated today()/1.0 anywhere: every kept record has a real ISO date.
    expect(records.every((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.date))).toBe(true)
  })

  it('maps billable, duration decimal, employee id and money columns', () => {
    const monica = records.find((r) => r.employee_name === 'Mónica Aieta')
    expect(monica?.is_billable).toBe(1)
    expect(monica?.duration_decimal).toBe(3.0)
    expect(monica?.employee_id).toBe('monica.aieta')
    expect(monica?.rate_usd).toBe(50)
    expect(monica?.amount_usd).toBe(150)

    const juan = records.find((r) => r.employee_name === 'Juan Perez')
    expect(juan?.is_billable).toBe(0)
  })
})

describe('DATA-03 — client consolidation (Interno -> Mooving)', () => {
  it('(a) maps client "Interno" to the corporate client Mooving with client_id "mooving"', () => {
    const csv = [
      HEADER,
      line([
        'Tareas Internas',
        'Interno',
        'Backlog interno',
        'T',
        'Augusto Morelli',
        'G',
        'augusto@moovingtech.com',
        '',
        'No',
        '15/06/2026',
        '09:00',
        '15/06/2026',
        '10:00',
        '01:00:00',
        '1.00',
        '0',
        '0',
        '15/06/2026',
      ]),
    ].join('\n')

    const { records } = mapTogglRows(parseCsv(csv))
    expect(records).toHaveLength(1)
    expect(records[0].client_id).toBe('mooving')
    expect(records[0].client_name).toBe('Mooving')
  })

  it('lowercase "interno" also consolidates and CLIENT_ALIASES is configurable', () => {
    expect(consolidateClient('interno', 'x')).toEqual({ id: 'mooving', name: 'Mooving' })
    expect(CLIENT_ALIASES.interno).toEqual({ id: 'mooving', name: 'Mooving' })
    // An unrelated external client is left untouched (raw slug is kept downstream).
    expect(consolidateClient('Camuzzi', 'Portal')).toBeNull()
  })
})

describe('DATA-04 — dedupe by natural key', () => {
  const dupRow = line([
    'Portal Camuzzi',
    'Camuzzi',
    'Deploy',
    'T',
    'Mónica Aieta',
    'G',
    'monica.aieta@moovingtech.com',
    '',
    'Sí',
    '09/06/2026',
    '09:00',
    '09/06/2026',
    '12:00',
    '03:00:00',
    '3.00',
    '50',
    '150',
    '09/06/2026',
  ])

  it('(b) collapses two identical rows into one and reports duplicatesRemoved = 1', () => {
    const csv = [HEADER, dupRow, dupRow].join('\n')
    const { records, duplicatesRemoved } = mapTogglRows(parseCsv(csv))
    expect(records).toHaveLength(1)
    expect(duplicatesRemoved).toBe(1)
  })

  it('keeps entries that differ only by start time (not exact duplicates)', () => {
    const later = line([
      'Portal Camuzzi',
      'Camuzzi',
      'Deploy',
      'T',
      'Mónica Aieta',
      'G',
      'monica.aieta@moovingtech.com',
      '',
      'Sí',
      '09/06/2026',
      '14:00',
      '09/06/2026',
      '17:00',
      '03:00:00',
      '3.00',
      '50',
      '150',
      '09/06/2026',
    ])
    const { records, duplicatesRemoved } = mapTogglRows(parseCsv([HEADER, dupRow, later].join('\n')))
    expect(records).toHaveLength(2)
    expect(duplicatesRemoved).toBe(0)
  })

  it('exposes dedupeRecords, which counts removals on a record list', () => {
    const { records: recs } = mapTogglRows(parseCsv([HEADER, dupRow].join('\n')))
    const { records, duplicatesRemoved } = dedupeRecords([...recs, ...recs])
    expect(records).toHaveLength(1)
    expect(duplicatesRemoved).toBe(1)
  })
})

describe('DATA-05 — normalizeEmployeeName', () => {
  it('(c) turns the handle "monica.aieta" into "Monica Aieta"', () => {
    expect(normalizeEmployeeName('monica.aieta')).toBe('Monica Aieta')
  })

  it('(d) leaves an already-proper "Augusto Morelli" unchanged', () => {
    expect(normalizeEmployeeName('Augusto Morelli')).toBe('Augusto Morelli')
  })

  it('handles underscore handles and is applied by mapTogglRows (id stays stable)', () => {
    expect(normalizeEmployeeName('juan_perez')).toBe('Juan Perez')

    const csv = [
      HEADER,
      line([
        'Proyecto',
        'ClienteX',
        'Tarea',
        'T',
        'monica.aieta',
        'G',
        'monica.aieta@moovingtech.com',
        '',
        'No',
        '12/06/2026',
        '09:00',
        '12/06/2026',
        '10:00',
        '01:00:00',
        '1.00',
        '0',
        '0',
        '12/06/2026',
      ]),
    ].join('\n')

    const { records } = mapTogglRows(parseCsv(csv))
    expect(records[0].employee_name).toBe('Monica Aieta')
    // employee_id remains stable: derived from the email, lowercase, dot-separated.
    expect(records[0].employee_id).toBe('monica.aieta')
  })
})
