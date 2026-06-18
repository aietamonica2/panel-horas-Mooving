/**
 * Bulk Load Cron Handler
 *
 * Invoked by the Cloudflare Workers scheduled trigger every Tuesday at 08:00 UTC.
 * Calls the MCP tool `create_bulk_time_records` to insert planned hours
 * for the default tenant.
 *
 * Future refactoring note:
 *   When migrating to Vue 3 / Tramia architecture, this cron can remain
 *   unchanged. Only the MCP tool payload needs to be updated to read
 *   a per-tenant schedule configuration from the database.
 */

import { Env } from '../types';

export interface BulkLoadScheduleEntry {
  company_id: string;
  employee_id: string;
  client_id: string;
  project_id: string;
  description: string;
  hours_per_day: number;
  /** ISO date string YYYY-MM-DD */
  start_date: string;
  /** ISO date string YYYY-MM-DD */
  end_date: string;
  /** 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat  — empty means all weekdays */
  days_of_week?: number[];
}

/**
 * Returns the end-of-current-month date string (YYYY-MM-DD).
 */
function endOfCurrentMonth(): string {
  const now = new Date();
  const last = new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 0);
  return last.toISOString().split('T')[0];
}

/**
 * Returns today's date string (YYYY-MM-DD) in UTC.
 */
function today(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Main scheduled handler. Receives the Cloudflare Workers env binding
 * so it can access D1 without going through HTTP.
 *
 * @param env  Cloudflare Workers environment bindings (DB, secrets).
 */
export async function handleBulkLoadCron(env: Env): Promise<void> {
  const db = env.DB;

  // -----------------------------------------------------------------------
  // Load schedule entries from the database.
  // The `bulk_load_schedules` table stores planned recurring entries per tenant.
  // Fall back to a hard-coded default if the table does not yet exist.
  // -----------------------------------------------------------------------
  let schedules: BulkLoadScheduleEntry[] = [];

  try {
    const { results } = await db
      .prepare(
        `SELECT company_id, employee_id, client_id, project_id,
                description, hours_per_day, start_date, end_date, days_of_week
         FROM bulk_load_schedules
         WHERE is_active = 1`
      )
      .all();

    schedules = results.map((r: any) => ({
      company_id: r.company_id,
      employee_id: r.employee_id,
      client_id: r.client_id,
      project_id: r.project_id,
      description: r.description || 'Carga masiva automática',
      hours_per_day: Number(r.hours_per_day) || 4,
      start_date: r.start_date || today(),
      end_date: r.end_date || endOfCurrentMonth(),
      days_of_week: r.days_of_week
        ? (Array.isArray(r.days_of_week)
            ? r.days_of_week
            : (() => { try { return JSON.parse(r.days_of_week); } catch { return undefined; } })()
          )
        : undefined,
    }));
  } catch (_err) {
    // Table may not exist yet — use a sensible default for the default tenant.
    console.warn('[BulkLoadCron] bulk_load_schedules table not found, using default schedule.');
    schedules = [
      {
        company_id: 'mooving-default',
        employee_id: 'emp_monica',
        client_id: 'cli_mooving',
        project_id: 'proj_moov_core',
        description: 'Carga masiva automática semanal',
        hours_per_day: 4,
        start_date: today(),
        end_date: endOfCurrentMonth(),
        // undefined = all weekdays (Mon–Fri)
      },
    ];
  }

  if (schedules.length === 0) {
    console.log('[BulkLoadCron] No active schedules found. Nothing to do.');
    return;
  }

  // -----------------------------------------------------------------------
  // Process each schedule entry.
  // -----------------------------------------------------------------------
  for (const schedule of schedules) {
    console.log(
      `[BulkLoadCron] Processing schedule for company=${schedule.company_id} employee=${schedule.employee_id}`
    );

    const {
      company_id,
      employee_id,
      client_id,
      project_id,
      description,
      hours_per_day,
      start_date,
      end_date,
      days_of_week,
    } = schedule;

    // Resolve names from DB for readable logging.
    let employee_name = employee_id;
    let client_name = client_id;
    let project_name = project_id;

    try {
      const empR = await db.prepare('SELECT name FROM employees WHERE id = ?').bind(employee_id).all();
      if (empR.results.length > 0) employee_name = (empR.results[0] as any).name;

      const cliR = await db.prepare('SELECT name FROM clients WHERE id = ?').bind(client_id).all();
      if (cliR.results.length > 0) client_name = (cliR.results[0] as any).name;

      const projR = await db.prepare('SELECT name FROM projects WHERE id = ?').bind(project_id).all();
      if (projR.results.length > 0) project_name = (projR.results[0] as any).name;
    } catch (err) {
      console.error('[BulkLoadCron] Error resolving names:', err);
    }

    // Validate date range (max 31 days).
    const startMs = new Date(start_date + 'T00:00:00Z').getTime();
    const endMs = new Date(end_date + 'T00:00:00Z').getTime();
    const diffDays = Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      console.warn(`[BulkLoadCron] start_date (${start_date}) is after end_date (${end_date}). Skipping.`);
      continue;
    }
    if (diffDays > 31) {
      console.error(`[BulkLoadCron] Date range exceeds 31 days (${diffDays} days). Skipping for safety.`);
      continue;
    }

    // Determine which days of week to include.
    const targetDays: Set<number> | null = days_of_week && days_of_week.length > 0
      ? new Set(days_of_week)
      : null; // null = default weekdays Mon–Fri (1–5)

    const durationHour = Math.floor(hours_per_day);
    const durationMin = Math.round((hours_per_day % 1) * 60);
    let inserted = 0;

    // Safe counter-based loop — avoids mutable Date off-by-one issues.
    const totalDays = diffDays + 1; // inclusive range
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(startMs + i * 24 * 60 * 60 * 1000);
      const dow = d.getUTCDay();

      if (targetDays) {
        if (!targetDays.has(dow)) continue;
      } else {
        if (dow === 0 || dow === 6) continue; // Skip weekends by default
      }

      const dateStr = d.toISOString().split('T')[0];
      const id = crypto.randomUUID();

      try {
        await db
          .prepare(
            `INSERT INTO time_records (
               id, company_id, employee_id, employee_name, client_id, client_name,
               project_id, project_name, duration_decimal, duration_hours, duration_minutes,
               date, work_type, description, source
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            id,
            company_id,
            employee_id,
            employee_name,
            client_id,
            client_name,
            project_id,
            project_name,
            hours_per_day,
            durationHour,
            durationMin,
            dateStr,
            'project',
            description,
            'cron_bulk_load'
          )
          .run();

        inserted++;
      } catch (err) {
        console.error(`[BulkLoadCron] Error inserting record for ${dateStr}:`, err);
      }
    }

    console.log(
      `[BulkLoadCron] ✅ Inserted ${inserted} records for ${employee_name} (${company_id}) — ${start_date} → ${end_date}`
    );
  }
}
