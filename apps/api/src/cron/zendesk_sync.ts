/**
 * Zendesk Sync Cron Handler
 *
 * Invoked by the Cloudflare Workers scheduled trigger on weekdays (Mon–Fri) at
 * 10:30 UTC (cron "30 10 * * 1-5" in wrangler.toml). Imports solved Zendesk
 * tickets as time_records (1h per solved ticket) for the default tenant,
 * reusing the SAME shared logic as the MCP tool `sync_zendesk_tickets`
 * (syncZendeskTickets in ../mcp/zendesk.ts — single implementation, no
 * duplication).
 *
 * Credentials come from the Worker environment: ZENDESK_SUBDOMAIN,
 * ZENDESK_EMAIL and ZENDESK_API_TOKEN. If any of them is missing the cron is a
 * graceful no-op: it logs the situation and returns WITHOUT throwing (unlike
 * the manual MCP tool, which throws so the caller sees the misconfiguration).
 *
 * The import is idempotent (INSERT OR IGNORE keyed by 'zen_<ticket_id>'), so
 * running it daily never duplicates hours.
 */

import { Env } from '../types';
import { syncZendeskTickets } from '../mcp/zendesk';

/** Tenant al que el cron importa los tickets (mismo default que las tools MCP). */
const DEFAULT_COMPANY_ID = 'mooving-default';

/**
 * Main scheduled handler for the daily Zendesk tickets sync.
 *
 * @param env  Cloudflare Workers environment bindings (DB + Zendesk credentials).
 */
export async function handleZendeskSyncCron(env: Env): Promise<void> {
  const subdomain = env.ZENDESK_SUBDOMAIN;
  const email = env.ZENDESK_EMAIL;
  const token = env.ZENDESK_API_TOKEN;

  // No-op graceful: sin credenciales configuradas no hay nada que sincronizar.
  if (!subdomain || !email || !token) {
    console.log(
      '[ZendeskSyncCron] Credenciales de Zendesk no configuradas ' +
        '(ZENDESK_SUBDOMAIN / ZENDESK_EMAIL / ZENDESK_API_TOKEN). ' +
        'Se omite la sincronización (no-op).'
    );
    return;
  }

  console.log(`[ZendeskSyncCron] Syncing solved Zendesk tickets for ${DEFAULT_COMPANY_ID}...`);

  try {
    const result = await syncZendeskTickets(
      env.DB,
      { subdomain, email, token },
      DEFAULT_COMPANY_ID
    );

    console.log(
      `[ZendeskSyncCron] ✅ Done. Tickets fetched: ${result.records_fetched}, ` +
        `records inserted: ${result.records_inserted}, hours: ${result.total_hours}. ` +
        `${result.message}`
    );
  } catch (err) {
    // El cron nunca revienta el worker: loguea y termina (igual que los otros crons).
    console.error('[ZendeskSyncCron] ❌ Error running Zendesk sync:', err);
  }
}
