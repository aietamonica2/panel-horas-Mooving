import { HonoContext } from '../types';
import {
  TEMPLATE_KEYS,
  TEMPLATE_META,
  DEFAULT_TEMPLATES,
  renderTemplate,
  loadTemplate,
  buildEmployeeHoursResolver,
} from './email_templates';

/**
 * FEAT-01 — Visibilidad por cartera para Coordinadores.
 *
 * resolveScopeClientIds(c): resuelve el "scope" de clientes que puede ver el
 * principal autenticado.
 *   - role === 'admin'   → devuelve null  = SIN restricción (ve TODOS los clientes).
 *   - cualquier otro rol → consulta coordinator_assignments (mapa
 *     coordinator_email → client_id) del MISMO tenant y devuelve el array de
 *     client_ids de su cartera. El array puede ser vacío (principal sin cartera
 *     asignada), que el llamador interpreta como "no ve ninguna cartera".
 *
 * El company_id se toma SIEMPRE del principal (c.get('auth')), nunca del body,
 * para preservar el aislamiento multi-tenant (MT-02: tenant-from-principal).
 */
async function resolveScopeClientIds(c: HonoContext): Promise<string[] | null> {
  const auth = c.get('auth');
  // Admin ve todo: null = sin restricción de cartera. No consulta la DB.
  if (auth?.role === 'admin') return null;

  const db = c.env.DB;
  const company_id = auth?.company_id || 'mooving-default';
  const email = auth?.email || '';

  const { results } = await db
    .prepare('SELECT client_id FROM coordinator_assignments WHERE company_id = ? AND coordinator_email = ?')
    .bind(company_id, email)
    .all();

  return (results || []).map((r: any) => r.client_id as string);
}

// Tarifa por defecto (USD/hora) cuando el empleado no tiene hourly_rate_usd
// (columna employees.hourly_rate_usd, migración 0019, DEFAULT 45). Se usa para
// estimar ingresos reales y así resolver el problema histórico de amount_usd = 0.
const DEFAULT_HOURLY_RATE = 45;

// Umbral por defecto (días) para considerar inactivo a un empleado.
const DEFAULT_INACTIVITY_DAYS = 3;

// Remitente por defecto de las alertas de inactividad si no hay ALERT_FROM_EMAIL.
const ALERT_FROM_FALLBACK = 'alertas@moovingtech.com';

/** Deriva un primer nombre "lindo" (capitalizado) desde "nombre.apellido" o "Nombre Apellido". */
function firstNameFrom(name: string): string {
  const clean = String(name || '').replace(/[._]/g, ' ').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  const first = parts[0] || clean || 'equipo';
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

/**
 * Contenido (asunto + cuerpo) del email de alerta de inactividad para un empleado.
 * Compartido por send_inactivity_alerts (envío real) y get_inactivity_preview
 * (vista previa) para que lo que se previsualiza sea EXACTAMENTE lo que se envía.
 *
 * El asunto y el cuerpo salen de la plantilla `inactivity` (override del tenant o
 * default), que el llamador ya resolvió con loadTemplate(). Sólo interpola las
 * variables disponibles para este caso: firstName y days.
 */
function buildInactivityEmail(
  emp: { name: string; last_record_date?: string | null; days_inactive?: number | null },
  days: number,
  tpl: { subject: string; body: string }
): { subject: string; body: string } {
  const firstName = firstNameFrom(emp.name);
  // U4: mostrar los días REALES sin cargar (days_inactive), no el umbral. Si el
  // empleado nunca cargó (null), caemos al umbral como referencia.
  const vars = { firstName, days: emp.days_inactive ?? days };
  return {
    subject: renderTemplate(tpl.subject, vars),
    body: renderTemplate(tpl.body, vars),
  };
}

/**
 * Calcula los empleados INACTIVOS reales del tenant autenticado: empleados ACTIVOS
 * (is_active = 1) sin ningún registro de horas, o cuyo último registro es anterior
 * al corte de N días. Matchea horas por employee_id Y por employee_name porque los
 * distintos orígenes (Clockify/Zendesk/manual) guardan uno u otro. Siempre scopeado
 * por company_id del principal (MT-02: tenant-from-principal).
 *
 * Reutilizado por send_inactivity_alerts y get_inactivity_preview para garantizar
 * que la vista previa y el envío usen exactamente la misma lista.
 */
async function computeInactiveEmployees(
  c: HonoContext,
  days: number
): Promise<{
  inactive: Array<{
    employee_id: string;
    name: string;
    email: string | null;
    last_record_date: string | null;
    days_inactive: number | null;
  }>;
  cutoffStr: string;
  company_id: string;
}> {
  const db = c.env.DB;
  const company_id = c.get('auth')?.company_id || 'mooving-default';

  // Fecha de corte: quien no cargó horas en/después de esta fecha se considera inactivo.
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - days);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  const todayMs = Date.now();

  // 1. Empleados activos del tenant.
  const { results: employees } = await db.prepare(
    'SELECT id, name, email FROM employees WHERE company_id = ? AND is_active = 1'
  ).bind(company_id).all();

  // 2. Última fecha con registro por empleado (por id y por nombre).
  const { results: lastRecords } = await db.prepare(
    'SELECT employee_id, employee_name, MAX(date) as last_date FROM time_records WHERE company_id = ? GROUP BY employee_id, employee_name'
  ).bind(company_id).all();

  const lastByKey: Record<string, string> = {};
  for (const r of (lastRecords || []) as any[]) {
    const d = r.last_date as string;
    if (!d) continue;
    for (const raw of [r.employee_id, r.employee_name]) {
      if (!raw) continue;
      const k = String(raw).toLowerCase();
      if (!lastByKey[k] || d > lastByKey[k]) lastByKey[k] = d;
    }
  }

  const inactive: Array<{
    employee_id: string;
    name: string;
    email: string | null;
    last_record_date: string | null;
    days_inactive: number | null;
  }> = [];

  for (const emp of (employees || []) as any[]) {
    const idKey = String(emp.id || '').toLowerCase();
    const nameKey = String(emp.name || '').toLowerCase();
    const lastDate = lastByKey[idKey] || lastByKey[nameKey] || null;
    if (!lastDate || lastDate < cutoffStr) {
      const daysInactive = lastDate
        ? Math.max(0, Math.floor((todayMs - new Date(lastDate + 'T00:00:00Z').getTime()) / 86400000))
        : null;
      inactive.push({
        employee_id: emp.id,
        name: emp.name,
        email: emp.email || null,
        last_record_date: lastDate,
        days_inactive: daysInactive,
      });
    }
  }

  return { inactive, cutoffStr, company_id };
}

export const TOOL_REGISTRY = {
  get_clients: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const company_id = c.get('auth')?.company_id || 'mooving-default';
    const { results } = await db.prepare('SELECT * FROM clients WHERE company_id = ?').bind(company_id).all();
    return { clients: results };
  },
  create_client: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const { name } = params;
    const cid = c.get('auth')?.company_id || 'mooving-default';
    const id = 'cli_' + crypto.randomUUID().split('-')[0];
    await db.prepare('INSERT INTO clients (id, company_id, name) VALUES (?, ?, ?)')
      .bind(id, cid, name).run();
    return { success: true, client_id: id };
  },
  update_client: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const { id, name } = params;
    const company_id = c.get('auth')?.company_id || 'mooving-default';
    await db.prepare('UPDATE clients SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND company_id = ?')
      .bind(name, id, company_id).run();
    return { success: true };
  },
  delete_client: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const { id } = params;
    const company_id = c.get('auth')?.company_id || 'mooving-default';
    await db.prepare('DELETE FROM clients WHERE id = ? AND company_id = ?').bind(id, company_id).run();
    return { success: true };
  },

  get_client_contracts: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const company_id = c.get('auth')?.company_id || 'mooving-default';
    const { results } = await db.prepare('SELECT * FROM client_contracts WHERE company_id = ?').bind(company_id).all();
    return { contracts: results || [] };
  },
  set_client_contract: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const { client_id, month, contracted_hours } = params;
    const company_id = c.get('auth')?.company_id || 'mooving-default';
    const id = `cnt_${client_id}_${month}`.replaceAll(/[^a-zA-Z0-9_]/g, '_');
    const hours = Number(contracted_hours || 0);

    await db.prepare(`
      INSERT INTO client_contracts (id, company_id, client_id, month, contracted_hours, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(company_id, client_id, month) DO UPDATE SET
        contracted_hours = excluded.contracted_hours,
        updated_at = CURRENT_TIMESTAMP
    `).bind(id, company_id, client_id, month, hours).run();

    return { success: true, contract_id: id };
  },

  get_projects: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const company_id = c.get('auth')?.company_id || 'mooving-default';
    const { results } = await db.prepare('SELECT * FROM projects WHERE company_id = ?').bind(company_id).all();
    return { projects: results };
  },
  create_project: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const { client_id, name } = params;
    const cid = c.get('auth')?.company_id || 'mooving-default';
    const id = 'proj_' + crypto.randomUUID().split('-')[0];
    await db.prepare('INSERT INTO projects (id, company_id, client_id, name) VALUES (?, ?, ?, ?)')
      .bind(id, cid, client_id, name).run();
    return { success: true, project_id: id };
  },
  update_project: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const { id, client_id, name } = params;
    const company_id = c.get('auth')?.company_id || 'mooving-default';
    await db.prepare('UPDATE projects SET client_id = ?, name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND company_id = ?')
      .bind(client_id, name, id, company_id).run();
    return { success: true };
  },
  delete_project: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const { id } = params;
    const company_id = c.get('auth')?.company_id || 'mooving-default';
    await db.prepare('DELETE FROM projects WHERE id = ? AND company_id = ?').bind(id, company_id).run();
    return { success: true };
  },

  get_employees: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const auth = c.get('auth');
    const company_id = auth?.company_id || 'mooving-default';
    // SELECT * ya trae la columna hourly_rate_usd (valor hora por empleado, migración 0019).
    const { results } = await db.prepare('SELECT * FROM employees WHERE company_id = ?').bind(company_id).all();

    // hourly_rate_usd es DATO SENSIBLE: sólo admin / C-level (o principal de servicio)
    // puede verlo. Para cualquier otro rol se elimina el campo de cada empleado ANTES
    // de retornar, de modo que la tarifa nunca viaje al cliente.
    const role = auth?.role || '';
    const canSeeRate = role === 'admin' || role === 'service';
    const employees = (results || []).map((e: any) => {
      // password_hash NUNCA debe salir del servidor por esta tool (fuga P0).
      const { password_hash, ...safe } = e;
      if (canSeeRate) return safe;
      // hourly_rate_usd es sensible: sólo admin/servicio lo ve.
      const { hourly_rate_usd, ...rest } = safe;
      return rest;
    });

    return { employees };
  },
  create_employee: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const { name, email, is_active, daily_hours_expected } = params;
    const cid = c.get('auth')?.company_id || 'mooving-default';
    const id = 'emp_' + crypto.randomUUID().split('-')[0];
    const active = is_active !== undefined ? (is_active ? 1 : 0) : 1;
    const dailyHours = daily_hours_expected !== undefined ? Number(daily_hours_expected) : 8.0;
    await db.prepare('INSERT INTO employees (id, company_id, name, email, is_active, daily_hours_expected) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(id, cid, name, email || null, active, dailyHours).run();
    return { success: true, employee_id: id };
  },
  update_employee: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const { id, name, email, is_active, daily_hours_expected } = params;
    const active = is_active !== undefined ? (is_active ? 1 : 0) : 1;
    const company_id = c.get('auth')?.company_id || 'mooving-default';
    let query = 'UPDATE employees SET name = ?, email = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP';
    const bindParams: any[] = [name, email || null, active];
    if (daily_hours_expected !== undefined) {
      query += ', daily_hours_expected = ?';
      bindParams.push(Number(daily_hours_expected));
    }
    query += ' WHERE id = ? AND company_id = ?';
    bindParams.push(id, company_id);
    await db.prepare(query).bind(...bindParams).run();
    return { success: true };
  },
  delete_employee: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const { id } = params;
    const company_id = c.get('auth')?.company_id || 'mooving-default';
    await db.prepare('DELETE FROM employees WHERE id = ? AND company_id = ?').bind(id, company_id).run();
    return { success: true };
  },

  // set_employee_rate — Actualiza el valor hora (hourly_rate_usd) de un empleado.
  // Dato SENSIBLE: SÓLO admin puede modificarlo. Si role !== 'admin' se devuelve
  // { success:false, error:'No autorizado' } sin tocar la DB. La tarifa se sanitiza
  // (número finito y >= 0). Siempre scopeado por company_id del principal
  // (MT-02: tenant-from-principal): WHERE id = ? AND company_id = ?.
  set_employee_rate: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const auth = c.get('auth');
    const role = auth?.role || '';
    if (role !== 'admin') {
      return { success: false, error: 'No autorizado' };
    }

    const company_id = auth?.company_id || 'mooving-default';
    const { employee_id } = params;

    // Sanitizar la tarifa: número válido y >= 0 (un valor inválido/negativo cae a 0).
    let rate = Number(params.hourly_rate_usd);
    if (!isFinite(rate) || rate < 0) rate = 0;

    await db.prepare(
      'UPDATE employees SET hourly_rate_usd = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND company_id = ?'
    ).bind(rate, employee_id, company_id).run();

    return { success: true, employee_id, hourly_rate_usd: rate };
  },

  get_categories: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const company_id = c.get('auth')?.company_id || 'mooving-default';
    const { results } = await db.prepare('SELECT * FROM categories WHERE company_id = ?').bind(company_id).all();
    return { categories: results };
  },
  create_category: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const { name } = params;
    const cid = c.get('auth')?.company_id || 'mooving-default';
    const id = crypto.randomUUID().split('-')[0];
    await db.prepare('INSERT INTO categories (id, company_id, name) VALUES (?, ?, ?)')
      .bind(id, cid, name).run();
    return { success: true, category_id: id };
  },
  update_category: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const { id, name } = params;
    const company_id = c.get('auth')?.company_id || 'mooving-default';
    await db.prepare('UPDATE categories SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND company_id = ?')
      .bind(name, id, company_id).run();
    return { success: true };
  },
  delete_category: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const { id } = params;
    const company_id = c.get('auth')?.company_id || 'mooving-default';
    await db.prepare('DELETE FROM categories WHERE id = ? AND company_id = ?').bind(id, company_id).run();
    return { success: true };
  },

  create_time_record: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const { employee_id, client_id, project_id, duration_decimal, date, work_type, description } = params;
    
    // Auto-detect company from auth if not provided
    const company_id = c.get('auth')?.company_id || 'mooving-default';
    
    // Simple lookup for names if not provided
    let employee_name = params.employee_name || '';
    let client_name = params.client_name || '';
    let project_name = params.project_name || '';
    
    if (!employee_name && employee_id) {
        const { results } = await db.prepare('SELECT name FROM employees WHERE id = ? AND company_id = ?').bind(employee_id, company_id).all();
        if (results.length > 0) employee_name = results[0].name;
    }
    if (!client_name && client_id) {
        const { results } = await db.prepare('SELECT name FROM clients WHERE id = ? AND company_id = ?').bind(client_id, company_id).all();
        if (results.length > 0) client_name = results[0].name;
    }
    if (!project_name && project_id) {
        const { results } = await db.prepare('SELECT name FROM projects WHERE id = ? AND company_id = ?').bind(project_id, company_id).all();
        if (results.length > 0) project_name = results[0].name;
    }

    const id = crypto.randomUUID();
    const durationHour = Math.floor(duration_decimal || 0);
    const durationMin = Math.round(((duration_decimal || 0) % 1) * 60);

    await db.prepare(`
      INSERT INTO time_records (
        id, company_id, employee_id, employee_name, client_id, client_name,
        project_id, project_name, duration_decimal, duration_hours, duration_minutes,
        date, work_type, description, source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, company_id, employee_id, employee_name,
      client_id, client_name, project_id, project_name,
      duration_decimal, durationHour, durationMin,
      date || new Date().toISOString().split('T')[0], 
      work_type || 'project', description || '', 'senda_ai'
    ).run();

    return {
      success: true,
      record_id: id,
      message: `Registro de tiempo creado exitosamente para el empleado ${employee_name}.`
    };
  },

  create_bulk_time_records: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const { employee_id, client_id, project_id, duration_decimal, work_type, description, start_date, end_date, days_of_week } = params;
    
    const company_id = c.get('auth')?.company_id || 'mooving-default';
    
    let employee_name = params.employee_name || '';
    let client_name = params.client_name || '';
    let project_name = params.project_name || '';
    
    if (!employee_name && employee_id) {
        const { results } = await db.prepare('SELECT name FROM employees WHERE id = ? AND company_id = ?').bind(employee_id, company_id).all();
        if (results.length > 0) employee_name = results[0].name;
    }
    if (!client_name && client_id) {
        const { results } = await db.prepare('SELECT name FROM clients WHERE id = ? AND company_id = ?').bind(client_id, company_id).all();
        if (results.length > 0) client_name = results[0].name;
    }
    if (!project_name && project_id) {
        const { results } = await db.prepare('SELECT name FROM projects WHERE id = ? AND company_id = ?').bind(project_id, company_id).all();
        if (results.length > 0) project_name = results[0].name;
    }

    if (!start_date || !end_date) {
      throw new Error('start_date and end_date are required for bulk time records');
    }

    // Force UTC parsing to avoid timezone shift issues
    const start = new Date(start_date + 'T00:00:00Z');
    const end = new Date(end_date + 'T00:00:00Z');
    
    // Safety limit of 31 days max
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    if (diffDays > 31) {
      throw new Error('No se permite la carga masiva de más de 31 días a la vez por razones de seguridad.');
    }

    let targetDays: number[] | null = null;
    if (days_of_week && Array.isArray(days_of_week) && days_of_week.length > 0) {
      targetDays = days_of_week.map(d => {
        if (typeof d === 'number') return d;
        const lower = String(d).toLowerCase();
        if (lower.startsWith('dom')) return 0;
        if (lower.startsWith('lun')) return 1;
        if (lower.startsWith('mar')) return 2;
        if (lower.startsWith('mie') || lower.startsWith('mié')) return 3;
        if (lower.startsWith('jue')) return 4;
        if (lower.startsWith('vie')) return 5;
        if (lower.startsWith('sab') || lower.startsWith('sáb')) return 6;
        return parseInt(String(d));
      }).filter(d => !isNaN(d));
    }

    const durationHour = Math.floor(duration_decimal || 0);
    const durationMin = Math.round(((duration_decimal || 0) % 1) * 60);

    let inserted = 0;
    
    // Iterate over dates using UTC
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const dayOfWeek = d.getUTCDay();
      
      if (targetDays) {
        if (!targetDays.includes(dayOfWeek)) continue;
      } else {
        if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Default skip weekends
      }

      const id = crypto.randomUUID();
      const currentDateString = d.toISOString().split('T')[0];

      await db.prepare(`
        INSERT INTO time_records (
          id, company_id, employee_id, employee_name, client_id, client_name,
          project_id, project_name, duration_decimal, duration_hours, duration_minutes,
          date, work_type, description, source
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id, company_id, employee_id, employee_name,
        client_id, client_name, project_id, project_name,
        duration_decimal, durationHour, durationMin,
        currentDateString, 
        work_type || 'project', description || '', 'senda_ai_bulk'
      ).run();
      
      inserted++;
    }

    return {
      success: true,
      records_inserted: inserted,
      message: `Carga masiva completada: se insertaron ${inserted} registros para el empleado ${employee_name}.`
    };
  },

  get_time_records: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const { month, employee_id } = params;
    const company_id = c.get('auth')?.company_id || 'mooving-default';

    let query = 'SELECT * FROM time_records WHERE company_id = ?';
    const queryParams: any[] = [company_id];
    
    if (month) {
      query += ' AND strftime("%Y-%m", date) = ?';
      queryParams.push(month);
    }
    if (employee_id) {
      query += ' AND employee_id = ?';
      queryParams.push(employee_id);
    }
    
    query += ' ORDER BY date DESC LIMIT 100';
    
    const { results } = await db.prepare(query).bind(...queryParams).all();
    return { records: results };
  },
  
  // ---------------------------------------------------------------------------
  // FEAT-01 — Visibilidad por cartera para Coordinadores.
  // get_my_scope / get_coordinator_overview usan resolveScopeClientIds() para
  // limitar lo que ve un coordinador a los client_id de su cartera. El admin no
  // tiene restricción (ve todos los clientes del tenant). Siempre se filtra por
  // company_id del principal (MT-02: tenant-from-principal).
  // ---------------------------------------------------------------------------

  get_my_scope: async (params: any, c: HonoContext) => {
    const auth = c.get('auth');
    const role = auth?.role || '';

    // scope === null → admin (ve todo). array → cartera del coordinador (puede ser vacía).
    const scope = await resolveScopeClientIds(c);
    const client_ids = scope || [];
    // is_coordinator = tiene asignaciones de cartera (no admin y al menos 1 cliente).
    const is_coordinator = scope !== null && client_ids.length > 0;

    // Para un admin: is_coordinator=false y client_ids=[] (vacío = sin restricción, "ve todo").
    return { role, is_coordinator, client_ids };
  },

  get_coordinator_overview: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const company_id = c.get('auth')?.company_id || 'mooving-default';

    // scope === null → admin: incluir TODOS los clientes del tenant.
    // scope vacío     → coordinador sin cartera: no hay clientes que mostrar.
    // scope con ids   → sólo los clientes de su cartera.
    const scope = await resolveScopeClientIds(c);
    if (scope !== null && scope.length === 0) {
      return { clients: [] };
    }

    // Agregación SQL por cliente. LEFT JOIN para incluir clientes de la cartera
    // aunque todavía no tengan registros de horas (total_hours/records/pending = 0).
    let query = `
      SELECT
        c.id   AS client_id,
        c.name AS client_name,
        COALESCE(SUM(tr.duration_decimal), 0) AS total_hours,
        COUNT(tr.id) AS records,
        COALESCE(SUM(CASE WHEN tr.status = 'pending' THEN 1 ELSE 0 END), 0) AS pending
      FROM clients c
      LEFT JOIN time_records tr
        ON tr.client_id = c.id AND tr.company_id = c.company_id
      WHERE c.company_id = ?`;
    const queryParams: any[] = [company_id];

    if (scope !== null) {
      const placeholders = scope.map(() => '?').join(', ');
      query += ` AND c.id IN (${placeholders})`;
      queryParams.push(...scope);
    }

    query += ' GROUP BY c.id, c.name ORDER BY c.name';

    const { results } = await db.prepare(query).bind(...queryParams).all();

    const clients = (results || []).map((r: any) => ({
      client_id: r.client_id,
      client_name: r.client_name,
      total_hours: Number(r.total_hours) || 0,
      records: Number(r.records) || 0,
      pending: Number(r.pending) || 0,
    }));

    return { clients };
  },

  // ---------------------------------------------------------------------------
  // FEAT-02 — Flujo de aprobación de horas (approval workflow).
  // Todas derivan `company_id` del principal autenticado (nunca del body) para
  // preservar el aislamiento multi-tenant (MT-02: tenant-from-principal).
  // ---------------------------------------------------------------------------

  get_pending_time_records: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const { employee_id, month } = params;
    const company_id = c.get('auth')?.company_id || 'mooving-default';

    let query = "SELECT * FROM time_records WHERE company_id = ? AND status = 'pending'";
    const queryParams: any[] = [company_id];

    // FEAT-01 — Visibilidad por cartera. get_pending_time_records es una tool de
    // APROBACIÓN, así que sólo los aprobadores deben ver registros pendientes:
    //   - admin       → scope === null: SIN restricción de cliente (ve todo, como estaba).
    //   - coordinador → scope = client_ids de su cartera: se agrega AND client_id IN (...).
    //   - sin cartera → (empleado común o principal de servicio, scope vacío): la opción
    //                   MÁS SEGURA es NO exponer registros pendientes ajenos, así que se
    //                   fuerza un resultado vacío (AND 1 = 0). Preferimos "vacío" antes que
    //                   intentar un match frágil auth→employee: el email del principal no
    //                   coincide de forma fiable con employee_id/employee_name (distintos
    //                   orígenes guardan "nombre.apellido", "Nombre Apellido" o un email).
    const scopeClientIds = await resolveScopeClientIds(c);
    if (scopeClientIds !== null) {
      if (scopeClientIds.length > 0) {
        const placeholders = scopeClientIds.map(() => '?').join(', ');
        query += ` AND client_id IN (${placeholders})`;
        queryParams.push(...scopeClientIds);
      } else {
        query += ' AND 1 = 0';
      }
    }

    if (employee_id) {
      query += ' AND employee_id = ?';
      queryParams.push(employee_id);
    }
    if (month) {
      query += ' AND strftime("%Y-%m", date) = ?';
      queryParams.push(month);
    }

    query += ' ORDER BY date DESC';

    const { results } = await db.prepare(query).bind(...queryParams).all();
    return { records: results || [], count: (results || []).length };
  },

  approve_time_record: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const { id } = params;
    const company_id = c.get('auth')?.company_id || 'mooving-default';
    await db.prepare("UPDATE time_records SET status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND company_id = ?")
      .bind(id, company_id).run();
    return { success: true };
  },

  reject_time_record: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const { id, reason } = params;
    const company_id = c.get('auth')?.company_id || 'mooving-default';

    // La tabla time_records (esquema en migración 0004 + columnas de 0017) NO tiene
    // una columna dedicada para el motivo de rechazo. Para no inventar esquema:
    // si viene `reason`, lo anexamos al final de `description` (" [Rechazado: <reason>]");
    // si no viene, se hace el UPDATE simple. En ambos caminos se mantiene el scope
    // de tenant (WHERE id = ? AND company_id = ?).
    if (reason) {
      await db.prepare("UPDATE time_records SET status = 'rejected', description = COALESCE(description, '') || ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND company_id = ?")
        .bind(` [Rechazado: ${reason}]`, id, company_id).run();
    } else {
      await db.prepare("UPDATE time_records SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND company_id = ?")
        .bind(id, company_id).run();
    }
    return { success: true };
  },

  approve_all_pending: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const { employee_id } = params;
    const company_id = c.get('auth')?.company_id || 'mooving-default';

    let query = "UPDATE time_records SET status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE status = 'pending' AND company_id = ?";
    const queryParams: any[] = [company_id];

    if (employee_id) {
      query += ' AND employee_id = ?';
      queryParams.push(employee_id);
    }

    const res = await db.prepare(query).bind(...queryParams).run();
    return { success: true, approved_count: res?.meta?.changes ?? 0 };
  },

  get_availability_metrics: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const { month } = params;
    const company_id = c.get('auth')?.company_id || 'mooving-default';

    let query = 'SELECT SUM(duration_decimal) as total_hours, employee_id FROM time_records WHERE company_id = ?';
    const queryParams: any[] = [company_id];
    
    if (month) {
      query += ' AND strftime("%Y-%m", date) = ?';
      queryParams.push(month);
    }
    
    query += ' GROUP BY employee_id';
    
    const { results } = await db.prepare(query).bind(...queryParams).all();
    return { metrics: results };
  },

  get_employee_insights: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const { employee_id, month } = params;
    const company_id = c.get('auth')?.company_id || 'mooving-default';

    // Assume 160h standard month for full time
    const expected_monthly_hours = 160;

    let query = 'SELECT * FROM time_records WHERE company_id = ? AND employee_id = ?';
    const queryParams: any[] = [company_id, employee_id];

    if (month) {
      query += ' AND strftime("%Y-%m", date) = ?';
      queryParams.push(month);
    } else {
      // Default to current month
      query += ' AND strftime("%Y-%m", date) = strftime("%Y-%m", "now")';
    }

    const { results } = await db.prepare(query).bind(...queryParams).all();
    
    const total_hours = results.reduce((acc: number, r: any) => acc + (r.duration_decimal || 0), 0);
    const unique_days = new Set(results.map((r: any) => r.date)).size;
    const avg_per_day = unique_days > 0 ? (total_hours / unique_days).toFixed(1) : 0;
    
    // Most common clients
    const clients: Record<string, number> = {};
    results.forEach((r: any) => {
      clients[r.client_name] = (clients[r.client_name] || 0) + (r.duration_decimal || 0);
    });
    
    return {
      employee_id,
      month_evaluated: month || 'current',
      total_hours_loaded: total_hours,
      expected_monthly_hours,
      gap_hours: Math.max(0, expected_monthly_hours - total_hours),
      average_hours_per_active_day: Number(avg_per_day),
      top_clients: clients,
      insight_message: `El empleado ha cargado ${total_hours}h este mes. Su meta es ${expected_monthly_hours}h. Le faltan ${Math.max(0, expected_monthly_hours - total_hours)}h.`
    };
  },

  // ---------------------------------------------------------------------------
  // get_executive_metrics — Métricas ejecutivas REALES para el C-level.
  //
  // Ingreso estimado = Σ (duration_decimal × valor hora del empleado del registro).
  // La tarifa sale de employees.hourly_rate_usd vía LEFT JOIN (time_records → employees
  // por employee_id O employee_name). Si el empleado no matchea o su tarifa es NULL, se
  // usa la TARIFA POR DEFECTO de 45 USD/h (DEFAULT_HOURLY_RATE). Esto resuelve el
  // problema histórico de amount_usd = 0 en todos los registros: el ingreso se DERIVA
  // de horas × tarifa por empleado, no del campo amount_usd persistido.
  //
  // Horas facturables = work_type = 'project' OR is_billable = 1; el resto es overhead.
  // Respeta filtros opcionales: month ('YYYY-MM') y/o rango start_date/end_date
  // ('YYYY-MM-DD'). Siempre scopeado por company_id del principal (MT-02).
  //
  // Retorno: { total_revenue_usd, billable_hours, nonbillable_hours,
  //            revenue_by_client:[...], revenue_by_employee:[...], billable_rate_pct, ... }
  // ---------------------------------------------------------------------------
  get_executive_metrics: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const company_id = c.get('auth')?.company_id || 'mooving-default';
    const { month, start_date, end_date } = params || {};

    // U3: la tarifa se resuelve con una SUBCONSULTA correlacionada (una tarifa por
    // registro, priorizando el match por id sobre el match por nombre) en lugar de
    // un LEFT JOIN con OR. El JOIN con OR podía matchear un mismo time_record a
    // VARIAS fichas de empleado (por identidades duplicadas), y eso DUPLICABA horas
    // e ingresos. Con la subconsulta + LIMIT 1, `FROM time_records` produce
    // exactamente una fila por registro. COALESCE aplica la tarifa default.
    let query = `
      SELECT
        tr.employee_id       AS employee_id,
        tr.employee_name     AS employee_name,
        tr.client_name       AS client_name,
        tr.work_type         AS work_type,
        tr.is_billable       AS is_billable,
        tr.duration_decimal  AS duration_decimal,
        COALESCE((
          SELECT e.hourly_rate_usd FROM employees e
          WHERE e.company_id = tr.company_id
            AND (e.id = tr.employee_id OR e.name = tr.employee_name)
          ORDER BY (e.id = tr.employee_id) DESC
          LIMIT 1
        ), ?) AS hourly_rate_usd
      FROM time_records tr
      WHERE tr.company_id = ?`;
    const queryParams: any[] = [DEFAULT_HOURLY_RATE, company_id];

    if (month) {
      query += ' AND strftime("%Y-%m", tr.date) = ?';
      queryParams.push(month);
    }
    if (start_date) {
      query += ' AND tr.date >= ?';
      queryParams.push(start_date);
    }
    if (end_date) {
      query += ' AND tr.date <= ?';
      queryParams.push(end_date);
    }

    const { results } = await db.prepare(query).bind(...queryParams).all();

    let total_revenue_usd = 0;
    let billable_hours = 0;
    let nonbillable_hours = 0;
    const byClient: Record<string, number> = {};
    const byEmployee: Record<string, number> = {};

    for (const r of (results || []) as any[]) {
      const hours = Number(r.duration_decimal) || 0;

      // Tarifa por empleado; NULL/indefinida → default 45. Un 0 explícito se respeta.
      const rawRate = r.hourly_rate_usd;
      let rate = (rawRate === null || rawRate === undefined || rawRate === '')
        ? DEFAULT_HOURLY_RATE
        : Number(rawRate);
      if (!isFinite(rate) || rate < 0) rate = DEFAULT_HOURLY_RATE;

      const revenue = hours * rate;
      total_revenue_usd += revenue;

      // Facturable si el tipo es 'project' o el flag is_billable está en 1.
      const isBillable = r.work_type === 'project' || Number(r.is_billable) === 1;
      if (isBillable) billable_hours += hours;
      else nonbillable_hours += hours;

      const clientKey = r.client_name || 'Sin Cliente';
      byClient[clientKey] = (byClient[clientKey] || 0) + revenue;

      const empKey = r.employee_name || r.employee_id || 'Desconocido';
      byEmployee[empKey] = (byEmployee[empKey] || 0) + revenue;
    }

    const round2 = (n: number) => Math.round(n * 100) / 100;
    const total_hours = billable_hours + nonbillable_hours;

    // Ingreso por cliente y por empleado, ordenado de mayor a menor (top primero).
    const revenue_by_client = Object.entries(byClient)
      .map(([client_name, revenue]) => ({ client_name, revenue_usd: round2(revenue) }))
      .sort((a, b) => b.revenue_usd - a.revenue_usd);

    const revenue_by_employee = Object.entries(byEmployee)
      .map(([employee_name, revenue]) => ({ employee_name, revenue_usd: round2(revenue) }))
      .sort((a, b) => b.revenue_usd - a.revenue_usd);

    // Proxies %: facturabilidad (horas facturables / total) y overhead (complemento).
    const billable_rate_pct = total_hours > 0 ? round2((billable_hours / total_hours) * 100) : 0;
    const overhead_pct = total_hours > 0 ? round2((nonbillable_hours / total_hours) * 100) : 0;

    return {
      success: true,
      currency: 'USD',
      default_hourly_rate_usd: DEFAULT_HOURLY_RATE,
      total_revenue_usd: round2(total_revenue_usd),
      total_hours: round2(total_hours),
      billable_hours: round2(billable_hours),
      nonbillable_hours: round2(nonbillable_hours),
      billable_rate_pct,
      overhead_pct,
      revenue_by_client,
      revenue_by_employee,
      filters: { month: month || null, start_date: start_date || null, end_date: end_date || null },
      // Documentación: el ingreso usa la tarifa POR EMPLEADO (employees.hourly_rate_usd);
      // si falta o es NULL, se aplica 45 USD/h por defecto.
      note: 'Ingreso estimado = horas × tarifa por empleado (employees.hourly_rate_usd; default 45 USD/h si no está seteada).',
    };
  },

  sync_clockify_hours: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const company_id = c.get('auth')?.company_id || 'mooving-default';
    const token = c.env.CLOCKIFY_API_TOKEN;
    
    if (!token) {
      throw new Error('Falta configurar CLOCKIFY_API_TOKEN en el entorno.');
    }

    const BASE_URL = "https://api.clockify.me/api/v1";
    const REPORTS_URL = "https://reports.api.clockify.me/v1";

    // 1. Obtener workspace "Mooving Tech"
    const wsRes = await fetch(`${BASE_URL}/workspaces`, { headers: { 'X-Api-Key': token } });
    if (!wsRes.ok) throw new Error(`Clockify API error (workspaces): ${wsRes.status}`);
    const workspaces = await wsRes.json() as any[];
    
    let targetWs = workspaces.find(w => w.name.toLowerCase().includes("mooving tech"));
    if (!targetWs && workspaces.length > 0) {
      targetWs = workspaces[0]; // fallback al primero
    }
    if (!targetWs) {
      throw new Error('No se encontró ningún workspace en Clockify.');
    }

    let inserted = 0;
    let total_hours = 0;
    let page = 1;
    let hasMore = true;

    // Cache de IDs generados (Clockify Name -> Local ID)
    const empCache: Record<string, string> = {};
    const cliCache: Record<string, string> = {};
    const projCache: Record<string, string> = {};

    const sanitizeId = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    while (hasMore) {
      const reportRes = await fetch(`${REPORTS_URL}/workspaces/${targetWs.id}/reports/detailed`, {
        method: "POST",
        headers: { 'X-Api-Key': token, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateRangeStart: "2020-01-01T00:00:00.000Z",
          dateRangeEnd: new Date().toISOString(),
          detailedFilter: { page, pageSize: 1000 }
        })
      });

      if (!reportRes.ok) throw new Error(`Clockify API error (reports): ${reportRes.status}`);
      const report = await reportRes.json() as any;
      const entries = report.timeentries || [];

      if (entries.length === 0) {
        hasMore = false;
        break;
      }

      for (const entry of entries) {
        const id = 'clk_' + entry._id;
        const duration_decimal = (entry.timeInterval?.duration || 0) / 3600;
        if (duration_decimal <= 0) continue;

        const dateStr = entry.timeInterval?.start ? entry.timeInterval.start.split('T')[0] : new Date().toISOString().split('T')[0];
        
        const employee_name = entry.userName || 'Desconocido';
        if (!empCache[employee_name]) empCache[employee_name] = sanitizeId(employee_name);
        
        const client_name = entry.clientName || 'Sin Cliente';
        if (!cliCache[client_name]) cliCache[client_name] = sanitizeId(client_name);
        
        const project_name = entry.projectName || 'Sin Proyecto';
        if (!projCache[project_name]) projCache[project_name] = sanitizeId(project_name);

        const desc = entry.description || '';
        
        let work_type = 'project';
        const lowerDesc = desc.toLowerCase();
        if (project_name.toLowerCase().includes('interna') || client_name.toLowerCase().includes('mooving')) {
          work_type = 'internal';
          if (lowerDesc.includes('daily') || lowerDesc.includes('reunión') || lowerDesc.includes('weekly')) {
            work_type = 'meeting';
          }
        }

        try {
          // Usamos INSERT OR IGNORE para no duplicar horas si ya existen
          const res = await db.prepare(`
            INSERT OR IGNORE INTO time_records (
              id, company_id, employee_id, employee_name, client_id, client_name,
              project_id, project_name, duration_decimal, duration_hours, duration_minutes,
              date, work_type, description, source, is_billable
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            id, company_id, empCache[employee_name], employee_name,
            cliCache[client_name], client_name, projCache[project_name], project_name,
            duration_decimal, Math.floor(duration_decimal), Math.round((duration_decimal % 1) * 60),
            dateStr, work_type, desc, 'clockify', work_type === 'project' ? 1 : 0
          ).run();
          
          // result.changes es 1 si se insertó, 0 si fue ignorado
          if (res.meta.changes > 0) {
            inserted++;
            total_hours += duration_decimal;
          }
        } catch (err) {
          console.error('Error inserting clockify sync record:', err);
        }
      }

      page++;
    }

    return {
      success: true,
      message: `Se sincronizó el histórico completo de Clockify para el tenant ${company_id}. Se insertaron ${inserted} nuevos registros.`,
      records_inserted: inserted,
      total_hours_inserted: total_hours,
      source: 'clockify'
    };
  },

  sync_zendesk_tickets: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const company_id = c.get('auth')?.company_id || 'mooving-default';
    const subdomain = c.env.ZENDESK_SUBDOMAIN;
    const email = c.env.ZENDESK_EMAIL;
    const token = c.env.ZENDESK_API_TOKEN;

    if (!subdomain || !email || !token) {
      throw new Error('Faltan credenciales de Zendesk en las variables de entorno (ZENDESK_SUBDOMAIN, ZENDESK_EMAIL, ZENDESK_API_TOKEN).');
    }

    const authStr = btoa(`${email}/token:${token}`);
    const url = `https://${subdomain}.zendesk.com/api/v2/search.json?query=type:ticket status:solved&include=users`;

    let zendeskData;
    try {
      const resp = await fetch(url, {
        headers: {
          'Authorization': `Basic ${authStr}`,
          'Accept': 'application/json'
        }
      });
      if (!resp.ok) {
        throw new Error(`Zendesk API error: ${resp.status} ${resp.statusText}`);
      }
      zendeskData = await resp.json() as any;
    } catch (err: any) {
      console.error('Error fetching from Zendesk:', err);
      throw new Error('No se pudo conectar con Zendesk: ' + err.message);
    }

    const tickets = zendeskData.results || [];
    const usersList: any[] = zendeskData.users || [];
    const usersMap = new Map<number, { name: string; email: string }>();
    usersList.forEach(u => {
      if (u.id) {
        usersMap.set(u.id, { name: u.name || 'Agente Zendesk', email: u.email || '' });
      }
    });

    // Fetch existing employees & aliases for smart matching
    const empRes = await db.prepare(`SELECT id, name, email FROM employees WHERE company_id = ?`).bind(company_id).all();
    const existingEmployees = (empRes.results || []) as any[];
    
    const aliasRes = await db.prepare(`SELECT alias_email, alias_name, employee_id FROM employee_aliases WHERE company_id = ?`).bind(company_id).all();
    const existingAliases = (aliasRes.results || []) as any[];

    let inserted = 0;
    let total_hours = 0;

    for (const ticket of tickets) {
      const id = 'zen_' + ticket.id;
      const duration = 1.0; // 1h por ticket resuelto
      const desc = `Resolución Ticket #${ticket.id} [Zendesk]: ${ticket.subject}`;
      const dateStr = ticket.updated_at ? ticket.updated_at.split('T')[0] : new Date().toISOString().split('T')[0];

      // Resolve assignee
      const assigneeInfo = ticket.assignee_id ? usersMap.get(ticket.assignee_id) : null;
      const assigneeEmail = (assigneeInfo?.email || '').toLowerCase().trim();
      const assigneeName = (assigneeInfo?.name || 'Agente Soporte').trim();

      let targetEmpId = '';
      let targetEmpName = '';

      // 1. Check exact email match in employees
      if (assigneeEmail) {
        const matchByEmail = existingEmployees.find(e => (e.email || '').toLowerCase().trim() === assigneeEmail);
        if (matchByEmail) {
          targetEmpId = matchByEmail.id;
          targetEmpName = matchByEmail.name;
        }
      }

      // 2. Check alias table
      if (!targetEmpId && assigneeEmail) {
        const matchAlias = existingAliases.find(a => (a.alias_email || '').toLowerCase().trim() === assigneeEmail);
        if (matchAlias) {
          const emp = existingEmployees.find(e => e.id === matchAlias.employee_id);
          if (emp) {
            targetEmpId = emp.id;
            targetEmpName = emp.name;
          }
        }
      }

      // 3. Check exact name match in employees
      if (!targetEmpId && assigneeName) {
        const matchByName = existingEmployees.find(e => (e.name || '').toLowerCase().trim() === assigneeName.toLowerCase());
        if (matchByName) {
          targetEmpId = matchByName.id;
          targetEmpName = matchByName.name;
        }
      }

      // Fallback: Use assignee name or email directly if unlinked
      if (!targetEmpId) {
        targetEmpId = assigneeEmail ? `zen_user_${assigneeEmail.replace(/[^a-zA-Z0-9]/g, '_')}` : `zen_agent_${ticket.assignee_id || 'soporte'}`;
        targetEmpName = assigneeName || assigneeEmail || 'Agente Soporte';
      }

      try {
        await db.prepare(`
          INSERT OR IGNORE INTO time_records (
            id, company_id, employee_id, employee_name, client_id, client_name,
            project_id, project_name, duration_decimal, duration_hours, duration_minutes,
            date, work_type, description, source
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          id, company_id, targetEmpId, targetEmpName,
          'cli_varios', 'Varios', 'proj_support', 'Soporte Técnico',
          duration, Math.floor(duration), Math.round((duration % 1) * 60),
          dateStr, 'other', desc, 'zendesk'
        ).run();
        inserted++;
        total_hours += duration;
      } catch (err) {
        console.error('Error inserting zendesk sync record:', err);
      }
    }

    return {
      success: true,
      message: `Tickets de soporte procesados e importados de Zendesk para el tenant ${company_id}.`,
      records_fetched: tickets.length,
      records_inserted: inserted,
      total_hours: total_hours,
      source: 'zendesk'
    };
  },

  get_unlinked_external_users: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const company_id = c.get('auth')?.company_id || 'mooving-default';

    // Query time_records with external sources (zendesk/clockify) that don't match any employee ID in employees table
    // Tenant-scoped JOIN: match only employees of the same company_id so a homonym
    // in another tenant cannot make a genuinely-unlinked user look linked (or vice versa).
    const { results } = await db.prepare(`
      SELECT DISTINCT tr.employee_id, tr.employee_name, tr.source
      FROM time_records tr
      LEFT JOIN employees e ON (tr.employee_id = e.id OR tr.employee_name = e.name) AND e.company_id = tr.company_id
      WHERE tr.company_id = ? AND tr.source IN ('zendesk', 'clockify') AND e.id IS NULL
    `).bind(company_id).all();

    const aliasesRes = await db.prepare(`
      SELECT alias_email, alias_name, employee_id FROM employee_aliases WHERE company_id = ?
    `).bind(company_id).all();

    return {
      success: true,
      unlinked_users: results || [],
      existing_aliases: aliasesRes.results || [],
      timestamp: new Date().toISOString()
    };
  },

  link_external_user: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const company_id = c.get('auth')?.company_id || 'mooving-default';
    const { alias_identifier, target_employee_id } = params;

    if (!alias_identifier || !target_employee_id) {
      throw new Error('Faltan parámetros requeridos: alias_identifier y target_employee_id.');
    }

    // Get official employee
    const emp = await db.prepare(`SELECT id, name, email FROM employees WHERE id = ? AND company_id = ?`).bind(target_employee_id, company_id).first();
    if (!emp) {
      throw new Error('Empleado objetivo no encontrado.');
    }

    const aliasId = 'alias_' + crypto.randomUUID().substring(0, 8);
    const aliasEmail = alias_identifier.includes('@') ? alias_identifier.toLowerCase().trim() : '';
    const aliasName = alias_identifier;

    // Save alias mapping — dedupe by (company_id, alias). The employee_aliases table
    // (migration 0014) has no UNIQUE index on the alias columns (only the random PK id),
    // so INSERT OR REPLACE cannot dedupe and would pile up a new row on every call.
    // Use an idempotent delete-then-insert keyed by the tenant + alias identity instead.
    await db.prepare(`
      DELETE FROM employee_aliases
      WHERE company_id = ? AND alias_email = ? AND alias_name = ?
    `).bind(company_id, aliasEmail, aliasName).run();

    await db.prepare(`
      INSERT INTO employee_aliases (id, company_id, alias_email, alias_name, employee_id)
      VALUES (?, ?, ?, ?, ?)
    `).bind(aliasId, company_id, aliasEmail, aliasName, emp.id).run();

    // Update historical time_records for this external identity using EXACT (case-insensitive)
    // equality on employee_id/employee_name, scoped to the tenant. A previous LIKE %alias%
    // match could mass-reassign records of unrelated employees when the alias was short/common.
    const aliasLower = alias_identifier.toLowerCase();
    const updateResult = await db.prepare(`
      UPDATE time_records
      SET employee_id = ?, employee_name = ?
      WHERE company_id = ? AND (
        LOWER(employee_id) = ? OR LOWER(employee_name) = ?
      )
    `).bind(emp.id, emp.name, company_id, aliasLower, aliasLower).run();

    return {
      success: true,
      message: `Alias "${alias_identifier}" vinculado exitosamente con el empleado ${emp.name}.`,
      updated_records: updateResult.meta?.changes || 0,
      timestamp: new Date().toISOString()
    };
  },

  audit_timesheet: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const company_id = c.get('auth')?.company_id || 'mooving-default';
    
    // Buscamos empleados con exceso de horas en un mismo día (> 12 horas)
    const { results } = await db.prepare(`
      SELECT employee_name, date, SUM(duration_decimal) as total_hours
      FROM time_records
      WHERE company_id = ?
      GROUP BY employee_id, date
      HAVING total_hours > 12
      ORDER BY date DESC
    `).bind(company_id).all();

    const anomalies = results.map((r: any) => ({
      issue: `Exceso de ${Number(r.total_hours).toFixed(1)} horas diarias el ${r.date}`,
      user: r.employee_name
    }));

    return {
      success: true,
      status: anomalies.length > 0 ? 'requires_review' : 'clean',
      anomalies_found: anomalies
    };
  },

  send_inactivity_alerts: async (params: any, c: HonoContext) => {
    // Umbral de inactividad en días (default 3, o el parámetro recibido).
    const days = Number(params.days ?? params.inactive_days ?? params.days_threshold) || DEFAULT_INACTIVITY_DAYS;

    // Cálculo REAL de inactivos (compartido con get_inactivity_preview).
    const { inactive: inactiveAll, cutoffStr, company_id } = await computeInactiveEmployees(c, days);

    // U2: si el llamador especifica destinatarios puntuales (ids o emails) —p.ej.
    // el botón "enviar recordatorio a X" del banner manda { recipients: [id] }—
    // acotamos la alerta SÓLO a esos empleados. Sin este filtro, un envío puntual
    // disparaba mails reales a TODOS los inactivos, no sólo al seleccionado.
    const recipientList: string[] = Array.isArray(params.recipients) ? params.recipients : [];
    const recipientSet = new Set(recipientList.map((r) => String(r).toLowerCase().trim()).filter(Boolean));
    const inactive = recipientSet.size > 0
      ? inactiveAll.filter((e) =>
          recipientSet.has(String(e.employee_id).toLowerCase()) ||
          (!!e.email && recipientSet.has(String(e.email).toLowerCase()))
        )
      : inactiveAll;

    // Nadie inactivo (o ningún destinatario seleccionado coincide): no se envía nada.
    if (inactive.length === 0) {
      return {
        success: true,
        sent: false,
        alerts_sent: 0,
        inactive_count: 0,
        inactive_employees: [],
        days_threshold: days,
        cutoff_date: cutoffStr,
        provider: 'resend',
        message: `No se detectaron empleados inactivos en los últimos ${days} días. No se enviaron alertas.`,
        timestamp: new Date().toISOString(),
      };
    }

    // Proveedor PRIORITARIO: Resend. Si no hay RESEND_API_KEY, NO mentimos: devolvemos
    // la lista real de inactivos con sent:false y el motivo, sin inventar ningún envío.
    const resendKey = (c.env.RESEND_API_KEY || '').trim();
    if (!resendKey) {
      return {
        success: true,
        sent: false,
        reason: 'RESEND_API_KEY no configurada',
        alerts_sent: 0,
        inactive_count: inactive.length,
        inactive_employees: inactive,
        days_threshold: days,
        cutoff_date: cutoffStr,
        provider: 'resend',
        message: `RESEND_API_KEY no configurada: no se envió ninguna alerta. Inactivos detectados en los últimos ${days} días: ${inactive.length}.`,
        timestamp: new Date().toISOString(),
      };
    }

    // Remitente configurable; fallback a alertas@moovingtech.com.
    const fromEmail = (c.env.ALERT_FROM_EMAIL || ALERT_FROM_FALLBACK).trim();
    const fromHeader = `Mooving Tech <${fromEmail}>`;

    let alertsSent = 0;
    const failed: string[] = [];

    // Plantilla editable de inactividad (override del tenant o default). Se carga
    // una sola vez y se reutiliza para cada empleado (mismo texto para todos).
    const inactivityTpl = await loadTemplate(c.env.DB, company_id, 'inactivity');

    // Envío REAL por Resend, un email por empleado inactivo. Contamos SÓLO lo que Resend confirma.
    for (const emp of inactive) {
      const to = emp.email
        || (emp.name ? `${String(emp.name).toLowerCase().replace(/\s+/g, '.')}@moovingtech.com` : '');
      if (!to) {
        failed.push(`${emp.name || emp.employee_id}: sin email`);
        continue;
      }

      const { subject, body } = buildInactivityEmail(emp, days, inactivityTpl);
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ from: fromHeader, to: [to], subject, text: body }),
        });

        if (res.ok || res.status === 200 || res.status === 201 || res.status === 202) {
          alertsSent++;
        } else {
          const errText = await res.text().catch(() => '');
          failed.push(`${emp.name} (${to}): HTTP ${res.status}${errText ? ` — ${errText}` : ''}`);
        }
      } catch (err: any) {
        failed.push(`${emp.name} (${to}): ${err?.message || 'Error de envío'}`);
      }
    }

    const sent = alertsSent > 0;
    return {
      success: true,
      sent,
      alerts_sent: alertsSent,
      inactive_count: inactive.length,
      inactive_employees: inactive,
      days_threshold: days,
      cutoff_date: cutoffStr,
      provider: 'resend',
      from: fromEmail,
      failed_alerts: failed,
      message: sent
        ? `Se enviaron ${alertsSent} alertas de inactividad reales vía Resend (de ${inactive.length} inactivos detectados en los últimos ${days} días).`
        : `No se pudo enviar ninguna alerta vía Resend. Inactivos detectados: ${inactive.length}. Detalle: ${failed.join(' — ') || 'sin destinatarios válidos'}.`,
      timestamp: new Date().toISOString(),
    };
  },

  // get_inactivity_preview — Vista PREVIA (no envía nada) de las alertas de inactividad.
  // Devuelve la lista real de empleados inactivos (id, name, email, last_record_date,
  // days_inactive) y el CONTENIDO exacto del email que recibiría cada uno (asunto +
  // cuerpo), para que el C-level revise qué se mandaría antes de disparar
  // send_inactivity_alerts. Usa la MISMA lógica de cálculo y el MISMO cuerpo de email.
  get_inactivity_preview: async (params: any, c: HonoContext) => {
    const days = Number(params.days ?? params.inactive_days ?? params.days_threshold) || DEFAULT_INACTIVITY_DAYS;
    const { inactive, cutoffStr, company_id } = await computeInactiveEmployees(c, days);

    // Misma plantilla editable (override o default) que usa el envío real.
    const inactivityTpl = await loadTemplate(c.env.DB, company_id, 'inactivity');

    const inactive_employees = inactive.map((emp) => {
      const to = emp.email
        || (emp.name ? `${String(emp.name).toLowerCase().replace(/\s+/g, '.')}@moovingtech.com` : '');
      const { subject, body } = buildInactivityEmail(emp, days, inactivityTpl);
      return {
        employee_id: emp.employee_id,
        name: emp.name,
        email: emp.email,
        last_record_date: emp.last_record_date,
        days_inactive: emp.days_inactive,
        to,
        email_subject: subject,
        email_body: body,
      };
    });

    return {
      success: true,
      sent: false,
      preview: true,
      days_threshold: days,
      cutoff_date: cutoffStr,
      inactive_count: inactive_employees.length,
      inactive_employees,
      message: `Vista previa: ${inactive_employees.length} empleado(s) inactivo(s) en los últimos ${days} días. No se envió ninguna alerta.`,
      timestamp: new Date().toISOString(),
    };
  },

  write_time_records: async (params: any, c: HonoContext) => {
    // Inserta datos en Cloudflare D1 clasificando el origen
    const { records, source } = params;
    const db = c.env.DB;
    const company_id = c.get('auth')?.company_id || 'mooving-default';
    
    if (!records || !Array.isArray(records)) {
      throw new Error('No records provided');
    }
    
    let inserted = 0;
    for (const record of records) {
        const id = crypto.randomUUID();
        await db.prepare(`
          INSERT INTO time_records (
            id, company_id, employee_id, employee_name, client_id, client_name,
            project_id, project_name, duration_decimal, duration_hours, duration_minutes,
            date, work_type, description, source
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          id, company_id, record.employee_id, record.employee_name,
          record.client_id, record.client_name, record.project_id, record.project_name,
          record.duration_decimal, Math.floor(record.duration_decimal), Math.round((record.duration_decimal % 1) * 60),
          record.date, record.work_type, record.description || '', source || 'senda_ai'
        ).run();
        inserted++;
    }
    
    return {
      success: true,
      inserted_count: inserted,
      source: source || 'senda_ai',
      message: 'Datos auditados guardados con éxito en la base de datos (Cloudflare D1).'
    };
  },

  parse_natural_language_hours: async (params: any, c: HonoContext) => {
    const { text } = params;
    const db = c.env.DB;
    const company_id = c.get('auth')?.company_id || 'mooving-default';

    if (!text) {
      throw new Error('El texto es requerido para procesar.');
    }
    
    const textLower = text.toLowerCase();
    
    let employee_id = 'emp_monica';
    let employee_name = 'monica.aieta';
    let client_id = '';
    let client_name = '';
    let project_id = '';
    let project_name = '';
    let duration = 4.0;
    let work_type = 'project';
    let description = text;

    // Fetch master data from DB
    const employeesReq = await db.prepare('SELECT id, name FROM employees WHERE company_id = ?').bind(company_id).all();
    const clientsReq = await db.prepare('SELECT id, name FROM clients WHERE company_id = ?').bind(company_id).all();
    const projectsReq = await db.prepare('SELECT id, name, client_id FROM projects WHERE company_id = ?').bind(company_id).all();

    const employees = employeesReq.results || [];
    const clients = clientsReq.results || [];
    const projects = projectsReq.results || [];

    // Extract employee
    let foundEmp = false;
    const textWords = textLower.split(/\s+/);
    for (const emp of employees) {
      const nameParts = (emp.name as string).toLowerCase().split(/[._\s]/);
      for (const part of nameParts) {
        if (part.length > 2 && textWords.some(w => part.startsWith(w) || w.startsWith(part))) {
          employee_id = emp.id as string;
          employee_name = emp.name.toLowerCase().replace(/\s+/g, '.');
          foundEmp = true;
          break;
        }
      }
      if (foundEmp) break;
    }

    // Extract client dynamically
    for (const cli of clients) {
      if (textLower.includes((cli.name as string).toLowerCase())) {
        client_id = cli.id as string;
        client_name = cli.name as string;
        break;
      }
    }
    
    if (!client_id) {
      // Fallback
      if (textLower.includes('senda') || textLower.includes('core')) {
        client_id = 'cli_mooving';
        client_name = 'Mooving';
      } else if (textLower.includes('interno')) {
        client_id = 'cli_interno';
        client_name = 'Interno';
      } else {
        throw new Error('No pude identificar a qué cliente o proyecto corresponden las horas. Por favor, especifica el nombre del cliente que aparece en tu base de datos.');
      }
    }

    // Extract project dynamically
    const availableProjects = projects.filter((p: any) => p.client_id === client_id);
    for (const proj of availableProjects) {
      const projName = (proj.name as string).toLowerCase();
      if (textLower.includes(projName) || projName.split(' ').some(p => p.length > 3 && textLower.includes(p))) {
        project_id = proj.id as string;
        project_name = proj.name as string;
        break;
      }
    }
    
    if (!project_id && availableProjects.length > 0) {
      project_id = availableProjects[0].id as string;
      project_name = availableProjects[0].name as string;
    }

    // Extract duration (e.g. 5.5h, 4h, 6 horas)
    const durationMatch = textLower.match(/(\d+(\.\d+)?)\s*(h|hora)/);
    if (durationMatch) {
      duration = parseFloat(durationMatch[1]);
    }

    // Work type detection
    if (textLower.includes('reunion') || textLower.includes('reunión') || textLower.includes('meeting') || textLower.includes('call')) {
      work_type = 'meeting';
    } else if (textLower.includes('soporte') || textLower.includes('incidente') || textLower.includes('ticket') || textLower.includes('zendesk')) {
      work_type = 'other';
    } else if (textLower.includes('capacitacion') || textLower.includes('capacitación') || textLower.includes('training')) {
      work_type = 'training';
    } else if (textLower.includes('interna') || textLower.includes('internal')) {
      work_type = 'internal';
    }

    return {
      success: true,
      parsed: {
        employee_id,
        employee_name,
        client_id,
        client_name,
        project_id,
        project_name,
        duration_decimal: duration,
        date: new Date().toISOString().split('T')[0],
        work_type,
        description
      }
    };
  },

  /**
   * senda_widget_action
   * Forwards a user message to the Senda AI API and returns the text response.
   * Useful for conversational queries from the widget that need to be logged
   * or pre-processed by the backend.
   *
   * Params:
   *   message      (string)  – The user's natural-language message.
   *   company_id   (string)  – Tenant identifier for isolation.
   *   space        (string)  – Senda space (defaults to "tramia").
   */
  senda_widget_action: async (params: any, c: HonoContext) => {
    const { message, space } = params;
    const company_id = c.get('auth')?.company_id || 'mooving-default';
    const sendaApiKey = c.env.SENDA_API_KEY;
    const sendaBaseUrl = c.env.SENDA_BASE_URL || 'https://sendaqa.telar.ai/api';

    if (!message) {
      throw new Error('El campo "message" es requerido.');
    }
    if (!sendaApiKey) {
      throw new Error('SENDA_API_KEY no está configurada en las variables de entorno del Worker.');
    }

    const targetSpace = space || 'tramia';

    // Call Senda chat completions endpoint (non-streaming)
    const res = await fetch(`${sendaBaseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendaApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        space: targetSpace,
        stream: false,
        metadata: { company_id },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Error al contactar Senda (${res.status}): ${errText}`);
    }

    const data = await res.json() as any;
    const responseText = data.text || data.content || data.message || JSON.stringify(data);

    return {
      success: true,
      company_id,
      space: targetSpace,
      response: responseText,
    };
  },

  /**
   * senda_bulk_load
   * Publicly-callable wrapper around create_bulk_time_records.
   * Intended for use by both the Senda widget and the weekly cron trigger.
   *
   * Params:
   *   company_id      (string)   – Tenant identifier (REQUIRED for isolation).
   *   employee_id     (string)   – Target employee ID.
   *   client_id       (string)   – Client ID.
   *   project_id      (string)   – Project ID.
   *   description     (string)   – Entry description.
   *   hours_per_day   (number)   – Hours to log per qualifying day.
   *   start_date      (string)   – YYYY-MM-DD start date (inclusive).
   *   end_date        (string)   – YYYY-MM-DD end date (inclusive, max 31 days ahead).
   *   days_of_week    (number[]) – Optional. Day numbers (0=Sun…6=Sat). Default: Mon–Fri.
   */
  senda_bulk_load: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const {
      employee_id,
      client_id,
      project_id,
      description,
      start_date,
      end_date,
      days_of_week,
    } = params;

    const company_id = c.get('auth')?.company_id || 'mooving-default';
    const hours_per_day = Number(params.hours_per_day) || 4;

    if (!employee_id || !client_id || !project_id || !start_date || !end_date) {
      throw new Error(
        'Los campos employee_id, client_id, project_id, start_date y end_date son requeridos.'
      );
    }

    // Delegate to the existing create_bulk_time_records tool
    return (TOOL_REGISTRY as any).create_bulk_time_records(
      {
        company_id,
        employee_id,
        client_id,
        project_id,
        duration_decimal: hours_per_day,
        work_type: params.work_type || 'project',
        description: description || 'Carga masiva via Senda',
        start_date,
        end_date,
        days_of_week,
      },
      c
    );
  },

  get_email_reminder_drafts: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const company_id = c.get('auth')?.company_id || 'mooving-default';
    const targetMonth = params.month || new Date().toISOString().substring(0, 7); // e.g. "2026-07"
    const includeInactive = !!params.include_inactive;

    // Fetch settings for default CC
    let defaultCc = 'Eddie Rodriguez Von der Becke <eddie.rodriguez@moovingtech.com>; Julieta Albina <julieta.albina@moovingtech.com>';
    try {
      const settingRow = await db.prepare('SELECT default_cc FROM email_reminder_settings WHERE company_id = ?')
        .bind(company_id).first();
      if (settingRow?.default_cc) defaultCc = settingRow.default_cc as string;
    } catch {
      // Table fallback
    }

    if (params.custom_cc) {
      defaultCc = params.custom_cc;
    }

    // 1. Fetch employees
    let empQuery = 'SELECT * FROM employees WHERE company_id = ?';
    if (!includeInactive) {
      empQuery += ' AND is_active = 1';
    }
    const { results: employees } = await db.prepare(empQuery).bind(company_id).all();

    // 2. Horas del mes por identificador de origen + alias, con match ROBUSTO.
    // Los registros de Clockify/Zendesk suelen quedar bajo un identificador con
    // otro formato que el de la ficha del empleado ("juan.cruz" vs "Juan Cruz"
    // vs "juan-cruz"), por lo que normalizamos (minúsculas, sin acentos, sin
    // separadores) y además resolvemos vía employee_aliases. Sin esto varias
    // personas mostraban 0h en el borrador aunque tuvieran horas cargadas.
    const { results: records } = await db.prepare(
      'SELECT employee_id, employee_name, SUM(duration_decimal) as total_hours FROM time_records WHERE company_id = ? AND date LIKE ? GROUP BY employee_id, employee_name'
    ).bind(company_id, `${targetMonth}-%`).all();

    let aliasRows: any[] = [];
    try {
      const aliasRes = await db.prepare(
        'SELECT alias_email, alias_name, employee_id FROM employee_aliases WHERE company_id = ?'
      ).bind(company_id).all();
      aliasRows = (aliasRes.results || []) as any[];
    } catch { /* tabla de alias opcional */ }

    // Resolvedor robusto de horas (id exacto, nombre/id normalizado, local-part
    // del email, o alias). Compartido con el cron mensual para calcular idéntico.
    const resolveHours = buildEmployeeHoursResolver((records || []) as any[], aliasRows);

    const monthIdx = parseInt(targetMonth.split('-')[1], 10) - 1;
    const yearStr = targetMonth.split('-')[0];
    const monthNames = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    const monthName = monthNames[monthIdx] || 'este mes';
    const fullMonthYearStr = `${monthName} ${yearStr}`;
    const dateTodayStr = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // Plantillas editables (override del tenant o default). Se cargan una sola vez
    // y se renderizan por empleado: reminder_hours cuando hay horas, reminder_zero si 0.
    const tplHours = await loadTemplate(db, company_id, 'reminder_hours');
    const tplZero = await loadTemplate(db, company_id, 'reminder_zero');

    const drafts: any[] = [];
    let reportText = `Borradores de mail — Horas registradas, ${fullMonthYearStr}\nUn mail por persona, listo para copiar y pegar. Datos: Clockify, al ${dateTodayStr}.\n\n`;

    (employees || []).forEach((emp: any, index: number) => {
      const email = emp.email || `${emp.name.toLowerCase().replace(/\s+/g, '.')}@moovingtech.com`;
      const hours = resolveHours(emp);
      
      const cleanName = emp.name.replace(/\./g, ' ').trim();
      const nameParts = cleanName.split(/\s+/).map((p: string) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase());
      const fullName = nameParts.join(' ');
      const firstName = nameParts[0] || fullName;
      const hoursFormatted = hours.toFixed(2).replace('.', ',');

      // Plantilla del caso + interpolación. Variables: firstName, hours (ya formateado
      // como hoursFormatted) y month (nombre del mes actual, monthName).
      const tpl = hours > 0 ? tplHours : tplZero;
      const tplVars = { firstName, hours: hoursFormatted, month: monthName };
      const subject = renderTemplate(tpl.subject, tplVars);
      const body = renderTemplate(tpl.body, tplVars);

      drafts.push({
        number: index + 1,
        employee_id: emp.id,
        employee_name: fullName,
        email,
        cc: defaultCc,
        subject,
        body,
        hours,
        hours_formatted: hoursFormatted,
        is_active: emp.is_active !== 0
      });

      reportText += `${index + 1}. ${fullName}\n`;
      reportText += `Para: ${email}\n`;
      reportText += `CC: ${defaultCc}\n`;
      reportText += `Asunto: ${subject}\n`;
      reportText += `${body}\n\n`;
    });

    return {
      month: targetMonth,
      month_name: fullMonthYearStr,
      default_cc: defaultCc,
      total_employees: drafts.length,
      drafts,
      full_report_text: reportText.trim()
    };
  },

  send_email_reminders: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const company_id = c.get('auth')?.company_id || 'mooving-default';
    const { recipients, custom_cc, month, sync_clockify_first } = params;

    if (!Array.isArray(recipients) || recipients.length === 0) {
      throw new Error('Debes especificar al menos un destinatario para el envío de recordatorios.');
    }

    try {
      await db.prepare(`
        INSERT INTO email_reminder_settings (id, company_id, default_cc, last_sent_at)
        VALUES (?, ?, ?, datetime('now'))
        ON CONFLICT(company_id) DO UPDATE SET last_sent_at = datetime('now'), default_cc = coalesce(?, default_cc)
      `).bind(crypto.randomUUID().split('-')[0], company_id, custom_cc || null, custom_cc || null).run();
    } catch {
      // Table fallback
    }

    // Optional: sync Clockify before sending if explicitly requested (e.g. background cron)
    let clockifySyncResult = null;
    if (sync_clockify_first === true) {
      const clockifyToken = c.env.CLOCKIFY_API_TOKEN;
      if (clockifyToken) {
        try {
          console.log(`[send_email_reminders] Syncing Clockify for ${company_id} before sending...`);
          clockifySyncResult = await (TOOL_REGISTRY as any).sync_clockify_hours({ company_id }, c);
          console.log(`[send_email_reminders] Clockify sync: ${clockifySyncResult?.records_inserted || 0} new records`);
        } catch (err) {
          console.error('[send_email_reminders] Clockify sync failed (continuing):', err);
          clockifySyncResult = { error: 'Sync failed, sending with existing data' };
        }
      }
    }

    const sendgridRaw = (c.env.SENDGRID_API_KEY || '').trim();
    const sendgridKey = sendgridRaw.startsWith('SG.') ? sendgridRaw : '';
    const resendKey = (c.env.RESEND_API_KEY || '').trim();
    const useMailChannels = (c.env.USE_MAILCHANNELS || 'true') === 'true'; // Default Cloudflare Workers Outbound Engine
    
    // Priority: Resend API -> SendGrid API (SG.xxx) -> Cloudflare MailChannels -> Mailto
    const providerName = resendKey 
      ? 'Resend API' 
      : (sendgridKey ? 'SendGrid API (v3)' : (useMailChannels ? 'Cloudflare MailChannels (Worker Nativo)' : 'Simulación / Mailto Interactivo'));
    
    // Remitente unificado: preferimos ALERT_FROM_EMAIL (notificaciones@mooving.cloud,
    // dominio verificado en Resend). RESEND_FROM_EMAIL/SENDGRID quedan sólo como
    // respaldo. Identidad neutral "Mooving Tech" (ya no un remitente personal).
    const fromEmailRaw = (c.env.ALERT_FROM_EMAIL || c.env.RESEND_FROM_EMAIL || c.env.SENDGRID_FROM_EMAIL || 'notificaciones@mooving.cloud').trim();
    const fromEmail = fromEmailRaw.includes('<') ? (fromEmailRaw.match(/<([^>]+)>/)?.[1] || fromEmailRaw) : fromEmailRaw;
    const fromName = 'Mooving Tech';
    const fromHeader = `${fromName} <${fromEmail}>`;
    
    let realEmailsSent = 0;
    const failedEmails: string[] = [];

    if (resendKey || sendgridKey || useMailChannels) {
      try {
        const draftsResult = await (TOOL_REGISTRY as any).get_email_reminder_drafts({ company_id, month, custom_cc }, c);
        const draftsMap: Record<string, any> = {};
        (draftsResult.drafts || []).forEach((d: any) => {
          draftsMap[d.employee_id] = d;
          if (d.email) draftsMap[d.email.toLowerCase()] = d;
        });

        for (const recipientId of recipients) {
          const d = draftsMap[recipientId] || draftsMap[recipientId.toLowerCase()];
          if (!d) {
            console.error(`[EmailProvider] Recipient not found in drafts: ${recipientId}`);
            failedEmails.push(`ID ${recipientId}: No encontrado en borradores`);
            continue;
          }

          try {
            const parsedCcStrings = (d.cc || custom_cc || '')
              .split(';')
              .map((s: string) => {
                const match = s.match(/<([^>]+)>/);
                const email = match ? match[1] : s.trim();
                return email.includes('@') ? email.trim() : null;
              })
              .filter(Boolean) as string[];

            let emailRes: Response;
            let currentProvider = providerName;

            if (resendKey) {
              // 1. Primary Provider: Resend API (Using moovingtech.cloud domain)
              const resendFrom = fromHeader;

              const resendPayload = {
                from: resendFrom,
                to: [d.email.trim()],
                ...(parsedCcStrings.length > 0 ? { cc: parsedCcStrings } : {}),
                subject: d.subject,
                text: d.body
              };

              emailRes = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${resendKey}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(resendPayload)
              });

              // Retry with onboarding@resend.dev if domain verification is still pending in Resend
              if (!emailRes.ok && emailRes.status === 403) {
                console.warn(`[Resend] Domain ${fromEmail} pending verification (403). Retrying with onboarding@resend.dev...`);
                const fallbackResendPayload = {
                  ...resendPayload,
                  from: 'Mooving Tech <onboarding@resend.dev>'
                };

                emailRes = await fetch('https://api.resend.com/emails', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${resendKey}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(fallbackResendPayload)
                });
                if (emailRes.ok) currentProvider = 'Resend API (onboarding@resend.dev)';
              }

              // Fallback to MailChannels if Resend domain is unverified for external recipient
              if (!emailRes.ok && (emailRes.status === 403 || emailRes.status === 422) && useMailChannels) {
                const resendErrText = await emailRes.text();
                console.warn(`[Resend] HTTP ${emailRes.status} (unverified domain). Falling back to Cloudflare MailChannels for ${d.email}... Error: ${resendErrText}`);
                
                const mcCcObjects = parsedCcStrings.map(email => ({ email }));
                const mailchannelsPayload = {
                  personalizations: [
                    {
                      to: [{ email: d.email.trim() }],
                      ...(mcCcObjects.length > 0 ? { cc: mcCcObjects } : {})
                    }
                  ],
                  from: {
                    email: fromEmail,
                    name: fromName
                  },
                  subject: d.subject,
                  content: [{ type: 'text/plain', value: d.body }]
                };

                const mcRes = await fetch('https://api.mailchannels.net/tx/v1/send', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(mailchannelsPayload)
                });

                if (mcRes.ok || mcRes.status === 200 || mcRes.status === 201 || mcRes.status === 202) {
                  emailRes = mcRes;
                  currentProvider = 'Cloudflare MailChannels (Fallback)';
                } else {
                  // Keep the original informative Resend error if MailChannels is also unverified
                  failedEmails.push(`${d.employee_name} (${d.email}): Resend requiere verificar el dominio moovingtech.com en resend.com/domains (Estado pendiente)`);
                  continue;
                }
              }
            } else if (sendgridKey) {
              // 2. Secondary Provider: SendGrid API
              const sgCcObjects = parsedCcStrings.map(email => ({ email }));
              const sendgridPayload: any = {
                personalizations: [
                  {
                    to: [{ email: d.email.trim() }],
                    ...(sgCcObjects.length > 0 ? { cc: sgCcObjects } : {}),
                    subject: d.subject
                  }
                ],
                from: { email: fromEmail, name: fromName },
                content: [{ type: 'text/plain', value: d.body }]
              };

              const authHeader = `Bearer ${sendgridKey}`;

              emailRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
                method: 'POST',
                headers: {
                  'Authorization': authHeader,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(sendgridPayload)
              });
            } else if (useMailChannels) {
              // 3. Tertiary Provider: Cloudflare MailChannels (Worker Nativo)
              const mcCcObjects = parsedCcStrings.map(email => ({ email }));
              const mailchannelsPayload = {
                personalizations: [
                  {
                    to: [{ email: d.email.trim() }],
                    ...(mcCcObjects.length > 0 ? { cc: mcCcObjects } : {})
                  }
                ],
                from: {
                  email: fromEmail,
                  name: fromName
                },
                subject: d.subject,
                content: [{ type: 'text/plain', value: d.body }]
              };

              emailRes = await fetch('https://api.mailchannels.net/tx/v1/send', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(mailchannelsPayload)
              });
            }

            if (emailRes.ok || emailRes.status === 200 || emailRes.status === 201 || emailRes.status === 202) {
              realEmailsSent++;
              console.log(`[${currentProvider}] ✅ Mail sent to ${d.email}`);
            } else {
              const errText = await emailRes.text();
              console.error(`[${currentProvider}] ❌ Failed for ${d.email}: HTTP ${emailRes.status} — ${errText}`);
              
              let friendlyErr = `HTTP ${emailRes.status}`;
              if (emailRes.status === 401 && currentProvider.includes('MailChannels')) {
                friendlyErr = 'Requiere registro TXT DNS (_mailchannels -> v=mc1 cfid=panel-horas-api.aietamonica.workers.dev) en Cloudflare DNS';
              } else if (emailRes.status === 403) {
                friendlyErr = 'Dominio de correo no verificado en proveedor transaccional';
              }
              
              failedEmails.push(`${d.employee_name} (${d.email}): ${friendlyErr}`);
            }
          } catch (recipientErr: any) {
            console.error(`[${providerName}] Error sending to ${d.email}:`, recipientErr);
            failedEmails.push(`${d.employee_name} (${d.email}): ${recipientErr.message || 'Error de envío'}`);
          }
        }
      } catch (err: any) {
        console.error(`[${providerName}] Error general procesando borradores:`, err);
        failedEmails.push(`Error de proceso: ${err.message}`);
      }
    }

    return {
      success: true,
      sent_count: recipients.length,
      real_emails_sent: realEmailsSent,
      failed_emails: failedEmails,
      clockify_sync: clockifySyncResult ? {
        synced: true,
        new_records: clockifySyncResult.records_inserted || 0,
      } : { synced: false },
      provider: providerName,
      message: providerName 
        ? (failedEmails.length > 0
          ? `Se enviaron ${realEmailsSent} de ${recipients.length} mails vía ${providerName}. ${failedEmails.length} fallaron: ${failedEmails.join(' — ')}`
          : `Se enviaron exitosamente ${realEmailsSent} recordatorios a través de ${providerName}.`)
        : `Se registraron exitosamente ${recipients.length} recordatorios para envío.`,
      timestamp: new Date().toISOString()
    };
  },

  configure_email_reminder_schedule: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const company_id = c.get('auth')?.company_id || 'mooving-default';
    const { default_cc, is_automated, cron_schedule } = params;

    const autoVal = is_automated ? 1 : 0;
    const ccVal = default_cc || 'Eddie Rodriguez Von der Becke <eddie.rodriguez@moovingtech.com>; Julieta Albina <julieta.albina@moovingtech.com>';
    const cronVal = cron_schedule || '0 9 27 * *';

    await db.prepare(`
      INSERT INTO email_reminder_settings (id, company_id, default_cc, is_automated, cron_schedule)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(company_id) DO UPDATE SET
        default_cc = ?,
        is_automated = ?,
        cron_schedule = ?,
        updated_at = datetime('now')
    `).bind(
      crypto.randomUUID().split('-')[0],
      company_id, ccVal, autoVal, cronVal,
      ccVal, autoVal, cronVal
    ).run();

    return {
      success: true,
      is_automated: !!autoVal,
      default_cc: ccVal,
      cron_schedule: cronVal,
      message: 'Configuración de automatización de recordatorios guardada exitosamente.'
    };
  },

  // get_email_templates — Devuelve los mensajes estándar editables (asunto + cuerpo)
  // de los TRES casos para la empresa del principal. Para cada caso entrega el
  // override guardado en email_templates si existe, o el texto por defecto
  // (DEFAULT_TEMPLATES) marcado con is_default:true. Siempre scopeado por el
  // company_id del principal (MT-02: tenant-from-principal).
  get_email_templates: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const company_id = c.get('auth')?.company_id || 'mooving-default';

    const templates = [];
    for (const template_key of TEMPLATE_KEYS) {
      const meta = TEMPLATE_META[template_key];
      const loaded = await loadTemplate(db, company_id, template_key);
      templates.push({
        template_key,
        label: meta.label,
        subject: loaded.subject,
        body: loaded.body,
        is_default: loaded.is_default,
        variables: meta.variables,
      });
    }

    return { templates };
  },

  // set_email_template — Guarda (upsert) el override de asunto/cuerpo de UN caso
  // para la empresa del principal. Dato de configuración: SÓLO admin puede
  // escribirlo (mismo patrón que set_employee_rate). Valida que template_key sea
  // uno de los tres casos y que asunto y cuerpo no estén vacíos. Siempre scopeado
  // por company_id del principal (MT-02: tenant-from-principal).
  set_email_template: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const auth = c.get('auth');
    const role = auth?.role || '';
    if (role !== 'admin') {
      return { success: false, error: 'No autorizado' };
    }

    const company_id = auth?.company_id || 'mooving-default';
    const { template_key } = params;

    if (!TEMPLATE_KEYS.includes(template_key)) {
      throw new Error(
        `template_key inválido: "${template_key}". Válidos: ${TEMPLATE_KEYS.join(', ')}.`
      );
    }

    const subject = String(params.subject ?? '').trim();
    const body = String(params.body ?? '').trim();
    if (!subject || !body) {
      throw new Error('El asunto y el cuerpo del mensaje son obligatorios y no pueden estar vacíos.');
    }

    await db.prepare(`
      INSERT INTO email_templates (id, company_id, template_key, subject, body, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(company_id, template_key) DO UPDATE SET
        subject = excluded.subject,
        body = excluded.body,
        updated_at = datetime('now')
    `).bind(
      crypto.randomUUID().replace(/-/g, '').slice(0, 16),
      company_id, template_key, subject, body
    ).run();

    return { success: true, template_key, subject, body, is_default: false };
  },
};

export const executeToolCall = async (toolName: string, params: any, c: HonoContext) => {
  const tool = (TOOL_REGISTRY as any)[toolName];
  if (!tool) {
    throw new Error(`Tool not found in registry: ${toolName}`);
  }
  return await tool(params, c);
};
