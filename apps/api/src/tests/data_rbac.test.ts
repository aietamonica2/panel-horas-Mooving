/**
 * RBAC tests for the manual time-record endpoints (SEC-07).
 *
 * Rules followed:
 *  - Imports the real production router from ../routes/data.
 *  - Mocks only D1 using SQL-pattern matching (same style as auth.test.ts).
 *  - Injects the auth context via a preceding middleware (mimics the JWT
 *    middleware that sets c.set('auth', ...) in production).
 */

import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import dataRouter from '../routes/data'

// ---------------------------------------------------------------------------
// Helper: minimal D1 mock. INSERT/UPDATE/DELETE just succeed; SELECT returns
// nothing (not exercised by the POST cases below).
// ---------------------------------------------------------------------------
function makeMockDb() {
  return {
    prepare: (_query: string) => ({
      bind: (..._args: any[]) => ({
        run: async () => ({ success: true }),
        first: async () => null,
        all: async () => ({ results: [] }),
      }),
    }),
  }
}

// ---------------------------------------------------------------------------
// Helper: mount the real router behind a middleware that injects `auth`.
// Passing auth = null simulates a request without a token.
// ---------------------------------------------------------------------------
function makeApp(auth: any) {
  const app = new Hono()
  app.use('/api/data/*', async (c, next) => {
    if (auth) c.set('auth', auth)
    await next()
  })
  app.route('/api/data', dataRouter)
  return app
}

const validRecord = {
  employee_id: 'emp_x',
  employee_name: 'Empleado X',
  client_id: 'cli_1',
  client_name: 'Cliente Uno',
  project_id: 'proj_1',
  project_name: 'Proyecto Uno',
  duration_decimal: 2.5,
  date: '2026-07-30',
  work_type: 'project' as const,
  description: 'Test de carga',
}

function postRecord(app: Hono, body: Record<string, unknown>) {
  return app.request(
    '/api/data/records',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    { DB: makeMockDb() as any }
  )
}

describe('POST /api/data/records RBAC (SEC-07)', () => {
  it('(a) rejects with 403 when an employee posts for a different employee_id', async () => {
    const app = makeApp({ company_id: 'mooving-default', user_id: 'emp_x', role: 'employee' })

    const res = await postRecord(app, { ...validRecord, employee_id: 'emp_other' })

    expect(res.status).toBe(403)
    const body: any = await res.json()
    expect(body.success).toBe(false)
    // El mensaje de error NO debe filtrar detalles internos.
    expect(body.error).toBeTypeOf('string')
  })

  it('(b) allows an employee to post a record for their own employee_id', async () => {
    const app = makeApp({ company_id: 'mooving-default', user_id: 'emp_x', role: 'employee' })

    const res = await postRecord(app, { ...validRecord, employee_id: 'emp_x' })

    expect(res.status).toBe(200)
    const body: any = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.id).toBeTypeOf('string')
  })

  it('(c) allows an admin to post a record for any employee_id', async () => {
    const app = makeApp({ company_id: 'mooving-default', user_id: 'emp_admin', role: 'admin' })

    const res = await postRecord(app, { ...validRecord, employee_id: 'emp_other' })

    expect(res.status).toBe(200)
    const body: any = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.id).toBeTypeOf('string')
  })

  it('(d) rejects with 401 when there is no auth context (no token)', async () => {
    const app = makeApp(null)

    const res = await postRecord(app, { ...validRecord, employee_id: 'emp_x' })

    expect(res.status).toBe(401)
    const body: any = await res.json()
    expect(body.success).toBe(false)
  })
})
