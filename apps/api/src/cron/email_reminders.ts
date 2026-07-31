/**
 * Email Reminders Cron Handler
 *
 * Invoked by the Cloudflare Workers scheduled trigger on the 28th of each month
 * at 12:00 UTC (09:00 ARG).
 *
 * Flow:
 *   1. Check if automated email reminders are enabled for each tenant
 *   2. Sync Clockify hours first to ensure up-to-date data
 *   3. Generate email drafts for all active employees
 *   4. Send emails via SendGrid API v3
 *   5. Record the send timestamp
 */

import { Env } from '../types';
import { loadTemplate, renderTemplate } from '../mcp/email_templates';

/**
 * Sends an email via SendGrid API v3.
 *
 * @returns true if the email was accepted (HTTP 202), false otherwise.
 */
async function sendViaEmailProvider(
  resendKey: string | undefined,
  sendgridKey: string | undefined,
  fromEmail: string,
  fromName: string,
  toEmail: string,
  subject: string,
  bodyText: string,
  ccEmails: Array<{ email: string }>,
): Promise<boolean> {
  const cleanResend = (resendKey || '').trim();
  const cleanSendGrid = (sendgridKey || '').trim();
  const parsedCcStrings = ccEmails.map(c => c.email).filter(Boolean);

  try {
    if (cleanResend) {
      const resendFrom = fromEmail.includes('<') ? fromEmail : `${fromName} <${fromEmail}>`;
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cleanResend}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: resendFrom,
          to: [toEmail.trim()],
          ...(parsedCcStrings.length > 0 ? { cc: parsedCcStrings } : {}),
          subject,
          text: bodyText,
        }),
      });

      if (resendRes.ok || resendRes.status === 200 || resendRes.status === 201) {
        return true;
      }
      const errBody = await resendRes.text();
      console.error(`[EmailCron][Resend] HTTP ${resendRes.status}: ${errBody}`);
      return false;
    }

    if (cleanSendGrid) {
      const payload: any = {
        personalizations: [
          {
            to: [{ email: toEmail.trim() }],
            ...(ccEmails.length > 0 ? { cc: ccEmails } : {}),
            subject,
          },
        ],
        from: { email: fromEmail, name: fromName },
        content: [{ type: 'text/plain', value: bodyText }],
      };

      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cleanSendGrid}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok || res.status === 202) {
        return true;
      }

      const errBody = await res.text();
      console.error(`[EmailCron][SendGrid] HTTP ${res.status}: ${errBody}`);
      return false;
    }

    console.error('[EmailCron] No API key configured (Resend or SendGrid)');
    return false;
  } catch (err) {
    console.error('[EmailCron] Fetch error:', err);
    return false;
  }
}

/**
 * Syncs Clockify hours for a given tenant before sending email reminders.
 * This ensures the hour totals in reminder emails reflect the latest data.
 */
async function syncClockifyForTenant(
  db: D1Database,
  companyId: string,
  clockifyToken: string,
): Promise<{ inserted: number; totalHours: number }> {
  const BASE_URL = 'https://api.clockify.me/api/v1';
  const REPORTS_URL = 'https://reports.api.clockify.me/v1';

  // Get workspace
  const wsRes = await fetch(`${BASE_URL}/workspaces`, {
    headers: { 'X-Api-Key': clockifyToken },
  });
  if (!wsRes.ok) {
    console.error(`[EmailCron][Clockify] Workspace fetch failed: ${wsRes.status}`);
    return { inserted: 0, totalHours: 0 };
  }

  const workspaces = (await wsRes.json()) as any[];
  let targetWs = workspaces.find((w) =>
    w.name.toLowerCase().includes('mooving tech'),
  );
  if (!targetWs && workspaces.length > 0) targetWs = workspaces[0];
  if (!targetWs) {
    console.error('[EmailCron][Clockify] No workspace found.');
    return { inserted: 0, totalHours: 0 };
  }

  // Sync current month only for efficiency
  const now = new Date();
  const monthStart = new Date(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const monthEnd = new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59);

  const sanitizeId = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

  let inserted = 0;
  let totalHours = 0;
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const reportRes = await fetch(
      `${REPORTS_URL}/workspaces/${targetWs.id}/reports/detailed`,
      {
        method: 'POST',
        headers: {
          'X-Api-Key': clockifyToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRangeStart: monthStart.toISOString(),
          dateRangeEnd: monthEnd.toISOString(),
          detailedFilter: { page, pageSize: 1000 },
        }),
      },
    );

    if (!reportRes.ok) {
      console.error(`[EmailCron][Clockify] Report fetch failed: ${reportRes.status}`);
      break;
    }

    const report = (await reportRes.json()) as any;
    const entries = report.timeentries || [];
    if (entries.length === 0) {
      hasMore = false;
      break;
    }

    for (const entry of entries) {
      const id = 'clk_' + entry._id;
      const durationDecimal = (entry.timeInterval?.duration || 0) / 3600;
      if (durationDecimal <= 0) continue;

      const dateStr = entry.timeInterval?.start
        ? entry.timeInterval.start.split('T')[0]
        : now.toISOString().split('T')[0];

      const employeeName = entry.userName || 'Desconocido';
      const clientName = entry.clientName || 'Sin Cliente';
      const projectName = entry.projectName || 'Sin Proyecto';
      const desc = entry.description || '';

      let workType = 'project';
      const lowerDesc = desc.toLowerCase();
      if (
        projectName.toLowerCase().includes('interna') ||
        clientName.toLowerCase().includes('mooving')
      ) {
        workType = 'internal';
        if (
          lowerDesc.includes('daily') ||
          lowerDesc.includes('reunión') ||
          lowerDesc.includes('weekly')
        ) {
          workType = 'meeting';
        }
      }

      try {
        const res = await db
          .prepare(
            `INSERT OR IGNORE INTO time_records (
              id, company_id, employee_id, employee_name, client_id, client_name,
              project_id, project_name, duration_decimal, duration_hours, duration_minutes,
              date, work_type, description, source
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            id,
            companyId,
            sanitizeId(employeeName),
            employeeName,
            sanitizeId(clientName),
            clientName,
            sanitizeId(projectName),
            projectName,
            durationDecimal,
            Math.floor(durationDecimal),
            Math.round((durationDecimal % 1) * 60),
            dateStr,
            workType,
            desc,
            'clockify',
          )
          .run();

        if (res.meta.changes > 0) {
          inserted++;
          totalHours += durationDecimal;
        }
      } catch (err) {
        console.error('[EmailCron][Clockify] Insert error:', err);
      }
    }

    page++;
  }

  console.log(
    `[EmailCron][Clockify] ✅ Synced ${inserted} new records (${totalHours.toFixed(1)}h) for ${companyId}`,
  );
  return { inserted, totalHours };
}

/**
 * Main scheduled handler for automatic email reminders.
 *
 * @param env  Cloudflare Workers environment bindings (DB, secrets).
 */
export async function handleEmailRemindersCron(env: Env): Promise<void> {
  const db = env.DB;
  const resendKey = env.RESEND_API_KEY;
  const sendgridKey = env.SENDGRID_API_KEY;
  // Remitente unificado con el resto del sistema: preferimos ALERT_FROM_EMAIL
  // (notificaciones@mooving.cloud, dominio verificado en Resend).
  const fromEmail = env.ALERT_FROM_EMAIL || env.RESEND_FROM_EMAIL || env.SENDGRID_FROM_EMAIL || 'notificaciones@mooving.cloud';
  const clockifyToken = env.CLOCKIFY_API_TOKEN;

  if (!resendKey && !sendgridKey) {
    console.error('[EmailCron] ❌ No API key configured (RESEND_API_KEY or SENDGRID_API_KEY). Aborting.');
    return;
  }

  // -----------------------------------------------------------------------
  // 1. Load tenants with automated email reminders enabled
  // -----------------------------------------------------------------------
  let settings: any[] = [];
  try {
    const { results } = await db
      .prepare(
        'SELECT * FROM email_reminder_settings WHERE is_automated = 1',
      )
      .all();
    settings = results || [];
  } catch (err) {
    console.error('[EmailCron] Error reading email_reminder_settings:', err);
    return;
  }

  if (settings.length === 0) {
    console.log('[EmailCron] No tenants with automated reminders enabled. Done.');
    return;
  }

  for (const setting of settings as any[]) {
    const companyId = setting.company_id;
    const defaultCc = setting.default_cc || '';
    const fromName = setting.from_name || 'Mooving Tech';

    console.log(`[EmailCron] Processing tenant: ${companyId}`);

    // -------------------------------------------------------------------
    // 2. Sync Clockify first to get up-to-date hours
    // -------------------------------------------------------------------
    if (clockifyToken) {
      console.log(`[EmailCron] Syncing Clockify for ${companyId}...`);
      try {
        await syncClockifyForTenant(db, companyId, clockifyToken);
      } catch (err) {
        console.error(`[EmailCron] Clockify sync failed for ${companyId}:`, err);
        // Continue anyway — send with whatever data we have
      }
    } else {
      console.warn('[EmailCron] CLOCKIFY_API_TOKEN not set. Skipping sync.');
    }

    // -------------------------------------------------------------------
    // 3. Generate drafts (same logic as get_email_reminder_drafts MCP tool)
    // -------------------------------------------------------------------
    const now = new Date();
    const targetMonth = now.toISOString().substring(0, 7); // "YYYY-MM"

    // Fetch active employees
    const { results: employees } = await db
      .prepare('SELECT * FROM employees WHERE company_id = ? AND is_active = 1')
      .bind(companyId)
      .all();

    if (!employees || employees.length === 0) {
      console.log(`[EmailCron] No active employees for ${companyId}. Skipping.`);
      continue;
    }

    // Fetch hours per employee for the current month
    const { results: records } = await db
      .prepare(
        'SELECT employee_id, employee_name, SUM(duration_decimal) as total_hours FROM time_records WHERE company_id = ? AND date LIKE ? GROUP BY employee_name',
      )
      .bind(companyId, `${targetMonth}-%`)
      .all();

    const hoursMap: Record<string, number> = {};
    for (const r of (records || []) as any[]) {
      if (r.employee_name) hoursMap[r.employee_name.toLowerCase()] = r.total_hours || 0;
      if (r.employee_id) hoursMap[r.employee_id] = r.total_hours || 0;
    }

    const monthIdx = parseInt(targetMonth.split('-')[1], 10) - 1;
    const yearStr = targetMonth.split('-')[0];
    const monthNames = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
    ];
    const monthName = monthNames[monthIdx] || 'este mes';
    const fullMonthYearStr = `${monthName} ${yearStr}`;

    // Parse CC emails
    const ccEmails = defaultCc
      .split(';')
      .map((s: string) => {
        const match = s.match(/<([^>]+)>/);
        const email = match ? match[1] : s.trim();
        return email.includes('@') ? { email } : null;
      })
      .filter(Boolean) as Array<{ email: string }>;

    // Editable templates for this tenant (DB override → default). Loaded once per
    // tenant, rendered per employee. Mirrors the get_email_reminder_drafts MCP tool.
    const tplHours = await loadTemplate(db, companyId, 'reminder_hours');
    const tplZero = await loadTemplate(db, companyId, 'reminder_zero');

    // -------------------------------------------------------------------
    // 4. Send emails via SendGrid
    // -------------------------------------------------------------------
    let sentCount = 0;
    let failedCount = 0;

    for (const emp of employees as any[]) {
      const email =
        emp.email ||
        `${(emp.name as string).toLowerCase().replace(/\s+/g, '.')}@moovingtech.com`;
      const hours = hoursMap[emp.id] || hoursMap[(emp.name as string).toLowerCase()] || 0;

      const cleanName = (emp.name as string).replace(/\./g, ' ').trim();
      const nameParts = cleanName
        .split(/\s+/)
        .map((p: string) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase());
      const firstName = nameParts[0] || cleanName;
      const hoursFormatted = hours.toFixed(2).replace('.', ',');

      // Template per case (DB override → default) + interpolation. Variables:
      // firstName, hours (formatted hoursFormatted) and month (month name, monthName).
      const tpl = hours > 0 ? tplHours : tplZero;
      const tplVars = { firstName, hours: hoursFormatted, month: monthName };
      const subject = renderTemplate(tpl.subject, tplVars);
      const body = renderTemplate(tpl.body, tplVars);

      const success = await sendViaEmailProvider(
        resendKey,
        sendgridKey,
        fromEmail,
        fromName,
        email,
        subject,
        body,
        ccEmails,
      );

      if (success) {
        sentCount++;
      } else {
        failedCount++;
      }
    }

    // -------------------------------------------------------------------
    // 5. Record the send timestamp
    // -------------------------------------------------------------------
    try {
      await db
        .prepare(
          `UPDATE email_reminder_settings SET last_sent_at = datetime('now'), updated_at = datetime('now') WHERE company_id = ?`,
        )
        .bind(companyId)
        .run();
    } catch (err) {
      console.error(`[EmailCron] Error updating last_sent_at for ${companyId}:`, err);
    }

    console.log(
      `[EmailCron] ✅ Tenant ${companyId}: Sent ${sentCount} emails, ${failedCount} failed, for ${fullMonthYearStr}`,
    );
  }

  console.log('[EmailCron] ✅ All tenants processed.');
}
