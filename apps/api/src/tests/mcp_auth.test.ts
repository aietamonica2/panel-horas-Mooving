import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { auth } from '../middleware/auth'
import { HonoContext } from '../types'

//
// SEC-01: the /api/mcp endpoints must NOT be an open bypass. Previously any
// anonymous caller could execute tools like delete_employee. The auth middleware
// must now reject anonymous callers and accept EITHER a valid user JWT (the web
// frontend) OR the Senda service API key (Authorization: Bearer <key> OR
// x-api-key: <key>). The tenant must be derived from the credential.
//

const SENDA_KEY = 'senda-secret-key-xyz'
const JWT_SECRET = 'test-secret'

// Env passed to app.request(): production so the dev tokenless convenience never
// masks a genuine 401, plus the service key and the JWT secret the middleware
// verifies against.
const ENV = {
  ENVIRONMENT: 'production',
  SENDA_MCP_API_KEY: SENDA_KEY,
  JWT_SECRET,
} as any

function mcpApp() {
  const app = new Hono<HonoContext>()
  app.use('/api/*', auth)
  // Minimal stand-in for the real MCP router — echoes back the authed principal so
  // we can assert both that the request passed AND which tenant/role was derived.
  app.get('/api/mcp/u/:id/tools', (c) => {
    const a = c.get('auth')
    return c.json({ ok: true, company_id: a?.company_id ?? null, role: a?.role ?? null })
  })
  return app
}

describe('MCP auth middleware (SEC-01)', () => {
  it('(a) rejects anonymous callers with 401 in production', async () => {
    const app = mcpApp()
    const res = await app.request('/api/mcp/u/x/tools', {}, ENV)
    expect(res.status).toBe(401)
    const body: any = await res.json()
    expect(body.success).toBe(false)
  })

  it('(b) accepts a valid user JWT and derives the tenant from the token', async () => {
    const app = mcpApp()
    const token = await sign(
      { company_id: 'acme-co', user_id: 'u42', role: 'admin' },
      JWT_SECRET,
    )
    const res = await app.request(
      '/api/mcp/u/x/tools',
      { headers: { Authorization: `Bearer ${token}` } },
      ENV,
    )
    expect(res.status).toBe(200)
    const body: any = await res.json()
    expect(body.ok).toBe(true)
    // Tenant comes from the JWT, not from the URL (:id === 'x').
    expect(body.company_id).toBe('acme-co')
    expect(body.role).toBe('admin')
  })

  it('(c) accepts the Senda service key via x-api-key and sets the service principal', async () => {
    const app = mcpApp()
    const res = await app.request(
      '/api/mcp/u/x/tools',
      { headers: { 'x-api-key': SENDA_KEY } },
      ENV,
    )
    expect(res.status).toBe(200)
    const body: any = await res.json()
    expect(body.ok).toBe(true)
    expect(body.role).toBe('service')
    expect(body.company_id).toBe('mooving-default')
  })

  it('(c2) also accepts the Senda service key sent as a Bearer token', async () => {
    const app = mcpApp()
    const res = await app.request(
      '/api/mcp/u/x/tools',
      { headers: { Authorization: `Bearer ${SENDA_KEY}` } },
      ENV,
    )
    expect(res.status).toBe(200)
    const body: any = await res.json()
    expect(body.role).toBe('service')
  })

  it('(d) rejects an invalid Bearer credential with 401', async () => {
    const app = mcpApp()
    const res = await app.request(
      '/api/mcp/u/x/tools',
      { headers: { Authorization: 'Bearer not-a-valid-token' } },
      ENV,
    )
    expect(res.status).toBe(401)
    const body: any = await res.json()
    expect(body.success).toBe(false)
  })

  it('(d2) rejects a wrong x-api-key with 401', async () => {
    const app = mcpApp()
    const res = await app.request(
      '/api/mcp/u/x/tools',
      { headers: { 'x-api-key': 'wrong-key' } },
      ENV,
    )
    expect(res.status).toBe(401)
  })
})
