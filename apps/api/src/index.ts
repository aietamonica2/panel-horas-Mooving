import { Hono } from 'hono'
import { cors } from './middleware/cors'
import { auth } from './middleware/auth'
import healthRouter from './routes/health'
import dataRouter from './routes/data'
import mcpRouter from './routes/mcp'
import { HonoContext, ApiResponse, CloudflareEnv } from './types'
import { handleBulkLoadCron } from './cron/bulk_load'
import { handleEmailRemindersCron } from './cron/email_reminders'
import { handleInactivityCron } from './cron/inactivity'
import { handleZendeskSyncCron } from './cron/zendesk_sync'
// B1: la versión sale SIEMPRE de src/version.ts (única fuente de verdad,
// en sync con /VERSION en la raíz del repo).
import { APP_VERSION } from './version'

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
      message: `Panel Horas API v${APP_VERSION}`,
      endpoints: ['/api/health', '/api/data/records', '/api/data/upload'],
    },
    timestamp: new Date().toISOString(),
    version: APP_VERSION,
  }
  return c.json(response)
})

// 404 handler
app.notFound((c) => {
  return c.json({
    success: false,
    error: 'Not found',
    timestamp: new Date().toISOString(),
    version: APP_VERSION,
  }, 404)
})

// Error handler
app.onError((err, c) => {
  console.error('API Error:', err)
  return c.json({
    success: false,
    error: err instanceof Error ? err.message : 'Internal server error',
    timestamp: new Date().toISOString(),
    version: APP_VERSION,
  }, 500)
})

/**
 * Cloudflare Workers scheduled trigger.
 * Routes to the appropriate handler based on the trigger (cron expression /
 * trigger time). Keep these in sync with `[triggers] crons` in wrangler.toml:
 *   - Day 28 of month at 12:00 UTC    → Email reminders (syncs Clockify first)
 *   - Weekdays (Mon–Fri) at 10:30 UTC → Zendesk tickets sync (daily import)
 *   - Weekdays (Mon–Fri) at 09:00 UTC → Inactivity alerts (auto-send)
 *   - Tuesdays at 08:00 UTC           → Bulk load cron (default fallback)
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

  // Route: Weekdays (Mon–Fri) at 10:30 UTC → Zendesk tickets sync.
  // Matched by the exact cron expression (precise) with an hour-based fallback,
  // same pattern as the inactivity branch below.
  if (event.cron === '30 10 * * 1-5' || hour === 10) {
    console.log('[Scheduled] Triggering Zendesk-sync cron (weekdays 10:30 UTC)');
    ctx.waitUntil(
      handleZendeskSyncCron(env).catch((err) =>
        console.error('[Scheduled] Zendesk-sync cron error:', err)
      )
    );
    return;
  }

  // Route: Weekdays (Mon–Fri) at 09:00 UTC → Inactivity alerts.
  // Matched by the exact cron expression (precise) with an hour-based fallback,
  // so this NEVER falls through to the default bulk-load branch below.
  if (event.cron === '0 9 * * 1-5' || hour === 9) {
    console.log('[Scheduled] Triggering inactivity-alerts cron (weekdays 09:00 UTC)');
    ctx.waitUntil(
      handleInactivityCron(env).catch((err) =>
        console.error('[Scheduled] Inactivity-alerts cron error:', err)
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


