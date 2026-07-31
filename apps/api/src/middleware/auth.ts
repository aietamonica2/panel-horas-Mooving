/**
 * Authentication middleware
 * Validates JWT tokens and extracts company_id
 */

import { Context, Next } from 'hono'
import { HonoContext } from '../types'

export interface AuthPayload {
  company_id: string
  user_id: string
  role: string
}

declare global {
  namespace HonoRequest {
    interface HonoContext {
      auth?: AuthPayload
    }
  }
}

export const auth = async (c: HonoContext, next: Next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  
  // Dev-only convenience: allow tokenless requests ONLY when ENVIRONMENT is
  // EXPLICITLY 'development'. Fail closed otherwise — a missing/unknown env must
  // NEVER grant admin by default (SEC-02). In production, tokenless requests fall
  // through to the 401 below. For local dev without a token, set
  // ENVIRONMENT=development in apps/api/.dev.vars.
  if (!token && c.env?.ENVIRONMENT === 'development') {
    c.set('auth', {
      company_id: 'mooving-default',
      user_id: 'default-user',
      role: 'admin',
    })
    await next()
    return
  }
  
  // Public endpoints (no auth required): login and health check
  if (c.req.path === '/api/auth/login' || c.req.path === '/api/health') {
    await next()
    return
  }

  // MCP endpoints (SEC-01): these used to be an OPEN bypass — any anonymous caller
  // could execute tools like delete_employee. We now REQUIRE a valid credential and
  // derive the tenant from it. Two accepted forms:
  //   (a) A normal user JWT in `Authorization: Bearer <jwt>` (used by the web app).
  //   (b) A Senda service API key, sent as `Authorization: Bearer <key>` OR in the
  //       `x-api-key` header, matching env SENDA_MCP_API_KEY exactly.
  // Anonymous requests are rejected with 401 (except in explicit local development).
  if (c.req.path.startsWith('/api/mcp')) {
    const sendaKey = c.env?.SENDA_MCP_API_KEY
    const apiKeyHeader = c.req.header('x-api-key')

    // (b) Service key sent via the dedicated x-api-key header.
    if (sendaKey && apiKeyHeader && apiKeyHeader === sendaKey) {
      c.set('auth', {
        company_id: 'mooving-default',
        user_id: 'senda-service',
        role: 'service',
      })
      await next()
      return
    }

    if (token) {
      // (a) Prefer a real user JWT (same verification as every other route).
      try {
        const { verify } = await import('hono/jwt')
        const decodedPayload = await verify(token, c.env.JWT_SECRET || 'mooving-dev-secret')
        c.set('auth', {
          company_id: decodedPayload.company_id as string,
          user_id: decodedPayload.user_id as string,
          role: decodedPayload.role as string,
          email: decodedPayload.email as string,
          name: decodedPayload.name as string,
        })
        await next()
        return
      } catch (err) {
        // (b) Not a valid JWT — maybe the Senda key was sent as a Bearer token.
        if (sendaKey && token === sendaKey) {
          c.set('auth', {
            company_id: 'mooving-default',
            user_id: 'senda-service',
            role: 'service',
          })
          await next()
          return
        }
      }
    }

    // Local-dev convenience: allow tokenless MCP calls ONLY when ENVIRONMENT is
    // EXPLICITLY 'development', so the local dev loop isn't blocked. Fail closed
    // otherwise — never reachable in production.
    if (c.env?.ENVIRONMENT === 'development') {
      c.set('auth', {
        company_id: 'mooving-default',
        user_id: 'senda-service',
        role: 'service',
      })
      await next()
      return
    }

    // No valid credential → reject anonymous access.
    return c.json({ success: false, error: 'No autorizado' }, 401)
  }

  if (!token) {
    return c.json({ success: false, error: 'Unauthorized' }, 401)
  }
  
  try {
    const { verify } = await import('hono/jwt')
    const decodedPayload = await verify(token, c.env.JWT_SECRET || 'mooving-dev-secret')
    
    c.set('auth', {
      company_id: decodedPayload.company_id as string,
      user_id: decodedPayload.user_id as string,
      role: decodedPayload.role as string,
      email: decodedPayload.email as string,
      name: decodedPayload.name as string
    })
    
    await next()
  } catch (err) {
    return c.json({ success: false, error: 'Token inválido o expirado' }, 401)
  }
}
