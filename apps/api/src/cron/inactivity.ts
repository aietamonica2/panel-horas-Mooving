/**
 * Inactivity Alerts Cron Handler
 *
 * Invoked by the Cloudflare Workers scheduled trigger on weekdays (Mon–Fri) at
 * 09:00 UTC. Detects employees who have not logged hours for the last X days and
 * sends them an inactivity alert, reusing the MCP tool `send_inactivity_alerts`
 * (which computes the REAL inactive set and sends the emails via
 * Resend / SendGrid / Cloudflare MailChannels).
 *
 * The threshold (in days) is configurable via `env.INACTIVITY_DAYS` (default 3).
 *
 * NOTE: this handler does NOT run inside an HTTP request, so there is no real
 * Hono request context. We build a minimal service-principal context exposing
 * only what the tool chain actually reads: `c.env` (D1 + secrets) and
 * `c.get('auth')` (tenant + role). Nothing else in the chain
 * (send_inactivity_alerts → send_email_reminders → get_email_reminder_drafts)
 * touches the request/response objects.
 */

import { Env, HonoContext } from '../types';
import { executeToolCall } from '../mcp/server';

/**
 * Builds a minimal HonoContext-compatible object for invoking MCP tools from a
 * background cron. Only `env` and a `get`/`set` variable store are populated.
 *
 * The principal uses `role: 'service'` — the recognised service-account role
 * (see routes/mcp.ts) — and the default tenant `mooving-default`, matching the
 * fallback every tool already applies (`c.get('auth')?.company_id || 'mooving-default'`).
 */
function buildServiceContext(env: Env): HonoContext {
  const store = new Map<string, any>();
  store.set('auth', { company_id: 'mooving-default', role: 'service' });

  return {
    env,
    get: (key: string) => store.get(key),
    set: (key: string, value: any) => {
      store.set(key, value);
    },
  } as unknown as HonoContext;
}

/**
 * Main scheduled handler for automatic inactivity alerts.
 *
 * @param env  Cloudflare Workers environment bindings (DB, email secrets, INACTIVITY_DAYS).
 */
export async function handleInactivityCron(env: Env): Promise<void> {
  // Inactivity threshold in days — configurable via env, default 3.
  const days = Number(env.INACTIVITY_DAYS) || 3;

  const ctx = buildServiceContext(env);

  console.log(`[InactivityCron] Checking inactivity (threshold = ${days} day(s))...`);

  try {
    const result: any = await executeToolCall('send_inactivity_alerts', { days }, ctx);

    const inactiveCount = Number(result?.inactive_count) || 0;
    const alertsSent = Number(result?.alerts_sent) || 0;
    const failedCount = Array.isArray(result?.failed_alerts) ? result.failed_alerts.length : 0;

    console.log(
      `[InactivityCron] ✅ Done. Inactive employees detected: ${inactiveCount}, ` +
        `alerts sent: ${alertsSent}` +
        (failedCount > 0 ? `, failed: ${failedCount}` : '') +
        `. ${result?.message || ''}`
    );
  } catch (err) {
    console.error('[InactivityCron] ❌ Error running inactivity alerts:', err);
  }
}
