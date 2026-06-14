import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { sign } from 'hono/jwt'
import { HonoContext } from '../types'

const authRouter = new Hono<HonoContext>()

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})

authRouter.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json')
  
  // Here we would normally hash the provided password and compare with DB
  // For this MVP, we query the DB to find the user by email
  const db = c.env.DB
  
  const user = await db.prepare(
    'SELECT id, name, email, password_hash, role_id, company_id FROM employees WHERE email = ?'
  ).bind(email).first()

  if (!user) {
    return c.json({ success: false, error: 'Credenciales inválidas' }, 401)
  }

  // Validate hash (in MVP we allow 'Mooving2026!' or 'moovingadm' to match dummy hashes)
  const isValid = 
    password === 'Mooving2026!' || 
    password === 'moovingadm' || 
    password === user.password_hash
  
  if (!isValid) {
    return c.json({ success: false, error: 'Credenciales inválidas' }, 401)
  }

  // Generate JWT
  const payload = {
    company_id: user.company_id,
    user_id: user.id,
    role: user.role_id,
    email: user.email,
    name: user.name,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 // 24 hours
  }

  const token = await sign(payload, c.env.JWT_SECRET || 'mooving-dev-secret')

  return c.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role_id
      }
    }
  })
})

authRouter.get('/me', async (c) => {
  // Requires auth middleware which sets c.get('auth')
  const authPayload = c.get('auth')
  if (!authPayload) {
    return c.json({ success: false, error: 'No autorizado' }, 401)
  }
  
  // Return current user and their permissions
  const db = c.env.DB
  const { results: permissions } = await db.prepare(
    'SELECT permission_key FROM role_permissions WHERE role_id = ? AND is_allowed = 1'
  ).bind(authPayload.role).all()

  return c.json({
    success: true,
    data: {
      user: authPayload,
      permissions: permissions.map(p => p.permission_key)
    }
  })
})

export default authRouter
