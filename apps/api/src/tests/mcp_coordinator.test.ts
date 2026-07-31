import { describe, it, expect } from 'vitest'
import { TOOL_REGISTRY } from '../mcp/server'

//
// FEAT-01 — Visibilidad por cartera para Coordinadores.
//
// Un Coordinador sólo debe ver los clientes de SU cartera (mapeada en la tabla
// coordinator_assignments: company_id, coordinator_email, client_id). Un admin no
// tiene restricción (ve todo). Verificamos que:
//   (a) get_my_scope de un coordinator devuelve sus client_ids,
//   (b) admin → is_coordinator false y client_ids refleja "ve todo" (vacío = sin
//       restricción) sin siquiera consultar coordinator_assignments,
//   (c) get_pending_time_records de un coordinator agrega `client_id IN (...)` con
//       su cartera y liga SIEMPRE el company_id del principal,
//   (d) admin NO agrega el filtro de client_id (sigue viendo todo).
//
// Usamos un fake D1 (estilo mcp_tenant_isolation.test.ts) que captura el SQL + los
// binds de cada query, y que devuelve filas de coordinator_assignments según el
// coordinator_email ligado.
//

type Auth = { company_id: string; email?: string; role: string }

function makeFakeContext(auth: Auth, portfolio: Record<string, string[]> = {}) {
  const calls: Array<{ sql: string; params: any[] }> = []
  const db = {
    prepare(sql: string) {
      const stmt = {
        _params: [] as any[],
        bind(...params: any[]) {
          this._params = params
          return this
        },
        async run() {
          calls.push({ sql, params: this._params })
          return { success: true, meta: { changes: 0 } }
        },
        async all() {
          calls.push({ sql, params: this._params })
          // La consulta de scope liga (company_id, coordinator_email). Devolvemos las
          // filas de la cartera del email pedido como { client_id }.
          if (/coordinator_assignments/i.test(sql)) {
            const email = this._params[1]
            const ids = portfolio[email] || []
            return { results: ids.map((client_id) => ({ client_id })) }
          }
          return { results: [] }
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
    get: (key: string) => (key === 'auth' ? auth : undefined),
  }
  return { c, calls }
}

describe('FEAT-01 coordinator scope (visibilidad por cartera)', () => {
  it('(a) get_my_scope de un coordinator devuelve sus client_ids y is_coordinator=true', async () => {
    const { c, calls } = makeFakeContext(
      { company_id: 'tenant-A', email: 'coord@moovingtech.com', role: 'coordinator' },
      { 'coord@moovingtech.com': ['cli_1', 'cli_2'] }
    )

    const res: any = await (TOOL_REGISTRY as any).get_my_scope({}, c)

    expect(res.role).toBe('coordinator')
    expect(res.is_coordinator).toBe(true)
    expect(res.client_ids).toEqual(['cli_1', 'cli_2'])

    // La cartera se resolvió consultando coordinator_assignments ligando el tenant + email del principal.
    const scopeQuery = calls.find((q) => /coordinator_assignments/i.test(q.sql))!
    expect(scopeQuery, 'debe consultar coordinator_assignments').toBeTruthy()
    expect(scopeQuery.sql).toContain('company_id = ?')
    expect(scopeQuery.sql).toContain('coordinator_email = ?')
    expect(scopeQuery.params).toEqual(['tenant-A', 'coord@moovingtech.com'])
  })

  it('(b) get_my_scope de un admin: is_coordinator=false, client_ids=[] (ve todo) y NO consulta coordinator_assignments', async () => {
    const { c, calls } = makeFakeContext({ company_id: 'tenant-A', email: 'boss@moovingtech.com', role: 'admin' })

    const res: any = await (TOOL_REGISTRY as any).get_my_scope({}, c)

    expect(res.role).toBe('admin')
    expect(res.is_coordinator).toBe(false)
    // Admin sin restricción de cartera: [] = "ve todo".
    expect(res.client_ids).toEqual([])
    // No debe leer coordinator_assignments para un admin (short-circuit).
    expect(calls.some((q) => /coordinator_assignments/i.test(q.sql))).toBe(false)
  })

  it('(c) get_pending_time_records de un coordinator agrega client_id IN (cartera) y liga company_id del principal', async () => {
    const { c, calls } = makeFakeContext(
      { company_id: 'tenant-A', email: 'coord@moovingtech.com', role: 'coordinator' },
      { 'coord@moovingtech.com': ['cli_1', 'cli_2'] }
    )

    await (TOOL_REGISTRY as any).get_pending_time_records({}, c)

    const pending = calls.find(
      (q) => /FROM time_records/i.test(q.sql) && /status = 'pending'/i.test(q.sql)
    )!
    expect(pending, 'debe ejecutar el SELECT de pendientes').toBeTruthy()
    // Scope de cartera aplicado con placeholders (uno por client_id).
    expect(pending.sql).toContain('client_id IN (?, ?)')
    // company_id del principal siempre presente y primero.
    expect(pending.params[0]).toBe('tenant-A')
    // Los client_ids de la cartera viajan como binds (no interpolados en el SQL).
    expect(pending.params).toContain('cli_1')
    expect(pending.params).toContain('cli_2')
  })

  it('(d) get_pending_time_records de un admin NO agrega el filtro de client_id (ve todo), pero sigue ligando company_id', async () => {
    const { c, calls } = makeFakeContext({ company_id: 'tenant-A', email: 'boss@moovingtech.com', role: 'admin' })

    await (TOOL_REGISTRY as any).get_pending_time_records({}, c)

    const pending = calls.find(
      (q) => /FROM time_records/i.test(q.sql) && /status = 'pending'/i.test(q.sql)
    )!
    expect(pending, 'debe ejecutar el SELECT de pendientes').toBeTruthy()
    expect(pending.sql).not.toContain('client_id IN')
    expect(pending.params[0]).toBe('tenant-A')
    // Un admin no genera ninguna consulta a coordinator_assignments.
    expect(calls.some((q) => /coordinator_assignments/i.test(q.sql))).toBe(false)
  })
})
