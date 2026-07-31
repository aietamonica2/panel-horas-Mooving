import { describe, it, expect } from 'vitest'
import { TOOL_REGISTRY } from '../mcp/server'

//
// Regression tests for two P0 bugs in the external-user linking MCP tools.
//
// 1) link_external_user previously reassigned time_records with a substring
//    `LOWER(employee_id) LIKE %alias%`, so a short/common alias could MASS-REASSIGN
//    records of unrelated employees. It also did INSERT OR REPLACE with a random PK,
//    which never deduped the alias by (company_id, alias).
// 2) get_unlinked_external_users joined employees WITHOUT a tenant filter, so a
//    homonym in another company_id could distort the "unlinked" result.
//
// We use a fake D1 that captures the SQL + bound params of every executed query.
// first() returns an employee for the employees lookup so link_external_user
// reaches the UPDATE (the reference fake returns null, which would short-circuit).
//

function makeFakeContext(
  authCompanyId: string,
  employee: any = { id: 'emp_1', name: 'Juan Perez', email: 'juan@example.com' },
) {
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
          return { results: [] }
        },
        async first() {
          calls.push({ sql, params: this._params })
          // Resolve the employees lookup so link_external_user proceeds to the UPDATE.
          return /FROM\s+employees/i.test(sql) ? employee : null
        },
      }
      return stmt
    },
  }
  const c: any = {
    env: { DB: db },
    get: (key: string) =>
      key === 'auth' ? { company_id: authCompanyId, user_id: 'u1', role: 'admin' } : undefined,
  }
  return { c, calls }
}

describe('MCP external-user linking (P0 mass-reassign + tenant scope)', () => {
  it('link_external_user matches time_records by EXACT equality (no LIKE) scoped by company_id', async () => {
    const { c, calls } = makeFakeContext('tenant-A')
    await (TOOL_REGISTRY as any).link_external_user(
      { alias_identifier: 'Ana', target_employee_id: 'emp_1' },
      c,
    )

    const update = calls.find((q) => /UPDATE\s+time_records/i.test(q.sql))
    expect(update, 'link_external_user must run an UPDATE on time_records').toBeTruthy()

    // Exact-equality match — never a substring LIKE that could mass-reassign unrelated rows.
    expect(update!.sql).toContain('= ?')
    expect(update!.sql).not.toMatch(/LIKE/i)

    // Tenant scoping preserved and the authenticated company_id is bound.
    expect(update!.sql).toContain('company_id = ?')
    expect(update!.params).toContain('tenant-A')

    // The bound match value is the lowercased alias, not a %wildcard%.
    expect(update!.params).toContain('ana')
    expect(update!.params.some((p: any) => typeof p === 'string' && p.includes('%'))).toBe(false)
  })

  it('link_external_user dedupes the alias by (company_id, alias) rather than blind INSERT OR REPLACE', async () => {
    const { c, calls } = makeFakeContext('tenant-A')
    await (TOOL_REGISTRY as any).link_external_user(
      { alias_identifier: 'ana@example.com', target_employee_id: 'emp_1' },
      c,
    )

    const del = calls.find((q) => /DELETE\s+FROM\s+employee_aliases/i.test(q.sql))
    expect(del, 'must delete any prior alias for (company_id, alias) before inserting').toBeTruthy()
    expect(del!.sql).toContain('company_id = ?')
    expect(del!.params).toContain('tenant-A')

    const ins = calls.find((q) => /INSERT\s+INTO\s+employee_aliases/i.test(q.sql))
    expect(ins, 'must insert the deduped alias row').toBeTruthy()
    expect(ins!.params).toContain('tenant-A')

    // The old blind INSERT OR REPLACE (which never deduped because the PK is a random id) is gone.
    expect(
      calls.some((q) => /INSERT\s+OR\s+REPLACE\s+INTO\s+employee_aliases/i.test(q.sql)),
    ).toBe(false)
  })

  it('get_unlinked_external_users scopes the employees JOIN to the same tenant', async () => {
    const { c, calls } = makeFakeContext('tenant-A')
    await (TOOL_REGISTRY as any).get_unlinked_external_users({}, c)

    const joinQuery = calls.find((q) => /LEFT\s+JOIN\s+employees/i.test(q.sql))
    expect(joinQuery, 'must query time_records with a LEFT JOIN on employees').toBeTruthy()

    // The JOIN condition itself must be tenant-scoped so a homonym in another company_id
    // cannot make a genuinely-unlinked user look linked (or vice versa).
    expect(joinQuery!.sql).toMatch(/e\.company_id\s*=\s*tr\.company_id/)
  })
})
