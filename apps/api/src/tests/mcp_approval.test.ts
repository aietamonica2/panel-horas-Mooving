import { describe, it, expect } from 'vitest'
import { TOOL_REGISTRY } from '../mcp/server'

//
// FEAT-02 — Flujo de aprobación de horas (approval workflow).
//
// Verifica que las nuevas tools de aprobación:
//   - filtran/scopan SIEMPRE por company_id del principal autenticado, y
//   - nunca aceptan un company_id proveniente del body (params).
//
// Usamos un fake D1 (estilo mcp_tenant_isolation.test.ts) que captura el SQL
// + los binds de la última query ejecutada.
//

function makeFakeContext(authCompanyId: string) {
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
          return { success: true, meta: { changes: 1 } }
        },
        async all() {
          calls.push({ sql, params: this._params })
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
    get: (key: string) => (key === 'auth' ? { company_id: authCompanyId, user_id: 'u1', role: 'admin' } : undefined),
  }
  return { c, calls }
}

describe('FEAT-02 MCP approval workflow (multi-tenant safe)', () => {
  it('(a) get_pending_time_records SELECTs status=pending scoped by the principal company_id', async () => {
    const { c, calls } = makeFakeContext('tenant-A')
    const res = await (TOOL_REGISTRY as any).get_pending_time_records({}, c)

    const last = calls[calls.length - 1]
    expect(last, 'get_pending_time_records should execute a query').toBeTruthy()
    expect(last.sql).toContain("status = 'pending'")
    expect(last.sql).toContain('company_id = ?')
    expect(last.sql).toContain('ORDER BY date DESC')
    // El company_id ligado es el del principal (primer bind).
    expect(last.params[0]).toBe('tenant-A')

    expect(res).toHaveProperty('records')
    expect(res).toHaveProperty('count')
  })

  it('(a2) get_pending_time_records honors optional employee_id/month filters, still tenant-scoped', async () => {
    const { c, calls } = makeFakeContext('tenant-A')
    await (TOOL_REGISTRY as any).get_pending_time_records({ employee_id: 'emp_1', month: '2026-07' }, c)

    const last = calls[calls.length - 1]
    expect(last.sql).toContain("status = 'pending'")
    expect(last.sql).toContain('employee_id = ?')
    // company_id del principal siempre presente y primero.
    expect(last.params[0]).toBe('tenant-A')
    expect(last.params).toContain('emp_1')
    expect(last.params).toContain('2026-07')
  })

  it('(b) approve_time_record sets status=approved with WHERE id = ? AND company_id = ?', async () => {
    const { c, calls } = makeFakeContext('tenant-A')
    await (TOOL_REGISTRY as any).approve_time_record({ id: 'rec_1' }, c)

    // N4: tras el UPDATE la tool escribe una entrada de auditoría (audit_logs),
    // así que localizamos el UPDATE por su SQL en vez de asumir que es la última query.
    const last = calls.find((k) => k.sql.includes("status = 'approved'"))!
    expect(last, 'approve_time_record should run the status UPDATE').toBeTruthy()
    expect(last.sql).toContain("status = 'approved'")
    expect(last.sql).toContain('WHERE id = ? AND company_id = ?')
    expect(last.params).toEqual(['rec_1', 'tenant-A'])
  })

  it('(c) reject_time_record sets status=rejected scoped by company_id', async () => {
    const { c, calls } = makeFakeContext('tenant-A')
    await (TOOL_REGISTRY as any).reject_time_record({ id: 'rec_2' }, c)

    // N4: idem (b) — el UPDATE ya no es necesariamente la última query.
    const last = calls.find((k) => k.sql.includes("status = 'rejected'"))!
    expect(last, 'reject_time_record should run the status UPDATE').toBeTruthy()
    expect(last.sql).toContain("status = 'rejected'")
    expect(last.sql).toContain('WHERE id = ? AND company_id = ?')
    expect(last.params).toEqual(['rec_2', 'tenant-A'])
  })

  it('(c2) reject_time_record with reason appends motivo to description, still tenant-scoped', async () => {
    const { c, calls } = makeFakeContext('tenant-A')
    await (TOOL_REGISTRY as any).reject_time_record({ id: 'rec_3', reason: 'Horas duplicadas' }, c)

    // N4: idem (b) — el UPDATE ya no es necesariamente la última query.
    const last = calls.find((k) => k.sql.includes("status = 'rejected'"))!
    expect(last, 'reject_time_record should run the status UPDATE').toBeTruthy()
    expect(last.sql).toContain("status = 'rejected'")
    expect(last.sql).toContain('description')
    expect(last.sql).toContain('company_id = ?')
    // El scope de tenant se mantiene y el motivo viaja como bind (no interpolado en SQL).
    expect(last.params).toContain('tenant-A')
    expect(last.params).toContain('rec_3')
    expect(last.params.some((p: any) => typeof p === 'string' && p.includes('Horas duplicadas'))).toBe(true)
  })

  it('(d) ninguna tool acepta company_id del body: siempre liga el del principal', async () => {
    // get_pending_time_records
    {
      const { c, calls } = makeFakeContext('tenant-A')
      await (TOOL_REGISTRY as any).get_pending_time_records({ company_id: 'otro-tenant' }, c)
      const last = calls[calls.length - 1]
      expect(last.params).toContain('tenant-A')
      expect(last.params).not.toContain('otro-tenant')
    }

    // approve_time_record (N4: el UPDATE se localiza por SQL; luego hay auditoría)
    {
      const { c, calls } = makeFakeContext('tenant-A')
      await (TOOL_REGISTRY as any).approve_time_record({ id: 'rec_1', company_id: 'otro-tenant' }, c)
      const last = calls.find((k) => k.sql.includes("status = 'approved'"))!
      expect(last.params).toEqual(['rec_1', 'tenant-A'])
      expect(last.params).not.toContain('otro-tenant')
      // Ninguna query (incl. auditoría) liga el tenant del body.
      expect(calls.every((k) => !k.params.includes('otro-tenant'))).toBe(true)
    }

    // reject_time_record (N4: idem)
    {
      const { c, calls } = makeFakeContext('tenant-A')
      await (TOOL_REGISTRY as any).reject_time_record({ id: 'rec_2', company_id: 'otro-tenant' }, c)
      const last = calls.find((k) => k.sql.includes("status = 'rejected'"))!
      expect(last.params).toEqual(['rec_2', 'tenant-A'])
      expect(last.params).not.toContain('otro-tenant')
      // Ninguna query (incl. auditoría) liga el tenant del body.
      expect(calls.every((k) => !k.params.includes('otro-tenant'))).toBe(true)
    }

    // approve_all_pending
    {
      const { c, calls } = makeFakeContext('tenant-A')
      await (TOOL_REGISTRY as any).approve_all_pending({ company_id: 'otro-tenant' }, c)
      const last = calls[calls.length - 1]
      expect(last.sql).toContain("status = 'pending'")
      expect(last.sql).toContain('company_id = ?')
      expect(last.params).toContain('tenant-A')
      expect(last.params).not.toContain('otro-tenant')
    }
  })

  it('(e) approve_all_pending scopes by company_id and optional employee_id', async () => {
    const { c, calls } = makeFakeContext('tenant-A')
    await (TOOL_REGISTRY as any).approve_all_pending({ employee_id: 'emp_9' }, c)

    const last = calls[calls.length - 1]
    expect(last.sql).toContain("status = 'approved'")
    expect(last.sql).toContain("status = 'pending'")
    expect(last.sql).toContain('company_id = ?')
    expect(last.sql).toContain('employee_id = ?')
    expect(last.params).toEqual(['tenant-A', 'emp_9'])
  })
})
