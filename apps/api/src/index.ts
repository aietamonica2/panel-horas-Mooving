/**
 * Main Hono API Server
 * Cloudflare Workers entry point
 */

import { Hono } from 'hono'
import { cors } from './middleware/cors'
import { auth } from './middleware/auth'
import healthRouter from './routes/health'
import dataRouter from './routes/data'
import mcpRouter from './routes/mcp'
import { HonoContext, ApiResponse, CloudflareEnv } from './types'
import { handleBulkLoadCron } from './cron/bulk_load'

const app = new Hono<{ Bindings: CloudflareEnv }>()

// Global middleware
app.use('*', cors)
app.use('/api/*', auth)

import authRouter from './routes/auth'

// Routes
app.route('/api/auth', authRouter)
app.route('/api', healthRouter)
app.route('/api/data', dataRouter)
app.route('/api/mcp', mcpRouter)

// Root endpoint
app.get('/', (c) => {
  const response: ApiResponse = {
    success: true,
    data: {
      message: 'Panel Horas API v1.0.1',
      endpoints: ['/api/health', '/api/data/records', '/api/data/upload'],
    },
    timestamp: new Date().toISOString(),
    version: 'v1.0.1',
  }
  return c.json(response)
})

// 404 handler
app.notFound((c) => {
  return c.json({
    success: false,
    error: 'Not found',
    timestamp: new Date().toISOString(),
    version: 'v1.0.1',
  }, 404)
})

// Error handler
app.onError((err, c) => {
  console.error('API Error:', err)
  return c.json({
    success: false,
    error: err instanceof Error ? err.message : 'Internal server error',
    timestamp: new Date().toISOString(),
    version: 'v1.0.1',
  }, 500)
})

/**
 * Cloudflare Workers scheduled trigger.
 * Configured in wrangler.toml as:  cron = "0 8 * * 2"  (every Tuesday at 08:00 UTC)
 */
export async function scheduled(
  _event: ScheduledEvent,
  env: CloudflareEnv,
  ctx: ExecutionContext
): Promise<void> {
  ctx.waitUntil(
    handleBulkLoadCron(env).catch((err) =>
      console.error('[Scheduled] Bulk-load cron error:', err)
    )
  )
}

export default app

