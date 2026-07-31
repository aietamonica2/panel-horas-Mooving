import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { cors } from '../middleware/cors'
import { HonoContext } from '../types'

//
// Regression tests for SEC-10: the CORS middleware must NOT reflect arbitrary
// origins.
//  - Production frontend origins (the *.pages.dev list) are always allowed.
//  - http://localhost:* is reflected ONLY when ENVIRONMENT === 'development'.
//  - Any other origin receives NO Access-Control-Allow-Origin header — there is
//    no permissive `allowedOrigins[0]` fallback.
//

const PROD_ORIGIN = 'https://panel-horas-web.pages.dev'
const LOCALHOST_ORIGIN = 'http://localhost:5173'
const EVIL_ORIGIN = 'https://evil.com'

function appWithCors() {
  const app = new Hono<HonoContext>()
  app.use('*', cors)
  app.get('/', (c) => c.text('ok'))
  return app
}

function requestWithOrigin(origin: string, env: Record<string, unknown> = {}) {
  const app = appWithCors()
  return app.request('/', { headers: { Origin: origin } }, env as any)
}

describe('cors middleware — hardened origin allow-list (SEC-10)', () => {
  it('(a) reflects an allowed production origin', async () => {
    const res = await requestWithOrigin(PROD_ORIGIN, { ENVIRONMENT: 'production' })
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(PROD_ORIGIN)
  })

  it('(b) allows http://localhost:5173 when ENVIRONMENT=development', async () => {
    const res = await requestWithOrigin(LOCALHOST_ORIGIN, { ENVIRONMENT: 'development' })
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(LOCALHOST_ORIGIN)
  })

  it('(c) does NOT allow http://localhost:5173 in production', async () => {
    const res = await requestWithOrigin(LOCALHOST_ORIGIN, { ENVIRONMENT: 'production' })
    const acao = res.headers.get('Access-Control-Allow-Origin')
    expect(acao).not.toBe(LOCALHOST_ORIGIN)
    // No permissive fallback either — the header must be absent.
    expect(acao).toBeNull()
  })

  it('(d) does NOT reflect an unknown/evil origin (no fallback)', async () => {
    const res = await requestWithOrigin(EVIL_ORIGIN, { ENVIRONMENT: 'production' })
    const acao = res.headers.get('Access-Control-Allow-Origin')
    expect(acao).not.toBe(EVIL_ORIGIN)
    expect(acao).toBeNull()
  })

  it('(d2) does not fall back to the first allowed origin even in development', async () => {
    const res = await requestWithOrigin(EVIL_ORIGIN, { ENVIRONMENT: 'development' })
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  it('never pairs the reflected origin with wildcard credentials', async () => {
    const res = await requestWithOrigin(PROD_ORIGIN, { ENVIRONMENT: 'production' })
    // Specific origin reflected (never `*`) and no ACAC:true wildcard combo.
    expect(res.headers.get('Access-Control-Allow-Origin')).not.toBe('*')
    expect(res.headers.get('Access-Control-Allow-Credentials')).toBeNull()
  })
})
