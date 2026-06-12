import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import type { CloudflareBindings } from '@/types'
import dataRoutes from '@/routes/data'
import healthRoutes from '@/routes/health'

const app = new Hono<{ Bindings: CloudflareBindings }>()

// Middleware
app.use(logger())
app.use(
  cors({
    origin: ['http://localhost:5173', 'https://panel-horas-mooving.pages.dev'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
)

// Routes
app.route('/api/data', dataRoutes)
app.route('/api/health', healthRoutes)

// Error handling
app.onError((err, c) => {
  console.error(err)
  return c.json(
    {
      success: false,
      error: err.message || 'Internal Server Error',
    },
    500
  )
})

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: 'Not Found',
    },
    404
  )
})

export default app
