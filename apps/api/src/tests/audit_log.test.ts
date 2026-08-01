import { describe, it, expect } from 'vitest'
import { TOOL_REGISTRY } from '../mcp/server'
import { logAudit, actorFromAuth } from '../lib/audit'

//
// Tests para N4 — Audit log ("quién cambió qué y cuándo").
// Cubre:
//   - logAudit: escribe una fila en audit_logs con los campos correctos y
//     NUNCA lanza (best-effort: un fallo de DB no rompe el flujo principal).
//   - get_audit_log: admin OK (tenant-scoped, ORDER BY created_at DESC,
//     limit default 100 / máx 500, filtros entity/action) y rechazo no-admin.
//   - integración: create_time_record / approve_time_record escriben auditoría.
//
// Usa un D1 falso (mismo patrón que mcp_email_templates.test.ts) que captura
// SQL + params y resuelve resultados por patrón de SQL.
//

function makeDb({
  auditRows = [] as any[],
  failOnRun = false,
}: { auditRows?: any[]; failOnRun?: boolean } = {}) {
  const calls: Array<{ sql: string; params: any[] }> = []

  const db: any = {
    prepare(sql: string) {
      const stmt: any = {
        _params: [] as any[],
        bind(...params: any[]) {
          this._params = params
          return this
        },
        async all() {
          calls.push({ sql, params: this._params })
          if (sql.includes('FROM audit_logs')) return { results: auditRows }
          return { results: [] }
        },
        async run() {
          calls.push({ sql, params: this._params })
          if (failOnRun) throw new Error('D1 boom')
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
  return { db, calls }
}

function makeCtx({
  role = 'admin',
  company_id = 'tenant-A',
  auditRows = [] as any[],
}: { role?: string; company_id?: string; auditRows?: any[] } = {}) {
  const { db, calls } = makeDb({ auditRows })
  const c: any = {
    env: { DB: db },
    get: (key: string) =>
      key === 'auth'
        ? { company_id, role, user_id: 'u1', name: 'Ana Admin', email: 'ana@moovingtech.com' }
        : undefined,
  }
  return { c, calls }
}

describe('logAudit — escribe fila y nunca rompe el flujo', () => {
  it('inserta en audit_logs con company_id, actor, action, entity y summary', async () => {
    const { db, calls } = makeDb()

    await logAudit(db, {
      company_id: 'tenant-A',
      actor_id: 'u1',
      actor_name: 'Ana Admin',
      actor_role: 'admin',
      action: 'update',
      entity: 'time_record',
      entity_id: 'rec_9',
      summary: 'Editó registro 5.5h de Bautista Barrio (2026-07-15)',
    })

    const insert = calls.find((k) => k.sql.includes('INSERT INTO audit_logs'))
    expect(insert, 'logAudit debe ejecutar el INSERT en audit_logs').toBeTruthy()
    // bind order: id, company_id, actor_id, actor_name, actor_role, action, entity, entity_id, summary
    expect(insert!.params[0]).toBeTypeOf('string') // id generado (uuid)
    expect(insert!.params.slice(1)).toEqual([
      'tenant-A',
      'u1',
      'Ana Admin',
      'admin',
      'update',
      'time_record',
      'rec_9',
      'Editó registro 5.5h de Bautista Barrio (2026-07-15)',
    ])
    // created_at NO se liga: lo completa la DB (DEFAULT datetime('now')).
    expect(insert!.sql).not.toContain('created_at')
  })

  it('campos opcionales ausentes → NULL (no undefined)', async () => {
    const { db, calls } = makeDb()
    await logAudit(db, { company_id: 'tenant-A', action: 'create', entity: 'time_record' })

    const insert = calls.find((k) => k.sql.includes('INSERT INTO audit_logs'))!
    // actor_id, actor_name, actor_role, entity_id, summary → null
    expect(insert.params[2]).toBeNull()
    expect(insert.params[3]).toBeNull()
    expect(insert.params[4]).toBeNull()
    expect(insert.params[7]).toBeNull()
    expect(insert.params[8]).toBeNull()
  })

  it('NUNCA lanza aunque la DB falle (try/catch silencioso)', async () => {
    const { db } = makeDb({ failOnRun: true })
    await expect(
      logAudit(db, { company_id: 'tenant-A', action: 'delete', entity: 'time_record' })
    ).resolves.toBeUndefined()
  })

  it('actorFromAuth deriva actor del payload de auth (name > email > user_id)', () => {
    expect(actorFromAuth({ user_id: 'u1', name: 'Ana', email: 'a@x.com', role: 'admin' }))
      .toEqual({ actor_id: 'u1', actor_name: 'Ana', actor_role: 'admin' })
    expect(actorFromAuth({ user_id: 'u1', email: 'a@x.com', role: 'employee' }))
      .toEqual({ actor_id: 'u1', actor_name: 'a@x.com', actor_role: 'employee' })
    expect(actorFromAuth(undefined)).toEqual({ actor_id: null, actor_name: null, actor_role: null })
  })
})

describe('get_audit_log — sólo admin, tenant-scoped, orden DESC', () => {
  it('role != admin → No autorizado y sin SELECT a audit_logs', async () => {
    const { c, calls } = makeCtx({ role: 'employee' })
    const res = await (TOOL_REGISTRY as any).get_audit_log({}, c)

    expect(res).toEqual({ success: false, error: 'No autorizado' })
    expect(calls.find((k) => k.sql.includes('FROM audit_logs'))).toBeFalsy()
  })

  it('admin → devuelve { entries } ordenado por created_at DESC, scopeado al principal', async () => {
    const rows = [
      { id: 'a2', company_id: 'tenant-A', action: 'delete', entity: 'time_record', summary: 'Eliminó registro', created_at: '2026-08-01 12:00:00' },
      { id: 'a1', company_id: 'tenant-A', action: 'create', entity: 'time_record', summary: 'Creó registro', created_at: '2026-07-31 10:00:00' },
    ]
    const { c, calls } = makeCtx({ role: 'admin', company_id: 'tenant-A', auditRows: rows })
    const res = await (TOOL_REGISTRY as any).get_audit_log({ company_id: 'OTRO-TENANT' }, c)

    expect(res.entries).toEqual(rows)

    const select = calls.find((k) => k.sql.includes('FROM audit_logs'))!
    expect(select.sql).toContain('ORDER BY created_at DESC')
    // Tenant SIEMPRE del principal (nunca del body) — MT-02.
    expect(select.params[0]).toBe('tenant-A')
    expect(select.params).not.toContain('OTRO-TENANT')
    // limit default = 100 (último bind).
    expect(select.params[select.params.length - 1]).toBe(100)
  })

  it('limit se sanea: inválido → 100, mayor a 500 → 500', async () => {
    {
      const { c, calls } = makeCtx({ role: 'admin' })
      await (TOOL_REGISTRY as any).get_audit_log({ limit: 'no-numero' }, c)
      const select = calls.find((k) => k.sql.includes('FROM audit_logs'))!
      expect(select.params[select.params.length - 1]).toBe(100)
    }
    {
      const { c, calls } = makeCtx({ role: 'admin' })
      await (TOOL_REGISTRY as any).get_audit_log({ limit: 99999 }, c)
      const select = calls.find((k) => k.sql.includes('FROM audit_logs'))!
      expect(select.params[select.params.length - 1]).toBe(500)
    }
  })

  it('filtros opcionales entity/action se agregan al WHERE como binds', async () => {
    const { c, calls } = makeCtx({ role: 'admin' })
    await (TOOL_REGISTRY as any).get_audit_log({ entity: 'time_record', action: 'delete', limit: 10 }, c)

    const select = calls.find((k) => k.sql.includes('FROM audit_logs'))!
    expect(select.sql).toContain('entity = ?')
    expect(select.sql).toContain('action = ?')
    expect(select.params).toEqual(['tenant-A', 'time_record', 'delete', 10])
  })
})

describe('integración — las tools de escritura dejan rastro de auditoría', () => {
  it('create_time_record escribe una entrada create/time_record con el actor', async () => {
    const { c, calls } = makeCtx({ role: 'admin', company_id: 'tenant-A' })
    await (TOOL_REGISTRY as any).create_time_record(
      {
        employee_id: 'emp_1',
        employee_name: 'Bautista Barrio',
        client_id: 'cli_1',
        project_id: 'proj_1',
        duration_decimal: 5.5,
        date: '2026-07-15',
        work_type: 'project',
      },
      c
    )

    const audit = calls.find((k) => k.sql.includes('INSERT INTO audit_logs'))
    expect(audit, 'create_time_record debe auditar').toBeTruthy()
    // [id, company_id, actor_id, actor_name, actor_role, action, entity, entity_id, summary]
    expect(audit!.params[1]).toBe('tenant-A')
    expect(audit!.params[3]).toBe('Ana Admin')
    expect(audit!.params[5]).toBe('create')
    expect(audit!.params[6]).toBe('time_record')
    expect(audit!.params[8]).toBe('Creó registro 5.5h de Bautista Barrio (2026-07-15)')
  })

  it('approve_time_record escribe una entrada update/time_record y no rompe si el registro no está', async () => {
    const { c, calls } = makeCtx({ role: 'admin', company_id: 'tenant-A' })
    const res = await (TOOL_REGISTRY as any).approve_time_record({ id: 'rec_7' }, c)

    expect(res).toEqual({ success: true })
    const audit = calls.find((k) => k.sql.includes('INSERT INTO audit_logs'))!
    expect(audit.params[1]).toBe('tenant-A')
    expect(audit.params[5]).toBe('update')
    expect(audit.params[6]).toBe('time_record')
    expect(audit.params[7]).toBe('rec_7')
    // El stub no devuelve el registro (first() → null) → summary con fallback al id.
    expect(audit.params[8]).toBe('Aprobó registro rec_7')
  })
})
