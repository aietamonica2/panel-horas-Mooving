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

  // Allow MCP endpoints to bypass JWT check (Senda AI uses API keys, not JWTs)
  if (c.req.path.startsWith('/api/mcp')) {
    await next()
    return
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
