/**
 * Health check endpoint
 * Minimal dependency, used for uptime monitoring
 */

import { Hono } from 'hono'
import { HonoContext, ApiResponse } from '../types'
// B1: la versión sale SIEMPRE de src/version.ts (única fuente de verdad,
// en sync con /VERSION en la raíz del repo).
import { APP_VERSION } from '../version'

export const healthRouter = new Hono()

healthRouter.get('/health', async (c: HonoContext): Promise<Response> => {
  const response: ApiResponse = {
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: APP_VERSION,
      environment: c.env?.ENVIRONMENT || 'development',
    },
    timestamp: new Date().toISOString(),
    version: APP_VERSION,
  }
  return c.json(response)
})

export default healthRouter
