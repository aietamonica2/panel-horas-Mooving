import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { auth } from '../middleware/auth'
import { HonoContext } from '../types'

//
// Regression tests for SEC-02: the auth middleware must FAIL CLOSED.
// A request without a token must only receive the dev auth context when
// ENVIRONMENT is EXPLICITLY 'development'. In production (or when the env is
// missing/unknown) a tokenless request to a protected route must be 401 —
// it must never be silently upgraded to an admin context.
//

function appWithProtectedRoute() {
  const app = new Hono<HonoContext>()
  app.use('/api/*', auth)
  app.get('/api/protected', (c) => {
    const a = c.get('auth')
    return c.json({ role: a?.role ?? null, user_id: a?.user_id ?? null })
  })
  return app
}

describe('auth middleware — fail closed (SEC-02)', () => {
  it('returns 401 for a tokenless request in production', async () => {
    const app = appWithProtectedRoute()
    const res = await app.request('/api/protected', {}, { ENVIRONMENT: 'production' } as any)
    expect(res.status).toBe(401)
  })

  it('returns 401 for a tokenless request when ENVIRONMENT is missing/unknown', async () => {
    const app = appWithProtectedRoute()
    const res = await app.request('/api/protected', {}, {} as any)
    expect(res.status).toBe(401)
  })

  it('does NOT grant admin when env is entirely absent', async () => {
    const app = appWithProtectedRoute()
    // Previously `!c.env` granted admin — that clause was removed.
    const res = await app.request('/api/protected', {}, undefined as any)
    expect(res.status).toBe(401)
  })

  it('still allows the tokenless dev convenience ONLY in explicit development', async () => {
    const app = appWithProtectedRoute()
    const res = await app.request('/api/protected', {}, { ENVIRONMENT: 'development' } as any)
    expect(res.status).toBe(200)
    const body: any = await res.json()
    expect(body.role).toBe('admin')
  })
})
