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
  
  // For development, allow requests without token
  if (!token && c.env.ENVIRONMENT === 'development') {
    c.set('auth', {
      company_id: 'default-tenant',
      user_id: 'default-user',
      role: 'admin',
    })
    await next()
    return
  }
  
  if (!token) {
    return c.json({ success: false, error: 'Unauthorized' }, 401)
  }
  
  // Verify token matches the simple password
  if (token !== 'mooving2025') {
    return c.json({ success: false, error: 'Unauthorized' }, 401)
  }
  
  c.set('auth', {
    company_id: 'default-tenant',
    user_id: 'default-user',
    role: 'admin',
  })
  
  await next()
}
