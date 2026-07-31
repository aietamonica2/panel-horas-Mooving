import { describe, it, expect, vi, afterEach } from 'vitest'
import { TOOL_REGISTRY } from '../mcp/server'

//
// Tests para FEAT: valor hora por empleado, métricas ejecutivas reales y
// alertas/preview de inactividad. Usan un D1 falso (estilo mcp_tenant_isolation /
// email_reminders_cron) que resuelve resultados por patrón de SQL y captura el
// SQL + params de cada query ejecutada.
//

function makeCtx({
  role = 'admin',
  company_id = 'tenant-A',
  employees = [] as any[],
  timeRecords = [] as any[],
  env = {} as Record<string, any>,
}: {
  role?: string
  company_id?: string
  employees?: any[]
  timeRecords?: any[]
  env?: Record<string, any>
} = {}) {
  const calls: Array<{ sql: string; params: any[] }> = []

  const resolve = (sql: string) => {
    // El JOIN de get_executive_metrics es `FROM time_records tr LEFT JOIN employees e`,
    // por eso chequeamos time_records primero (contiene "FROM time_records", no "FROM employees").
    if (sql.includes('FROM time_records')) return { results: timeRecords }
    if (sql.includes('FROM employees')) return { results: employees }
    return { results: [] }
  }

  const db = {
    prepare(sql: string) {
      const stmt: any = {
        _params: [] as any[],
        bind(...params: any[]) {
          this._params = params
          return this
        },
        async all() {
          calls.push({ sql, params: this._params })
          return resolve(sql)
        },
        async run() {
          calls.push({ sql, params: this._params })
          return { success: true, meta: { changes: 1 } }
        },
        async first() {
          calls.push({ sql, params: this._params })
          return resolve(sql).results[0] ?? null
        },
      }
      return stmt
    },
  }

  const c: any = {
    env: { DB: db, ...env },
    get: (key: string) =>
      key === 'auth' ? { company_id, role, email: 'caller@moovingtech.com' } : undefined,
  }
  return { c, calls }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('get_employees — valor hora sólo para admin/C-level', () => {
  const employees = [
    { id: 'emp_1', name: 'Ana', email: 'ana@moovingtech.com', is_active: 1, hourly_rate_usd: 50, password_hash: 'secret-hash' },
  ]

  it('NUNCA devuelve password_hash (ni admin ni empleado) — fuga P0', async () => {
    const admin = makeCtx({ role: 'admin', employees })
    const emp = makeCtx({ role: 'employee', employees })
    const rAdmin = await (TOOL_REGISTRY as any).get_employees({}, admin.c)
    const rEmp = await (TOOL_REGISTRY as any).get_employees({}, emp.c)
    expect(rAdmin.employees[0]).not.toHaveProperty('password_hash')
    expect(rEmp.employees[0]).not.toHaveProperty('password_hash')
  })

  it('admin incluye hourly_rate_usd', async () => {
    const { c } = makeCtx({ role: 'admin', employees })
    const res = await (TOOL_REGISTRY as any).get_employees({}, c)
    expect(res.employees[0]).toHaveProperty('hourly_rate_usd', 50)
  })

  it('service (principal de servicio) también lo ve', async () => {
    const { c } = makeCtx({ role: 'service', employees })
    const res = await (TOOL_REGISTRY as any).get_employees({}, c)
    expect(res.employees[0]).toHaveProperty('hourly_rate_usd', 50)
  })

  it('employee NO ve hourly_rate_usd (pero sí el resto de campos)', async () => {
    const { c } = makeCtx({ role: 'employee', employees })
    const res = await (TOOL_REGISTRY as any).get_employees({}, c)
    expect(res.employees[0]).not.toHaveProperty('hourly_rate_usd')
    expect(res.employees[0]).toHaveProperty('id', 'emp_1')
    expect(res.employees[0]).toHaveProperty('name', 'Ana')
  })
})

describe('set_employee_rate — sólo admin', () => {
  it('role != admin → No autorizado y sin UPDATE', async () => {
    const { c, calls } = makeCtx({ role: 'employee' })
    const res = await (TOOL_REGISTRY as any).set_employee_rate(
      { employee_id: 'emp_1', hourly_rate_usd: 99 },
      c
    )
    expect(res).toEqual({ success: false, error: 'No autorizado' })
    expect(calls.find((k) => k.sql.includes('UPDATE employees'))).toBeFalsy()
  })

  it('admin → UPDATE con hourly_rate_usd y company_id', async () => {
    const { c, calls } = makeCtx({ role: 'admin', company_id: 'tenant-A' })
    const res = await (TOOL_REGISTRY as any).set_employee_rate(
      { employee_id: 'emp_9', hourly_rate_usd: 75 },
      c
    )
    expect(res.success).toBe(true)
    expect(res.hourly_rate_usd).toBe(75)

    const last = calls[calls.length - 1]
    expect(last.sql).toContain('UPDATE employees SET hourly_rate_usd')
    expect(last.sql).toContain('company_id = ?')
    expect(last.params).toEqual([75, 'emp_9', 'tenant-A'])
  })

  it('admin → sanitiza tarifa negativa a 0', async () => {
    const { c, calls } = makeCtx({ role: 'admin', company_id: 'tenant-A' })
    const res = await (TOOL_REGISTRY as any).set_employee_rate(
      { employee_id: 'emp_9', hourly_rate_usd: -10 },
      c
    )
    expect(res.hourly_rate_usd).toBe(0)
    expect(calls[calls.length - 1].params[0]).toBe(0)
  })
})

describe('get_executive_metrics — ingreso real = horas × tarifa por empleado', () => {
  it('total_revenue_usd > 0 usando la tarifa (y default 45 si null)', async () => {
    const timeRecords = [
      // Ana: 10h facturables a 50 USD/h = 500
      { employee_id: 'emp_1', employee_name: 'Ana', client_name: 'ACME', work_type: 'project', is_billable: 1, duration_decimal: 10, hourly_rate_usd: 50 },
      // Beto: 5h NO facturables (internal) a 45 = 225
      { employee_id: 'emp_2', employee_name: 'Beto', client_name: 'Globex', work_type: 'internal', is_billable: 0, duration_decimal: 5, hourly_rate_usd: 45 },
      // Caro: 2h facturables, tarifa NULL → default 45 = 90
      { employee_id: 'emp_3', employee_name: 'Caro', client_name: 'ACME', work_type: 'project', is_billable: 1, duration_decimal: 2, hourly_rate_usd: null },
    ]
    const { c } = makeCtx({ role: 'admin', timeRecords })
    const res = await (TOOL_REGISTRY as any).get_executive_metrics({}, c)

    // 500 + 225 + 90 = 815
    expect(res.total_revenue_usd).toBeGreaterThan(0)
    expect(res.total_revenue_usd).toBe(815)

    // Facturables: Ana(10) + Caro(2) = 12; no facturables: Beto(5)
    expect(res.billable_hours).toBe(12)
    expect(res.nonbillable_hours).toBe(5)

    // Ingreso por cliente (top primero): ACME = 500 + 90 = 590
    expect(res.revenue_by_client[0]).toEqual({ client_name: 'ACME', revenue_usd: 590 })

    // Ingreso por empleado: Ana = 500 (confirma que usa la tarifa por empleado, no un fijo)
    const ana = res.revenue_by_employee.find((e: any) => e.employee_name === 'Ana')
    expect(ana.revenue_usd).toBe(500)

    // % facturabilidad = 12 / 17 * 100
    expect(res.billable_rate_pct).toBeCloseTo(70.59, 2)
  })
})

describe('get_inactivity_preview — inactivos + email SIN enviar', () => {
  it('devuelve inactivos con cuerpo de email y no llama a fetch', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-31T12:00:00Z'))

    const orig = globalThis.fetch
    const fetchSpy = vi.fn()
    ;(globalThis as any).fetch = fetchSpy

    try {
      const employees = [
        { id: 'emp_1', name: 'Ana', email: 'ana@moovingtech.com', is_active: 1 },
        { id: 'emp_2', name: 'Beto', email: 'beto@moovingtech.com', is_active: 1 },
        { id: 'emp_3', name: 'Caro', email: 'caro@moovingtech.com', is_active: 1 },
      ]
      const timeRecords = [
        { employee_id: 'emp_1', employee_name: 'Ana', last_date: '2026-07-10' }, // inactivo (> 3 días)
        { employee_id: 'emp_2', employee_name: 'Beto', last_date: '2026-07-30' }, // activo
        // Caro: sin registros → inactivo
      ]
      const { c } = makeCtx({ role: 'admin', employees, timeRecords })
      const res = await (TOOL_REGISTRY as any).get_inactivity_preview({ days: 3 }, c)

      expect(res.sent).toBe(false)
      expect(res.inactive_count).toBe(2)

      const names = res.inactive_employees.map((e: any) => e.name).sort()
      expect(names).toEqual(['Ana', 'Caro'])

      // No se envió NADA
      expect(fetchSpy).not.toHaveBeenCalled()

      const ana = res.inactive_employees.find((e: any) => e.name === 'Ana')
      expect(ana.email).toBe('ana@moovingtech.com')
      expect(ana.last_record_date).toBe('2026-07-10')
      expect(ana.days_inactive).toBe(21)
      expect(ana.email_subject).toContain('registrá tus horas')
      expect(ana.email_body).toContain('Hola Ana')

      const caro = res.inactive_employees.find((e: any) => e.name === 'Caro')
      expect(caro.last_record_date).toBeNull()
      expect(caro.email_body).toContain('Hola Caro')
    } finally {
      ;(globalThis as any).fetch = orig
    }
  })
})

describe('send_inactivity_alerts — Resend prioritario + honestidad sin API key', () => {
  it('sin RESEND_API_KEY → sent:false, reason y lista real de inactivos (sin fetch)', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-31T12:00:00Z'))

    const orig = globalThis.fetch
    const fetchSpy = vi.fn()
    ;(globalThis as any).fetch = fetchSpy

    try {
      const employees = [
        { id: 'emp_1', name: 'Ana', email: 'ana@moovingtech.com', is_active: 1 },
      ]
      const timeRecords = [
        { employee_id: 'emp_1', employee_name: 'Ana', last_date: '2026-07-01' },
      ]
      const { c } = makeCtx({ role: 'admin', employees, timeRecords, env: { RESEND_API_KEY: '' } })
      const res = await (TOOL_REGISTRY as any).send_inactivity_alerts({ days: 3 }, c)

      expect(res.sent).toBe(false)
      expect(res.reason).toBe('RESEND_API_KEY no configurada')
      expect(res.inactive_count).toBe(1)
      expect(res.inactive_employees[0].name).toBe('Ana')
      expect(fetchSpy).not.toHaveBeenCalled()
    } finally {
      ;(globalThis as any).fetch = orig
    }
  })

  it('con RESEND_API_KEY → POST real a Resend y cuenta los envíos confirmados', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-31T12:00:00Z'))

    const orig = globalThis.fetch
    let capturedUrl: any
    let capturedInit: any
    const fetchSpy = vi.fn((url: any, init: any) => {
      capturedUrl = url
      capturedInit = init
      return Promise.resolve(new Response(JSON.stringify({ id: 'email_1' }), { status: 200 }))
    })
    ;(globalThis as any).fetch = fetchSpy

    try {
      const employees = [
        { id: 'emp_1', name: 'Ana', email: 'ana@moovingtech.com', is_active: 1 },
      ]
      const timeRecords = [
        { employee_id: 'emp_1', employee_name: 'Ana', last_date: '2026-07-01' },
      ]
      const { c } = makeCtx({
        role: 'admin',
        employees,
        timeRecords,
        env: { RESEND_API_KEY: 're_test_key', ALERT_FROM_EMAIL: 'alertas@moovingtech.com' },
      })
      const res = await (TOOL_REGISTRY as any).send_inactivity_alerts({ days: 3 }, c)

      expect(fetchSpy).toHaveBeenCalledTimes(1)
      expect(capturedUrl).toBe('https://api.resend.com/emails')
      expect(capturedInit.headers.Authorization).toBe('Bearer re_test_key')
      const payload = JSON.parse(capturedInit.body)
      expect(payload.from).toContain('alertas@moovingtech.com')
      expect(payload.to).toEqual(['ana@moovingtech.com'])

      expect(res.sent).toBe(true)
      expect(res.alerts_sent).toBe(1)
      expect(res.provider).toBe('resend')
    } finally {
      ;(globalThis as any).fetch = orig
    }
  })
})
