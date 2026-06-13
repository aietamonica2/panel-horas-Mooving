/**
 * Health check endpoint
 * Minimal dependency, used for uptime monitoring
 */

import { Hono } from 'hono'
import { HonoContext, ApiResponse } from '../types'

export const healthRouter = new Hono()

healthRouter.get('/health', async (c: HonoContext): Promise<Response> => {
  const response: ApiResponse = {
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: 'v1.0.0',
      environment: c.env?.ENVIRONMENT || 'development',
    },
    timestamp: new Date().toISOString(),
    version: 'v1.0.0',
  }
  return c.json(response)
})

export default healthRouter
