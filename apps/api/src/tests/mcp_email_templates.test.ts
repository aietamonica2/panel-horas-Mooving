import { describe, it, expect } from 'vitest'
import { TOOL_REGISTRY } from '../mcp/server'
import {
  renderTemplate,
  TEMPLATE_KEYS,
  TEMPLATE_META,
  DEFAULT_TEMPLATES,
} from '../mcp/email_templates'

//
// Tests para FEAT: mensajes estándar (email templates) editables por caso.
// Cubre:
//   - renderTemplate: substitución de variables (incl. variable ausente → '').
//   - get_email_templates: devuelve defaults (is_default:true) sin filas en DB, y
//     overrides (is_default:false) cuando hay fila guardada.
//   - set_email_template: upsert (sólo admin) y rechazo para no-admin.
//
// Usa un D1 falso (estilo mcp_metrics_rates / mcp_approval) que resuelve la query
// de email_templates por el template_key ligado y captura SQL + params.
//

function makeCtx({
  role = 'admin',
  company_id = 'tenant-A',
  templateRows = [] as Array<{ template_key: string; subject: string; body: string }>,
}: {
  role?: string
  company_id?: string
  templateRows?: Array<{ template_key: string; subject: string; body: string }>
} = {}) {
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
          if (sql.includes('FROM email_templates')) {
            // loadTemplate liga [company_id, template_key]; devolvemos la fila que matchee.
            const key = this._params[1]
            const row = templateRows.find((r) => r.template_key === key)
            return { results: row ? [{ subject: row.subject, body: row.body }] : [] }
          }
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
    get: (key: string) =>
      key === 'auth' ? { company_id, role, email: 'caller@moovingtech.com' } : undefined,
  }
  return { c, calls }
}

describe('renderTemplate — substitución de variables', () => {
  it('sustituye variables conocidas (string y número)', () => {
    const out = renderTemplate('Hola {firstName}, tenés {hours} horas en {month}', {
      firstName: 'Ana',
      hours: 64.75,
      month: 'julio',
    })
    expect(out).toBe('Hola Ana, tenés 64.75 horas en julio')
  })

  it('variable ausente → cadena vacía', () => {
    expect(renderTemplate('a{missing}b', {})).toBe('ab')
    expect(renderTemplate('Hola {firstName}{tail}', { firstName: 'Ana' })).toBe('Hola Ana')
  })

  it('es case-sensitive: {firstname} != {firstName}', () => {
    // firstName presente, firstname ausente (→ '').
    expect(renderTemplate('{firstName}|{firstname}', { firstName: 'Ana' })).toBe('Ana|')
  })

  it('reemplaza TODAS las apariciones de la misma variable', () => {
    expect(renderTemplate('{x}-{x}-{x}', { x: 'z' })).toBe('z-z-z')
  })
})

describe('get_email_templates — defaults vs overrides', () => {
  it('sin filas en DB → los TRES casos con is_default:true y textos por defecto', async () => {
    const { c } = makeCtx({ role: 'admin' })
    const res = await (TOOL_REGISTRY as any).get_email_templates({}, c)

    expect(Array.isArray(res.templates)).toBe(true)
    expect(res.templates).toHaveLength(3)

    const keys = res.templates.map((t: any) => t.template_key)
    expect(keys).toEqual(TEMPLATE_KEYS)

    for (const t of res.templates) {
      expect(t.is_default).toBe(true)
      expect(t.label).toBe(TEMPLATE_META[t.template_key].label)
      expect(t.variables).toEqual(TEMPLATE_META[t.template_key].variables)
      // El texto por defecto se devuelve SIN renderizar (con placeholders {var}) para editar.
      expect(t.subject).toBe(DEFAULT_TEMPLATES[t.template_key].subject)
      expect(t.body).toBe(DEFAULT_TEMPLATES[t.template_key].body)
    }

    // Metadatos concretos del caso reminder_hours.
    const hoursTpl = res.templates.find((t: any) => t.template_key === 'reminder_hours')
    expect(hoursTpl.label).toBe('Recordatorio mensual (con horas)')
    expect(hoursTpl.variables).toEqual(['firstName', 'hours', 'month'])
    expect(hoursTpl.subject).toContain('{month}')
  })

  it('con override en DB → ese caso is_default:false y usa el texto guardado', async () => {
    const { c } = makeCtx({
      role: 'admin',
      templateRows: [
        { template_key: 'inactivity', subject: 'Asunto propio', body: 'Cuerpo propio {firstName}' },
      ],
    })
    const res = await (TOOL_REGISTRY as any).get_email_templates({}, c)

    const inactivity = res.templates.find((t: any) => t.template_key === 'inactivity')
    expect(inactivity.is_default).toBe(false)
    expect(inactivity.subject).toBe('Asunto propio')
    expect(inactivity.body).toBe('Cuerpo propio {firstName}')

    // Los otros dos siguen siendo defaults.
    const others = res.templates.filter((t: any) => t.template_key !== 'inactivity')
    for (const t of others) expect(t.is_default).toBe(true)
  })

  it('scopea SIEMPRE por company_id del principal (no del body)', async () => {
    const { c, calls } = makeCtx({ role: 'admin', company_id: 'tenant-A' })
    await (TOOL_REGISTRY as any).get_email_templates({ company_id: 'OTRO-TENANT' }, c)

    const reads = calls.filter((k) => k.sql.includes('FROM email_templates'))
    expect(reads.length).toBe(3)
    for (const r of reads) expect(r.params[0]).toBe('tenant-A')
  })
})

describe('set_email_template — upsert sólo admin', () => {
  it('role != admin → No autorizado y sin INSERT', async () => {
    const { c, calls } = makeCtx({ role: 'employee' })
    const res = await (TOOL_REGISTRY as any).set_email_template(
      { template_key: 'reminder_hours', subject: 'S', body: 'B' },
      c
    )
    expect(res).toEqual({ success: false, error: 'No autorizado' })
    expect(calls.find((k) => k.sql.includes('INSERT INTO email_templates'))).toBeFalsy()
  })

  it('admin → upsert con ON CONFLICT y company_id del principal; devuelve is_default:false', async () => {
    const { c, calls } = makeCtx({ role: 'admin', company_id: 'tenant-A' })
    const res = await (TOOL_REGISTRY as any).set_email_template(
      { template_key: 'reminder_zero', subject: 'Nuevo asunto', body: 'Nuevo cuerpo' },
      c
    )

    expect(res).toEqual({
      success: true,
      template_key: 'reminder_zero',
      subject: 'Nuevo asunto',
      body: 'Nuevo cuerpo',
      is_default: false,
    })

    const upsert = calls.find((k) => k.sql.includes('INSERT INTO email_templates'))
    expect(upsert).toBeTruthy()
    expect(upsert!.sql).toContain('ON CONFLICT(company_id, template_key)')
    // params: [id, company_id, template_key, subject, body]
    expect(upsert!.params[1]).toBe('tenant-A')
    expect(upsert!.params[2]).toBe('reminder_zero')
    expect(upsert!.params[3]).toBe('Nuevo asunto')
    expect(upsert!.params[4]).toBe('Nuevo cuerpo')
  })

  it('admin → recorta espacios y rechaza asunto/cuerpo vacíos', async () => {
    const { c, calls } = makeCtx({ role: 'admin' })
    await expect(
      (TOOL_REGISTRY as any).set_email_template(
        { template_key: 'reminder_hours', subject: '   ', body: 'B' },
        c
      )
    ).rejects.toThrow()
    expect(calls.find((k) => k.sql.includes('INSERT INTO email_templates'))).toBeFalsy()
  })

  it('admin → template_key inválido lanza error y no escribe', async () => {
    const { c, calls } = makeCtx({ role: 'admin' })
    await expect(
      (TOOL_REGISTRY as any).set_email_template(
        { template_key: 'no_existe', subject: 'S', body: 'B' },
        c
      )
    ).rejects.toThrow()
    expect(calls.find((k) => k.sql.includes('INSERT INTO email_templates'))).toBeFalsy()
  })
})
