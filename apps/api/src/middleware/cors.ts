/**
 * CORS middleware
 * Handles cross-origin requests from frontend
 */

import { Context, Next } from 'hono'
import { HonoContext } from '../types'

export const cors = async (c: HonoContext, next: Next) => {
  const origin = c.req.header('Origin') || ''
  
  const allowedOrigins = [
    'https://panel-horas-web.pages.dev',
    'http://localhost:5173',
    'http://localhost:4173'
  ]

  // Allow localhost unconditionally for dev, but in production enforce allowedOrigins
  if (allowedOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
    c.header('Access-Control-Allow-Origin', origin)
  } else {
    // Fallback or deny - for now just set to the first allowed origin or omit
    c.header('Access-Control-Allow-Origin', allowedOrigins[0])
  }

  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (c.req.method === 'OPTIONS') {
    return c.text('', 204)
  }
  
  await next()
}
