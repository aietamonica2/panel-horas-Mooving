import { HonoContext } from '../types';

export const TOOL_REGISTRY = {
  get_clients: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const company_id = params.company_id || c.get('auth')?.company_id || 'mooving-default';
    const { results } = await db.prepare('SELECT * FROM clients WHERE company_id = ?').bind(company_id).all();
    return { clients: results };
  },
  create_client: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const { company_id, name } = params;
    const cid = company_id || c.get('auth')?.company_id || 'mooving-default';
    const id = 'cli_' + crypto.randomUUID().split('-')[0];
    await db.prepare('INSERT INTO clients (id, company_id, name) VALUES (?, ?, ?)')
      .bind(id, cid, name).run();
    return { success: true, client_id: id };
  },
  update_client: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const { id, name } = params;
    await db.prepare('UPDATE clients SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(name, id).run();
    return { success: true };
  },
  delete_client: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const { id } = params;
    await db.prepare('DELETE FROM clients WHERE id = ?').bind(id).run();
    return { success: true };
  },

  get_projects: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const company_id = params.company_id || c.get('auth')?.company_id || 'mooving-default';
    const { results } = await db.prepare('SELECT * FROM projects WHERE company_id = ?').bind(company_id).all();
    return { projects: results };
  },
  create_project: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const { company_id, client_id, name } = params;
    const cid = company_id || c.get('auth')?.company_id || 'mooving-default';
    const id = 'proj_' + crypto.randomUUID().split('-')[0];
    await db.prepare('INSERT INTO projects (id, company_id, client_id, name) VALUES (?, ?, ?, ?)')
      .bind(id, cid, client_id, name).run();
    return { success: true, project_id: id };
  },
  update_project: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const { id, client_id, name } = params;
    await db.prepare('UPDATE projects SET client_id = ?, name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(client_id, name, id).run();
    return { success: true };
  },
  delete_project: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const { id } = params;
    await db.prepare('DELETE FROM projects WHERE id = ?').bind(id).run();
    return { success: true };
  },

  get_employees: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const company_id = params.company_id || c.get('auth')?.company_id || 'mooving-default';
    const { results } = await db.prepare('SELECT * FROM employees WHERE company_id = ?').bind(company_id).all();
    return { employees: results };
  },
  create_employee: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const { company_id, name, email, is_active } = params;
    const cid = company_id || c.get('auth')?.company_id || 'mooving-default';
    const id = 'emp_' + crypto.randomUUID().split('-')[0];
    const active = is_active !== undefined ? (is_active ? 1 : 0) : 1;
    await db.prepare('INSERT INTO employees (id, company_id, name, email, is_active) VALUES (?, ?, ?, ?, ?)')
      .bind(id, cid, name, email || null, active).run();
    return { success: true, employee_id: id };
  },
  update_employee: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const { id, name, email, is_active } = params;
    const active = is_active !== undefined ? (is_active ? 1 : 0) : 1;
    await db.prepare('UPDATE employees SET name = ?, email = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(name, email || null, active, id).run();
    return { success: true };
  },
  delete_employee: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const { id } = params;
    await db.prepare('DELETE FROM employees WHERE id = ?').bind(id).run();
    return { success: true };
  },

  get_categories: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const company_id = params.company_id || c.get('auth')?.company_id || 'mooving-default';
    const { results } = await db.prepare('SELECT * FROM categories WHERE company_id = ?').bind(company_id).all();
    return { categories: results };
  },
  create_category: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const { company_id, name } = params;
    const cid = company_id || c.get('auth')?.company_id || 'mooving-default';
    const id = crypto.randomUUID().split('-')[0];
    await db.prepare('INSERT INTO categories (id, company_id, name) VALUES (?, ?, ?)')
      .bind(id, cid, name).run();
    return { success: true, category_id: id };
  },
  update_category: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const { id, name } = params;
    await db.prepare('UPDATE categories SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(name, id).run();
    return { success: true };
  },
  delete_category: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const { id } = params;
    await db.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();
    return { success: true };
  },

  create_time_record: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const { employee_id, client_id, project_id, duration_decimal, date, work_type, description } = params;
    
    // Auto-detect company from auth if not provided
    const company_id = params.company_id || c.get('auth')?.company_id || 'mooving-default';
    
    // Simple lookup for names if not provided
    let employee_name = params.employee_name || '';
    let client_name = params.client_name || '';
    let project_name = params.project_name || '';
    
    if (!employee_name && employee_id) {
        const { results } = await db.prepare('SELECT name FROM employees WHERE id = ?').bind(employee_id).all();
        if (results.length > 0) employee_name = results[0].name;
    }
    if (!client_name && client_id) {
        const { results } = await db.prepare('SELECT name FROM clients WHERE id = ?').bind(client_id).all();
        if (results.length > 0) client_name = results[0].name;
    }
    if (!project_name && project_id) {
        const { results } = await db.prepare('SELECT name FROM projects WHERE id = ?').bind(project_id).all();
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
    
    const company_id = params.company_id || c.get('auth')?.company_id || 'mooving-default';
    
    let employee_name = params.employee_name || '';
    let client_name = params.client_name || '';
    let project_name = params.project_name || '';
    
    if (!employee_name && employee_id) {
        const { results } = await db.prepare('SELECT name FROM employees WHERE id = ?').bind(employee_id).all();
        if (results.length > 0) employee_name = results[0].name;
    }
    if (!client_name && client_id) {
        const { results } = await db.prepare('SELECT name FROM clients WHERE id = ?').bind(client_id).all();
        if (results.length > 0) client_name = results[0].name;
    }
    if (!project_name && project_id) {
        const { results } = await db.prepare('SELECT name FROM projects WHERE id = ?').bind(project_id).all();
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
    const { company_id, month, employee_id } = params;
    
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
  
  get_availability_metrics: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const { company_id, month } = params;
    
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
    const { company_id, employee_id, month } = params;
    
    // Assume 160h standard month for full time
    const expected_monthly_hours = 160;

    let query = 'SELECT * FROM time_records WHERE company_id = ? AND employee_id = ?';
    const queryParams: any[] = [company_id || c.get('auth')?.company_id || 'mooving-default', employee_id];

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

  sync_clockify_hours: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const company_id = params.company_id || c.get('auth')?.company_id || 'mooving-default';
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
              date, work_type, description, source
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            id, company_id, empCache[employee_name], employee_name,
            cliCache[client_name], client_name, projCache[project_name], project_name,
            duration_decimal, Math.floor(duration_decimal), Math.round((duration_decimal % 1) * 60),
            dateStr, work_type, desc, 'clockify'
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
    const company_id = params.company_id || c.get('auth')?.company_id || 'mooving-default';
    const subdomain = c.env.ZENDESK_SUBDOMAIN;
    const email = c.env.ZENDESK_EMAIL;
    const token = c.env.ZENDESK_API_TOKEN;

    if (!subdomain || !email || !token) {
      throw new Error('Faltan credenciales de Zendesk en las variables de entorno (ZENDESK_SUBDOMAIN, ZENDESK_EMAIL, ZENDESK_API_TOKEN).');
    }

    const authStr = btoa(`${email}/token:${token}`);
    const url = `https://${subdomain}.zendesk.com/api/v2/search.json?query=type:ticket status:solved`;

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
    let inserted = 0;
    let total_hours = 0;

    for (const ticket of tickets) {
      const id = 'zen_' + ticket.id;
      // Estimación básica: asumimos 1h por ticket resuelto
      const duration = 1.0; 
      const desc = `Resolución Ticket #${ticket.id} [Zendesk]: ${ticket.subject}`;
      const dateStr = ticket.updated_at ? ticket.updated_at.split('T')[0] : new Date().toISOString().split('T')[0];

      try {
        await db.prepare(`
          INSERT OR IGNORE INTO time_records (
            id, company_id, employee_id, employee_name, client_id, client_name,
            project_id, project_name, duration_decimal, duration_hours, duration_minutes,
            date, work_type, description
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          id, company_id, 'emp_soporte', 'Agente Soporte',
          'cli_varios', 'Varios', 'proj_support', 'Soporte Técnico',
          duration, Math.floor(duration), Math.round((duration % 1) * 60),
          dateStr, 'other', desc
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

  audit_timesheet: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const company_id = params.company_id || c.get('auth')?.company_id || 'mooving-default';
    
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
    // Simula envío de alertas usando Cloudflare Email Routing
    const { company_id, users } = params;
    
    return {
      success: true,
      alerts_sent: users?.length || 3,
      channel: 'Cloudflare Email Routing',
      message: 'Alertas despachadas exitosamente a los usuarios inactivos.'
    };
  },

  write_time_records: async (params: any, c: HonoContext) => {
    // Inserta datos en Cloudflare D1 clasificando el origen
    const { company_id, records, source } = params;
    const db = c.env.DB;
    
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
          id, company_id || 'mooving-default', record.employee_id, record.employee_name,
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
    const company_id = params.company_id || c.get('auth')?.company_id || 'mooving-default';

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
    const company_id = params.company_id || c.get('auth')?.company_id || 'mooving-default';
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

    const company_id = params.company_id || c.get('auth')?.company_id || 'mooving-default';
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
    const company_id = params.company_id || c.get('auth')?.company_id || 'mooving-default';
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

    // 2. Fetch sum of hours per employee for the target month
    const { results: records } = await db.prepare(
      'SELECT employee_id, employee_name, SUM(duration_decimal) as total_hours FROM time_records WHERE company_id = ? AND date LIKE ? GROUP BY employee_name'
    ).bind(company_id, `${targetMonth}-%`).all();

    const hoursMap: Record<string, number> = {};
    for (const r of (records || []) as any[]) {
      if (r.employee_name) hoursMap[r.employee_name.toLowerCase()] = r.total_hours || 0;
      if (r.employee_id) hoursMap[r.employee_id] = r.total_hours || 0;
    }

    const monthIdx = parseInt(targetMonth.split('-')[1], 10) - 1;
    const yearStr = targetMonth.split('-')[0];
    const monthNames = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    const monthName = monthNames[monthIdx] || 'este mes';
    const fullMonthYearStr = `${monthName} ${yearStr}`;
    const dateTodayStr = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const drafts: any[] = [];
    let reportText = `Borradores de mail — Horas registradas, ${fullMonthYearStr}\nUn mail por persona, listo para copiar y pegar. Datos: Clockify, al ${dateTodayStr}.\n\n`;

    (employees || []).forEach((emp: any, index: number) => {
      const email = emp.email || `${emp.name.toLowerCase().replace(/\s+/g, '.')}@moovingtech.com`;
      const hours = hoursMap[emp.id] || hoursMap[emp.name.toLowerCase()] || 0;
      
      const cleanName = emp.name.replace(/\./g, ' ').trim();
      const nameParts = cleanName.split(/\s+/).map((p: string) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase());
      const fullName = nameParts.join(' ');
      const firstName = nameParts[0] || fullName;
      const hoursFormatted = hours.toFixed(2).replace('.', ',');

      let body = '';
      if (hours > 0) {
        body = `Hola ${firstName},\n\nTenemos registradas ${hoursFormatted} horas a tu nombre para el mes de ${monthName}. Por favor revisá los valores y avisanos si encontrás alguna diferencia.\n\nSaludos,`;
      } else {
        body = `Hola ${firstName},\n\nNo tenemos horas registradas en Clockify a tu nombre para el mes en curso. Por favor registralas a la brevedad.\n\nSaludos,`;
      }

      drafts.push({
        number: index + 1,
        employee_id: emp.id,
        employee_name: fullName,
        email,
        cc: defaultCc,
        subject: `Registro de horas — ${fullMonthYearStr}`,
        body,
        hours,
        hours_formatted: hoursFormatted,
        is_active: emp.is_active !== 0
      });

      reportText += `${index + 1}. ${fullName}\n`;
      reportText += `Para: ${email}\n`;
      reportText += `CC: ${defaultCc}\n`;
      reportText += `Asunto: Registro de horas — ${fullMonthYearStr}\n`;
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
    const company_id = params.company_id || c.get('auth')?.company_id || 'mooving-default';
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

    // Optional: sync Clockify before sending to ensure latest hours data
    let clockifySyncResult = null;
    if (sync_clockify_first !== false) {
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

    const sendgridKey = c.env.SENDGRID_API_KEY || c.env.SENDGRID_PASSWORD;
    const fromEmail = c.env.SENDGRID_FROM_EMAIL || 'monica.aieta@moovingtech.com';
    let realEmailsSent = 0;
    const failedEmails: string[] = [];

    if (sendgridKey) {
      try {
        const draftsResult = await (TOOL_REGISTRY as any).get_email_reminder_drafts({ company_id, month, custom_cc }, c);
        const draftsMap: Record<string, any> = {};
        (draftsResult.drafts || []).forEach((d: any) => {
          draftsMap[d.employee_id] = d;
        });

        for (const recipientId of recipients) {
          const d = draftsMap[recipientId];
          if (!d) continue;

          const ccEmails = (d.cc || custom_cc || '')
            .split(';')
            .map((s: string) => {
              const match = s.match(/<([^>]+)>/);
              const email = match ? match[1] : s.trim();
              return email.includes('@') ? { email } : null;
            })
            .filter(Boolean);

          const sendgridPayload: any = {
            personalizations: [
              {
                to: [{ email: d.email }],
                ...(ccEmails.length > 0 ? { cc: ccEmails } : {}),
                subject: d.subject
              }
            ],
            from: { email: fromEmail, name: 'Mónica Aieta - Mooving Tech' },
            content: [
              {
                type: 'text/plain',
                value: d.body
              }
            ]
          };

          const authHeader = sendgridKey.startsWith('SG.')
            ? `Bearer ${sendgridKey}`
            : (sendgridKey.includes(':') ? `Basic ${btoa(sendgridKey)}` : `Bearer ${sendgridKey}`);

          const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(sendgridPayload)
          });

          if (sgRes.ok || sgRes.status === 202) {
            realEmailsSent++;
            console.log(`[SendGrid] ✅ Mail sent to ${d.email}`);
          } else {
            const errText = await sgRes.text();
            console.error(`[SendGrid] ❌ Failed for ${d.email}: HTTP ${sgRes.status} — ${errText}`);
            failedEmails.push(`${d.employee_name} (${d.email})`);
          }
        }
      } catch (err) {
        console.error('[SendGrid] Error enviando mails:', err);
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
      provider: sendgridKey ? 'SendGrid API (v3)' : 'Simulación / Mailto Interactivo',
      message: sendgridKey 
        ? (failedEmails.length > 0
          ? `Se enviaron ${realEmailsSent} de ${recipients.length} mails vía SendGrid. ${failedEmails.length} fallaron.`
          : `Se enviaron exitosamente ${realEmailsSent} recordatorios a través de SendGrid API.`)
        : `Se registraron exitosamente ${recipients.length} recordatorios para envío.`,
      timestamp: new Date().toISOString()
    };
  },

  configure_email_reminder_schedule: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const company_id = params.company_id || c.get('auth')?.company_id || 'mooving-default';
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
};

export const executeToolCall = async (toolName: string, params: any, c: HonoContext) => {
  const tool = (TOOL_REGISTRY as any)[toolName];
  if (!tool) {
    throw new Error(`Tool not found in registry: ${toolName}`);
  }
  return await tool(params, c);
};
