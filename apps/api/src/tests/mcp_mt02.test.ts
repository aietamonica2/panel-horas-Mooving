import { describe, it, expect } from 'vitest'
import { TOOL_REGISTRY } from '../mcp/server'

//
// MT-02: the tenant must ALWAYS come from the authenticated principal,
// never from the request body. A caller from tenant-A must not be able to
// read/write/scope another tenant's data by passing `company_id` in params.
//
// Reuses the fake-D1 context pattern from mcp_tenant_isolation.test.ts:
// it captures the SQL + bound params of every executed query.
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

const ATTACKER = 'tenant-B-attacker'

describe('MT-02: tenant is derived from the principal, not from the body', () => {
  it('get_clients (read) ignores params.company_id and binds the authenticated tenant', async () => {
    const { c, calls } = makeFakeContext('tenant-A')
    await (TOOL_REGISTRY as any).get_clients({ company_id: ATTACKER }, c)
    const last = calls[calls.length - 1]
    expect(last.sql).toContain('company_id = ?')
    expect(last.params).toContain('tenant-A')
    expect(last.params).not.toContain(ATTACKER)
  })

  it('create_client (write) persists the authenticated tenant, not params.company_id', async () => {
    const { c, calls } = makeFakeContext('tenant-A')
    await (TOOL_REGISTRY as any).create_client({ company_id: ATTACKER, name: 'Acme' }, c)
    const insert = calls[calls.length - 1]
    expect(insert.sql).toMatch(/INSERT INTO clients/)
    expect(insert.params).toContain('tenant-A')
    expect(insert.params).not.toContain(ATTACKER)
  })

  it('get_time_records (read that previously took company_id straight from the body) is now principal-scoped', async () => {
    const { c, calls } = makeFakeContext('tenant-A')
    await (TOOL_REGISTRY as any).get_time_records({ company_id: ATTACKER }, c)
    const last = calls[calls.length - 1]
    expect(last.params[0]).toBe('tenant-A')
    expect(last.params).not.toContain(ATTACKER)
  })

  it('delete_employee binds the authenticated tenant in the WHERE clause and ignores the body', async () => {
    const { c, calls } = makeFakeContext('tenant-A')
    await (TOOL_REGISTRY as any).delete_employee({ id: 'emp_x', company_id: ATTACKER }, c)
    const last = calls[calls.length - 1]
    expect(last.sql).toMatch(/DELETE FROM employees WHERE id = \? AND company_id = \?/)
    expect(last.params).toEqual(['emp_x', 'tenant-A'])
  })
})

describe('send_inactivity_alerts computes real inactivity (no invented counts)', () => {
  it('queries real data, is principal-scoped, and reports an honest zero when there are no employees', async () => {
    const { c, calls } = makeFakeContext('tenant-A')
    const res: any = await (TOOL_REGISTRY as any).send_inactivity_alerts({ company_id: ATTACKER, days: 5 }, c)

    // It must actually look at employees + time_records (not return a hardcoded stub).
    expect(calls.some((k) => /FROM employees/.test(k.sql))).toBe(true)
    expect(calls.some((k) => /FROM time_records/.test(k.sql))).toBe(true)

    // Principal-scoped: the employees query binds the authenticated tenant, not the body.
    const empQuery = calls.find((k) => /FROM employees/.test(k.sql))!
    expect(empQuery.params).toContain('tenant-A')
    expect(empQuery.params).not.toContain(ATTACKER)

    // Honest, real result: nobody inactive -> nothing sent. Never the old fake "3".
    expect(res.inactive_count).toBe(0)
    expect(res.alerts_sent).toBe(0)
    expect(res.alerts_sent).not.toBe(3)
    expect(res.sent).toBe(false)
    expect(res.days_threshold).toBe(5)
    expect(Array.isArray(res.inactive_employees)).toBe(true)
  })
})
