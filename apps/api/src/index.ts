import { Hono } from 'hono'
import { cors } from './middleware/cors'
import { auth } from './middleware/auth'
import healthRouter from './routes/health'
import dataRouter from './routes/data'
import mcpRouter from './routes/mcp'
import { HonoContext, ApiResponse, CloudflareEnv } from './types'
import { handleBulkLoadCron } from './cron/bulk_load'
import { handleEmailRemindersCron } from './cron/email_reminders'

// API_VERSION: única fuente de verdad interna para el campo `version` de las
// respuestas. Mantener en sync con /VERSION (raíz del repo).
const API_VERSION = 'v2.2.4'

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
      message: `Panel Horas API ${API_VERSION}`,
      endpoints: ['/api/health', '/api/data/records', '/api/data/upload'],
    },
    timestamp: new Date().toISOString(),
    version: API_VERSION,
  }
  return c.json(response)
})

// 404 handler
app.notFound((c) => {
  return c.json({
    success: false,
    error: 'Not found',
    timestamp: new Date().toISOString(),
    version: API_VERSION,
  }, 404)
})

// Error handler
app.onError((err, c) => {
  console.error('API Error:', err)
  return c.json({
    success: false,
    error: err instanceof Error ? err.message : 'Internal server error',
    timestamp: new Date().toISOString(),
    version: API_VERSION,
  }, 500)
})

/**
 * Cloudflare Workers scheduled trigger.
 * Routes to the appropriate handler based on the trigger time:
 *   - Day 28 of month at 12:00 UTC → Email reminders (syncs Clockify first)
 *   - Tuesdays at 08:00 UTC        → Bulk load cron
 */
export async function scheduled(
  event: ScheduledEvent,
  env: CloudflareEnv,
  ctx: ExecutionContext
): Promise<void> {
  const triggerDate = new Date(event.scheduledTime);
  const dayOfMonth = triggerDate.getUTCDate();
  const hour = triggerDate.getUTCHours();

  // Route: 28th of month at 12:00 UTC → Email reminders
  if (dayOfMonth === 28 && hour === 12) {
    console.log('[Scheduled] Triggering email reminders cron (28th of month)');
    ctx.waitUntil(
      handleEmailRemindersCron(env).catch((err) =>
        console.error('[Scheduled] Email reminders cron error:', err)
      )
    );
    return;
  }

  // Route: Default → Bulk load (Tuesdays at 08:00 UTC)
  console.log('[Scheduled] Triggering bulk-load cron');
  ctx.waitUntil(
    handleBulkLoadCron(env).catch((err) =>
      console.error('[Scheduled] Bulk-load cron error:', err)
    )
  );
}

export default app


