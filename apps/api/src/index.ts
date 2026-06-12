/**
 * Main Hono API Server
 * Cloudflare Workers entry point
 */

import { Hono } from 'hono'
import { cors } from './middleware/cors'
import { auth } from './middleware/auth'
import healthRouter from './routes/health'
import dataRouter from './routes/data'
import { HonoContext, ApiResponse, CloudflareEnv } from './types'

const app = new Hono<{ Bindings: CloudflareEnv }>()

// Global middleware
app.use('*', cors)
app.use('/api/*', auth)

// Routes
app.route('/api', healthRouter)
app.route('/api/data', dataRouter)

// Root endpoint
app.get('/', (c) => {
  const response: ApiResponse = {
    success: true,
    data: {
      message: 'Senda API v1.0.0',
      endpoints: ['/api/health', '/api/data/records', '/api/data/upload'],
    },
    timestamp: new Date().toISOString(),
    version: 'v1.0.0',
  }
  return c.json(response)
})

// 404 handler
app.notFound((c) => {
  return c.json({
    success: false,
    error: 'Not found',
    timestamp: new Date().toISOString(),
    version: 'v1.0.0',
  }, 404)
})

// Error handler
app.onError((err, c) => {
  console.error('API Error:', err)
  return c.json({
    success: false,
    error: err instanceof Error ? err.message : 'Internal server error',
    timestamp: new Date().toISOString(),
    version: 'v1.0.0',
  }, 500)
})

export default app
