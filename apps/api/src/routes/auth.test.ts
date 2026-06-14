import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import authRouter from './auth'
import { verify } from 'hono/jwt'
import { HonoContext } from '../types'

describe('Auth Router', () => {
  it('should authenticate valid user and return JWT', async () => {
    const app = new Hono<HonoContext>()
    app.route('/auth', authRouter)
    
    // Mock D1 DB using SQL pattern matching per AGENTS.md rules
    const mockDb = {
      prepare: (query: string) => {
        return {
          bind: (...args: any[]) => ({
            first: async () => {
              if (query.includes('FROM employees WHERE email = ?') && args[0] === 'monica@mooving.ai') {
                return {
                  id: 'emp_admin_2',
                  name: 'Mónica',
                  email: 'monica@mooving.ai',
                  password_hash: 'moovingadm-hash',
                  role_id: 'admin',
                  company_id: 'mooving-default'
                }
              }
              return null
            }
          })
        }
      }
    }

    const res = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'monica@mooving.ai', password: 'moovingadm' })
    }, { DB: mockDb as any, JWT_SECRET: 'test-secret' })

    expect(res.status).toBe(200)
    const data: any = await res.json()
    expect(data.success).toBe(true)
    expect(data.data.token).toBeTypeOf('string')
    
    // Validate token
    const payload = await verify(data.data.token, 'test-secret')
    expect(payload.email).toBe('monica@mooving.ai')
    expect(payload.role).toBe('admin')
  })

  it('should reject invalid credentials', async () => {
    const app = new Hono<HonoContext>()
    app.route('/auth', authRouter)
    
    const mockDb = {
      prepare: () => ({
        bind: () => ({
          first: async () => null
        })
      })
    }

    const res = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nobody@mooving.ai', password: 'wrong' })
    }, { DB: mockDb as any, JWT_SECRET: 'test-secret' })

    expect(res.status).toBe(401)
    const data: any = await res.json()
    expect(data.success).toBe(false)
    expect(data.error).toBeTypeOf('string')
  })
})
