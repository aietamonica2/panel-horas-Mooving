import { describe, it, expect, vi, afterEach } from 'vitest'
import { Hono } from 'hono'
import { buildIdentityResolver, normKey as normKeyFromIdentity } from '../lib/identity'
import { normKey as normKeyReexported, buildEmployeeHoursResolver } from '../mcp/email_templates'
import { TOOL_REGISTRY, executeToolCall } from '../mcp/server'
import dataRouter from '../routes/data'
import { handleEmailRemindersCron } from '../cron/email_reminders'

//
// Tests para B5 — identidad canónica (employee_key).
// Cubre:
//   - buildIdentityResolver: id exacto, alias (nombre / local-part de email),
//     normKey con acentos/puntos/guiones, preferencia por activos, null si no
//     matchea, y prioridad (a) > (b) > (c).
//   - normKey movida a lib/identity y RE-exportada desde mcp/email_templates.
//   - buildEmployeeHoursResolver matchea directo por employee_key.
//   - Ingestas setean employee_key al insertar: create_time_record,
//     create_bulk_time_records (padrón cargado UNA vez), sync_zendesk_tickets,
//     POST/PUT de routes/data y el sync de Clockify del cron mensual.
//   - Lecturas: get_executive_metrics prioriza employee_key en la tarifa;
//     computeInactiveEmployees (via get_inactivity_preview) y
//     get_email_reminder_drafts consideran employee_key;
//     get_employee_insights resuelve identidad (id, alias o nombre).
//
// Usa el mismo patrón de D1 falso por patrón de SQL + captura de binds que
// mcp_metrics_rates.test.ts / zendesk_and_filters.test.ts.
//

// Padrón realista (casos verificados en la auditoría B5).
const EMPLOYEES = [
  { id: 'emp_admin_1', name: 'Mónica Aieta', email: 'monica.aieta@moovingtech.com', is_active: 1 },
  { id: 'emp_felipe', name: 'felipe.gutierrez', email: 'felipe.gutierrez@moovingtech.com', is_active: 1 },
  { id: 'emp_7db45c63', name: 'Bautista Barrio', email: 'bautista.barrio@moovingtech.com', is_active: 1 },
]

afterEach(() => {
  vi.useRealTimers()
})

// ---------------------------------------------------------------------------
// buildIdentityResolver — resolución pura
// ---------------------------------------------------------------------------

describe('buildIdentityResolver — prioridad id exacto → alias → normKey', () => {
  it('(a) rawId igual exacto a un employees.id devuelve ese id', () => {
    const resolve = buildIdentityResolver(EMPLOYEES, [])
    expect(resolve('emp_7db45c63', 'Bautista Barrio')).toBe('emp_7db45c63')
    // El id exacto gana aunque el nombre no matchee nada.
    expect(resolve('emp_admin_1', 'nombre-cualquiera')).toBe('emp_admin_1')
  })

  it('(b) alias por alias_name normalizado', () => {
    const resolve = buildIdentityResolver(EMPLOYEES, [
      { alias_email: '', alias_name: 'Pedro L.', employee_id: 'emp_7db45c63' },
    ])
    expect(resolve('zen_user_xyz', 'Pedro L.')).toBe('emp_7db45c63')
    // También matchea por el rawId normalizado contra el alias.
    expect(resolve('pedro-l', 'Otro Nombre Raro')).toBe('emp_7db45c63')
  })

  it('(b) alias por local-part del alias_email normalizado', () => {
    const resolve = buildIdentityResolver(EMPLOYEES, [
      { alias_email: 'pedro.lizondo@zendesk-agent.com', alias_name: '', employee_id: 'emp_felipe' },
    ])
    expect(resolve('pedro-lizondo', 'quien sabe')).toBe('emp_felipe')
    // rawEmail opcional: su local-part también resuelve vía alias.
    expect(resolve('sin-match', 'sin match', 'pedro.lizondo@otrodominio.com')).toBe('emp_felipe')
  })

  it('(b) tiene prioridad sobre (c): un alias explícito le gana al match por nombre', () => {
    const employees = [
      { id: 'emp_a', name: 'ana.lopez', email: null, is_active: 1 },
      { id: 'emp_b', name: 'Beto', email: null, is_active: 1 },
    ]
    const aliases = [{ alias_email: '', alias_name: 'ana.lopez', employee_id: 'emp_b' }]
    const resolve = buildIdentityResolver(employees, aliases)
    // normKey('ana-lopez') matchearía emp_a por nombre, pero el alias manda a emp_b.
    expect(resolve('ana-lopez', '')).toBe('emp_b')
  })

  it('(b) un alias que apunta a un empleado inexistente NO resuelve (cae a (c)/null)', () => {
    const resolve = buildIdentityResolver(EMPLOYEES, [
      { alias_email: '', alias_name: 'fantasma', employee_id: 'emp_borrado' },
    ])
    expect(resolve('fantasma', 'fantasma')).toBeNull()
  })

  it('(c) normKey: acentos, puntos y guiones colapsan (caso Mónica de la auditoría)', () => {
    const resolve = buildIdentityResolver(EMPLOYEES, [])
    // Clockify: employee_id='monica-aieta', employee_name='monica.aieta' → ficha emp_admin_1.
    expect(resolve('monica-aieta', 'monica.aieta')).toBe('emp_admin_1')
    // felipe-gutierrez / felipe.gutierrez → ficha "felipe.gutierrez".
    expect(resolve('felipe-gutierrez', 'felipe.gutierrez')).toBe('emp_felipe')
    // Nombre "humano" sin acento también resuelve contra la ficha acentuada.
    expect(resolve('x', 'Monica Aieta')).toBe('emp_admin_1')
  })

  it('(c) matchea contra el local-part del email de la ficha', () => {
    const employees = [
      { id: 'emp_9', name: 'B. B.', email: 'bautista.barrio@moovingtech.com', is_active: 1 },
    ]
    const resolve = buildIdentityResolver(employees, [])
    // Ni id ni nombre matchean, pero el local-part del email de la ficha sí.
    expect(resolve('bautista-barrio', 'Bautista Barrio')).toBe('emp_9')
  })

  it('(c) empates prefieren empleados ACTIVOS', () => {
    const employees = [
      { id: 'emp_viejo', name: 'Juan Perez', email: null, is_active: 0 },
      { id: 'emp_nuevo', name: 'Juan Pérez', email: null, is_active: 1 },
    ]
    const resolve = buildIdentityResolver(employees, [])
    expect(resolve('juan.perez', '')).toBe('emp_nuevo')

    // Si SÓLO matchean inactivos, devuelve el primero de ellos (no null).
    const soloInactivos = buildIdentityResolver(
      [{ id: 'emp_viejo', name: 'Juan Perez', email: null, is_active: 0 }],
      []
    )
    expect(soloInactivos('juan.perez', '')).toBe('emp_viejo')
  })

  it('devuelve null si nada matchea o si la identidad es vacía (nunca inventa)', () => {
    const resolve = buildIdentityResolver(EMPLOYEES, [])
    expect(resolve('desconocido-123', 'Alguien Nuevo')).toBeNull()
    expect(resolve('', '')).toBeNull()
    const vacio = buildIdentityResolver([], [])
    expect(vacio('monica-aieta', 'monica.aieta')).toBeNull()
  })
})

describe('normKey — vive en lib/identity y se re-exporta desde email_templates', () => {
  it('ambos imports son la MISMA función y normalizan igual', () => {
    expect(normKeyReexported).toBe(normKeyFromIdentity)
    expect(normKeyFromIdentity('Mónica Aieta')).toBe('monicaaieta')
    expect(normKeyFromIdentity('monica.aieta')).toBe('monicaaieta')
    expect(normKeyFromIdentity('monica-aieta')).toBe('monicaaieta')
    expect(normKeyFromIdentity('MONICA_AIETA')).toBe('monicaaieta')
    expect(normKeyFromIdentity('monica.aieta@moovingtech.com')).toBe('monicaaietamoovingtechcom')
    expect(normKeyFromIdentity('')).toBe('')
  })
})

describe('buildEmployeeHoursResolver — match directo por employee_key', () => {
  it('suma filas cuyo employee_key es el id de la ficha aunque el id/nombre crudos no matcheen', () => {
    const rows = [
      // Identidad cruda irreconocible, pero employee_key canónico seteado (B5).
      { employee_id: 'zen_user_xx', employee_name: 'B. B.', employee_key: 'emp_7db45c63', total_hours: 3 },
      // Fila de otra persona: no debe sumarse.
      { employee_id: 'otro', employee_name: 'Otro', employee_key: null, total_hours: 7 },
    ]
    const resolveHours = buildEmployeeHoursResolver(rows, [])
    const total = resolveHours({ id: 'emp_7db45c63', name: 'Bautista Barrio', email: 'bautista.barrio@moovingtech.com' })
    expect(total).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// Stub D1 compartido para las tools MCP (captura SQL + binds)
// ---------------------------------------------------------------------------

function makeToolCtx({
  role = 'admin',
  company_id = 'mooving-default',
  employees = EMPLOYEES as any[],
  aliases = [] as any[],
  timeRecords = [] as any[],
  env = {} as Record<string, any>,
} = {}) {
  const calls: Array<{ sql: string; params: any[] }> = []

  const resolveQuery = (sql: string) => {
    if (sql.includes('FROM time_records')) return { results: timeRecords }
    if (sql.includes('FROM employee_aliases')) return { results: aliases }
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
          return resolveQuery(sql)
        },
        async run() {
          calls.push({ sql, params: this._params })
          return { success: true, meta: { changes: 1 } }
        },
        async first() {
          calls.push({ sql, params: this._params })
          return resolveQuery(sql).results[0] ?? null
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

const findInsert = (calls: Array<{ sql: string; params: any[] }>) =>
  calls.filter((k) => /INSERT\s+(OR\s+IGNORE\s+)?INTO\s+time_records/i.test(k.sql))

// ---------------------------------------------------------------------------
// Ingestas — setean employee_key al insertar
// ---------------------------------------------------------------------------

describe('ingesta — create_time_record setea employee_key', () => {
  it('resuelve la identidad cruda de Clockify a la ficha canónica', async () => {
    const { c, calls } = makeToolCtx()
    await (TOOL_REGISTRY as any).create_time_record(
      {
        employee_id: 'monica-aieta',
        employee_name: 'monica.aieta',
        client_id: 'cli_1',
        client_name: 'ACME',
        project_id: 'proj_1',
        project_name: 'P1',
        duration_decimal: 2.5,
        date: '2026-08-01',
        work_type: 'project',
      },
      c
    )

    const inserts = findInsert(calls)
    expect(inserts).toHaveLength(1)
    expect(inserts[0].sql).toContain('employee_key')
    // bind order: id, company_id, employee_id, employee_name, employee_key, ...
    expect(inserts[0].params[2]).toBe('monica-aieta')
    expect(inserts[0].params[3]).toBe('monica.aieta')
    expect(inserts[0].params[4]).toBe('emp_admin_1')
  })

  it('identidad irreconocible → employee_key NULL (nunca inventa)', async () => {
    const { c, calls } = makeToolCtx()
    await (TOOL_REGISTRY as any).create_time_record(
      {
        employee_id: 'desconocido-999',
        employee_name: 'Persona Nueva',
        client_id: 'cli_1',
        client_name: 'ACME',
        project_id: 'proj_1',
        project_name: 'P1',
        duration_decimal: 1,
        date: '2026-08-01',
        work_type: 'project',
      },
      c
    )

    const inserts = findInsert(calls)
    expect(inserts[0].params[4]).toBeNull()
  })
})

describe('ingesta — create_bulk_time_records setea employee_key (padrón cargado UNA vez)', () => {
  it('todas las filas del lote llevan la clave canónica y employees se consulta una sola vez', async () => {
    const { c, calls } = makeToolCtx()
    const res = await (TOOL_REGISTRY as any).create_bulk_time_records(
      {
        employee_id: 'felipe-gutierrez',
        employee_name: 'felipe.gutierrez',
        client_id: 'cli_1',
        client_name: 'ACME',
        project_id: 'proj_1',
        project_name: 'P1',
        duration_decimal: 8,
        work_type: 'project',
        start_date: '2026-06-01',
        end_date: '2026-06-05',
      },
      c
    )

    expect(res.records_inserted).toBeGreaterThanOrEqual(4)
    const inserts = findInsert(calls)
    expect(inserts.length).toBe(res.records_inserted)
    for (const ins of inserts) {
      expect(ins.sql).toContain('employee_key')
      expect(ins.params[4]).toBe('emp_felipe')
    }

    // El padrón se carga UNA vez por lote (no una consulta por fila insertada).
    const empSelects = calls.filter((k) => k.sql.includes('FROM employees'))
    expect(empSelects).toHaveLength(1)
    const aliasSelects = calls.filter((k) => k.sql.includes('FROM employee_aliases'))
    expect(aliasSelects).toHaveLength(1)
  })
})

describe('ingesta — sync_zendesk_tickets setea employee_key', () => {
  it('agente con nombre sin acento resuelve a la ficha acentuada aunque el id quede sintético', async () => {
    const { c, calls } = makeToolCtx({
      env: {
        ZENDESK_SUBDOMAIN: 'mooving',
        ZENDESK_EMAIL: 'support@moovingtech.com',
        ZENDESK_API_TOKEN: 'zd-token',
      },
    })

    const origFetch = globalThis.fetch
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        results: [
          { id: 42, subject: 'Ticket prueba', updated_at: '2026-08-01T10:00:00Z', assignee_id: 7 },
        ],
        // "Monica Aieta" SIN acento y con email personal: los matches exactos del
        // sync (email/alias/nombre) fallan → id sintético zen_user_..., pero el
        // resolvedor canónico matchea por normKey contra la ficha "Mónica Aieta".
        users: [{ id: 7, name: 'Monica Aieta', email: 'monica@personal.com' }],
      }),
    }) as any

    try {
      const result = await executeToolCall('sync_zendesk_tickets', {}, c)
      expect(result.success).toBe(true)

      const inserts = findInsert(calls)
      expect(inserts).toHaveLength(1)
      const row = inserts[0]
      expect(row.sql).toContain('employee_key')
      // employee_id quedó sintético (sin match exacto)...
      expect(String(row.params[2])).toMatch(/^zen_user_/)
      // ...pero employee_key resolvió a la ficha canónica.
      expect(row.params[4]).toBe('emp_admin_1')
      // El source sigue siendo el último bind (compat con asserts existentes).
      expect(row.params[row.params.length - 1]).toBe('zendesk')
    } finally {
      globalThis.fetch = origFetch
    }
  })
})

describe('ingesta — routes/data setea employee_key', () => {
  function makeApp(auth: any, ctx: ReturnType<typeof makeToolCtx>) {
    const app = new Hono()
    app.use('/api/data/*', async (c, next) => {
      if (auth) c.set('auth', auth)
      await next()
    })
    app.route('/api/data', dataRouter)
    return { app, env: { DB: (ctx.c as any).env.DB } }
  }

  const validRecord = {
    employee_id: 'monica-aieta',
    employee_name: 'monica.aieta',
    client_id: 'cli_1',
    client_name: 'Cliente Uno',
    project_id: 'proj_1',
    project_name: 'Proyecto Uno',
    duration_decimal: 2.5,
    date: '2026-07-30',
    work_type: 'project' as const,
    description: 'Test identidad',
  }

  it('POST /api/data/records inserta con employee_key canónico', async () => {
    const ctx = makeToolCtx()
    const { app, env } = makeApp({ company_id: 'mooving-default', user_id: 'emp_admin', role: 'admin' }, ctx)

    const res = await app.request(
      '/api/data/records',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(validRecord) },
      env as any
    )
    expect(res.status).toBe(200)

    const inserts = findInsert(ctx.calls)
    expect(inserts).toHaveLength(1)
    expect(inserts[0].sql).toContain('employee_key')
    // bind order: id, company_id, employee_id, employee_name, employee_key, ...
    expect(inserts[0].params[2]).toBe('monica-aieta')
    expect(inserts[0].params[4]).toBe('emp_admin_1')
  })

  it('POST /api/data/upload (CSV) resuelve por fila con el padrón cargado UNA vez', async () => {
    const ctx = makeToolCtx()
    const { app, env } = makeApp({ company_id: 'mooving-default', user_id: 'emp_admin', role: 'admin' }, ctx)

    const res = await app.request(
      '/api/data/upload',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: [
            validRecord,
            { ...validRecord, employee_id: 'felipe-gutierrez', employee_name: 'felipe.gutierrez' },
            { ...validRecord, employee_id: 'nadie-conocido', employee_name: 'Nadie Conocido' },
          ],
        }),
      },
      env as any
    )
    expect(res.status).toBe(200)

    const inserts = findInsert(ctx.calls)
    expect(inserts).toHaveLength(3)
    expect(inserts[0].params[4]).toBe('emp_admin_1')
    expect(inserts[1].params[4]).toBe('emp_felipe')
    expect(inserts[2].params[4]).toBeNull() // sin match → NULL, nunca inventa

    // Padrón una sola vez para todo el CSV.
    expect(ctx.calls.filter((k) => k.sql.includes('FROM employees'))).toHaveLength(1)
  })

  it('PUT /api/data/records/:id re-resuelve employee_key al editar', async () => {
    const ctx = makeToolCtx()
    const { app, env } = makeApp({ company_id: 'mooving-default', user_id: 'emp_admin', role: 'admin' }, ctx)

    const res = await app.request(
      '/api/data/records/rec_1',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...validRecord, employee_id: 'felipe-gutierrez', employee_name: 'felipe.gutierrez' }),
      },
      env as any
    )
    expect(res.status).toBe(200)

    const update = ctx.calls.find((k) => /UPDATE\s+time_records\s+SET/i.test(k.sql))!
    expect(update, 'el PUT debe ejecutar el UPDATE').toBeTruthy()
    expect(update.sql).toContain('employee_key = ?')
    // bind order del SET: employee_id, employee_name, employee_key, ...
    expect(update.params[0]).toBe('felipe-gutierrez')
    expect(update.params[2]).toBe('emp_felipe')
  })
})

describe('ingesta — syncClockifyForTenant (cron mensual) setea employee_key', () => {
  it('el INSERT del sync del cron lleva la clave canónica resuelta', async () => {
    const inserts: Array<{ sql: string; params: any[] }> = []
    const settings = [{ company_id: 'mooving-default', default_cc: '', is_automated: 1 }]

    const db: any = {
      prepare(sql: string) {
        const stmt: any = {
          _params: [] as any[],
          bind(...params: any[]) {
            this._params = params
            return this
          },
          async all() {
            if (sql.includes('email_reminder_settings')) return { results: settings }
            if (sql.includes('FROM employee_aliases')) return { results: [] }
            if (sql.includes('FROM employees')) return { results: EMPLOYEES }
            if (sql.includes('FROM time_records')) return { results: [] }
            return { results: [] }
          },
          async run() {
            if (/INSERT\s+OR\s+IGNORE\s+INTO\s+time_records/i.test(sql)) {
              inserts.push({ sql, params: this._params })
            }
            return { success: true, meta: { changes: 1 } }
          },
          async first() {
            return null
          },
        }
        // Nota: .all()/.run() funcionan con o sin .bind() previo (la query de
        // settings del cron llama .prepare(sql).all() directo).
        return stmt
      },
    }

    const origFetch = globalThis.fetch
    globalThis.fetch = vi.fn(async (url: any, init?: any) => {
      const u = String(url)
      if (u.includes('/workspaces') && !u.includes('/reports')) {
        return new Response(JSON.stringify([{ id: 'ws1', name: 'Mooving Tech' }]), { status: 200 })
      }
      if (u.includes('/reports/detailed')) {
        const body = JSON.parse(init?.body || '{}')
        const page = body?.detailedFilter?.page || 1
        const timeentries =
          page === 1
            ? [
                {
                  _id: 'e1',
                  userName: 'Monica Aieta', // sin acento vs ficha "Mónica Aieta"
                  clientName: 'ACME',
                  projectName: 'Proyecto X',
                  description: 'trabajo',
                  timeInterval: { duration: 7200, start: '2026-08-01T10:00:00Z' },
                },
              ]
            : []
        return new Response(JSON.stringify({ timeentries }), { status: 200 })
      }
      // SendGrid / Resend del envío posterior.
      return new Response(null, { status: 202 })
    }) as any

    try {
      await handleEmailRemindersCron({
        DB: db,
        ENVIRONMENT: 'development',
        SENDGRID_API_KEY: 'SG.test-key',
        SENDGRID_FROM_EMAIL: 'test@moovingtech.com',
        CLOCKIFY_API_TOKEN: 'clk-token',
      } as any)

      expect(inserts).toHaveLength(1)
      expect(inserts[0].sql).toContain('employee_key')
      // bind order: id, company_id, employee_id, employee_name, employee_key, ...
      expect(inserts[0].params[2]).toBe('monica-aieta')
      expect(inserts[0].params[3]).toBe('Monica Aieta')
      expect(inserts[0].params[4]).toBe('emp_admin_1')
    } finally {
      globalThis.fetch = origFetch
    }
  })
})

// ---------------------------------------------------------------------------
// Lecturas — prefieren employee_key con fallback al matching viejo
// ---------------------------------------------------------------------------

describe('lectura — get_executive_metrics prioriza employee_key para la tarifa', () => {
  // Stub que EMULA la subconsulta correlacionada de tarifa de D1 con la misma
  // prioridad que el SQL de producción: employee_key → employee_id → employee_name.
  function makeMetricsCtx(employees: any[], timeRecords: any[]) {
    const calls: Array<{ sql: string; params: any[] }> = []
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
            if (sql.includes('FROM time_records')) {
              return {
                results: timeRecords.map((r) => {
                  const byKey = employees.find((e) => !!r.employee_key && e.id === r.employee_key)
                  const byId = employees.find((e) => e.id === r.employee_id)
                  const byName = employees.find((e) => e.name === r.employee_name)
                  const m = byKey || byId || byName
                  return { ...r, hourly_rate_usd: m ? m.hourly_rate_usd : null }
                }),
              }
            }
            if (sql.includes('FROM employees')) return { results: employees }
            return { results: [] }
          },
          async run() {
            calls.push({ sql, params: this._params })
            return { success: true, meta: { changes: 1 } }
          },
          async first() {
            calls.push({ sql, params: this._params })
            return null
          },
        }
        return stmt
      },
    }
    const c: any = {
      env: { DB: db },
      get: (key: string) => (key === 'auth' ? { company_id: 'mooving-default', role: 'admin' } : undefined),
    }
    return { c, calls }
  }

  it('registro con identidad cruda irreconocible pero employee_key seteado usa la tarifa de la ficha', async () => {
    const employees = [{ id: 'emp_admin_1', name: 'Mónica Aieta', hourly_rate_usd: 60 }]
    const timeRecords = [
      // Sin employee_key este registro caería a la tarifa default (45): ni el id
      // ni el nombre crudos matchean la ficha por igualdad exacta.
      { employee_id: 'monica-aieta', employee_name: 'monica.aieta', employee_key: 'emp_admin_1', client_name: 'ACME', work_type: 'project', is_billable: 1, duration_decimal: 10 },
      // Registro sin backfill y sin match → default 45.
      { employee_id: 'nadie', employee_name: 'Nadie', employee_key: null, client_name: 'ACME', work_type: 'project', is_billable: 1, duration_decimal: 2 },
    ]
    const { c, calls } = makeMetricsCtx(employees, timeRecords)
    const res = await (TOOL_REGISTRY as any).get_executive_metrics({}, c)

    // 10h × 60 (tarifa vía employee_key) + 2h × 45 (default) = 690.
    expect(res.total_revenue_usd).toBe(690)

    // La subconsulta SQL prioriza employee_key antes que el matching viejo.
    const q = calls.find((k) => k.sql.includes('FROM time_records'))!
    expect(q.sql).toContain('tr.employee_key')
    expect(q.sql).toMatch(/ORDER BY \(e\.id = tr\.employee_key\) DESC/)
  })
})

describe('lectura — computeInactiveEmployees considera employee_key', () => {
  it('un empleado con horas recientes SOLO matcheables por employee_key no figura inactivo', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-03T12:00:00Z'))

    const { c } = makeToolCtx({
      employees: [
        { id: 'emp_admin_1', name: 'Mónica Aieta', email: 'monica.aieta@moovingtech.com', is_active: 1 },
        { id: 'emp_7db45c63', name: 'Bautista Barrio', email: 'bautista.barrio@moovingtech.com', is_active: 1 },
      ],
      timeRecords: [
        // El matching viejo (id/nombre en minúsculas) NO matchea la ficha
        // "Mónica Aieta"; sólo employee_key la conecta con sus horas de ayer.
        { employee_id: 'monica-aieta', employee_name: 'monica.aieta', employee_key: 'emp_admin_1', last_date: '2026-08-02' },
        // Bautista: sin registros → inactivo.
      ],
    })

    const res = await (TOOL_REGISTRY as any).get_inactivity_preview({ days: 3 }, c)
    const names = res.inactive_employees.map((e: any) => e.name)
    expect(names).toEqual(['Bautista Barrio'])
    expect(names).not.toContain('Mónica Aieta')
  })
})

describe('lectura — get_email_reminder_drafts suma horas por employee_key', () => {
  it('el borrador refleja horas registradas bajo identidad cruda irreconocible pero con clave canónica', async () => {
    const { c, calls } = makeToolCtx({
      employees: [{ id: 'emp_7db45c63', name: 'Bautista Barrio', email: 'bautista.barrio@moovingtech.com', is_active: 1 }],
      timeRecords: [
        { employee_id: 'zen_user_xyz', employee_name: 'B. B.', employee_key: 'emp_7db45c63', total_hours: 5 },
      ],
    })

    const res = await (TOOL_REGISTRY as any).get_email_reminder_drafts({ month: '2026-07' }, c)
    expect(res.drafts).toHaveLength(1)
    expect(res.drafts[0].hours).toBe(5)
    expect(res.drafts[0].hours_formatted).toBe('5,00')

    // El SELECT de horas ahora agrupa también por employee_key.
    const hoursQuery = calls.find((k) => k.sql.includes('SUM(duration_decimal)'))!
    expect(hoursQuery.sql).toContain('employee_key')
  })
})

describe('lectura — get_employee_insights resuelve identidad (id, alias o nombre)', () => {
  it('consultar por la ficha canónica encuentra las horas guardadas bajo el id crudo de Clockify', async () => {
    const { c } = makeToolCtx({
      timeRecords: [
        { employee_id: 'monica-aieta', employee_name: 'monica.aieta', employee_key: null, duration_decimal: 4, date: '2026-07-01', client_name: 'ACME' },
        { employee_id: 'monica-aieta', employee_name: 'monica.aieta', employee_key: null, duration_decimal: 6, date: '2026-07-02', client_name: 'ACME' },
        { employee_id: 'otro-empleado', employee_name: 'Otro', employee_key: null, duration_decimal: 9, date: '2026-07-02', client_name: 'Globex' },
      ],
    })

    // Con el matching viejo (employee_id = 'emp_admin_1' exacto) esto daba 0h.
    const res = await (TOOL_REGISTRY as any).get_employee_insights({ employee_id: 'emp_admin_1', month: '2026-07' }, c)
    expect(res.resolved_employee_id).toBe('emp_admin_1')
    expect(res.total_hours_loaded).toBe(10)
    expect(res.top_clients).toEqual({ ACME: 10 })
  })

  it('también acepta un nombre/alias como identificador y matchea por employee_key', async () => {
    const { c } = makeToolCtx({
      aliases: [{ alias_email: 'bau@zendesk.com', alias_name: 'Bau', employee_id: 'emp_7db45c63' }],
      timeRecords: [
        { employee_id: 'zen_user_bau', employee_name: 'Bau', employee_key: 'emp_7db45c63', duration_decimal: 3, date: '2026-07-10', client_name: 'Soporte' },
      ],
    })

    // El parámetro es un ALIAS, no un employees.id: se resuelve vía employee_aliases
    // y las horas matchean por employee_key.
    const res = await (TOOL_REGISTRY as any).get_employee_insights({ employee_id: 'Bau', month: '2026-07' }, c)
    expect(res.resolved_employee_id).toBe('emp_7db45c63')
    expect(res.total_hours_loaded).toBe(3)
  })

  it('identidad desconocida → 0 horas y resolved_employee_id null (comportamiento honesto)', async () => {
    const { c } = makeToolCtx({
      timeRecords: [
        { employee_id: 'monica-aieta', employee_name: 'monica.aieta', employee_key: 'emp_admin_1', duration_decimal: 4, date: '2026-07-01', client_name: 'ACME' },
      ],
    })
    const res = await (TOOL_REGISTRY as any).get_employee_insights({ employee_id: 'quien-es-este', month: '2026-07' }, c)
    expect(res.resolved_employee_id).toBeNull()
    expect(res.total_hours_loaded).toBe(0)
  })
})
