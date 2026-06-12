/**
 * CORS middleware
 * Handles cross-origin requests from frontend
 */

import { Context, Next } from 'hono'
import { HonoContext } from '../types'

export const cors = async (c: HonoContext, next: Next) => {
  c.header('Access-Control-Allow-Origin', '*')
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (c.req.method === 'OPTIONS') {
    return c.text('', 204)
  }
  
  await next()
}
