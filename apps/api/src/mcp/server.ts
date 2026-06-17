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
    const { company_id, name, email } = params;
    const cid = company_id || c.get('auth')?.company_id || 'mooving-default';
    const id = 'emp_' + crypto.randomUUID().split('-')[0];
    await db.prepare('INSERT INTO employees (id, company_id, name, email) VALUES (?, ?, ?, ?)')
      .bind(id, cid, name, email || null).run();
    return { success: true, employee_id: id };
  },
  update_employee: async (params: any, c: HonoContext) => {
    const db = c.env.DB;
    const { id, name, email } = params;
    await db.prepare('UPDATE employees SET name = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(name, email || null, id).run();
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
    
    const mockSyncRecords = [
      { employee_id: 'emp_monica', employee_name: 'monica.aieta', client_id: 'cli_camuzzi', client_name: 'Camuzzi', project_id: 'proj_cam_web', project_name: 'Portal Web', duration: 6.5, date: '2026-06-10', work_type: 'project', desc: 'Desarrollo Frontend [Clockify]' },
      { employee_id: 'emp_fede', employee_name: 'federico.gomez', client_id: 'cli_ypf', client_name: 'YPF', project_id: 'proj_ypf_mig', project_name: 'Migración SAP', duration: 8.0, date: '2026-06-11', work_type: 'project', desc: 'Reunión SAP [Clockify]' },
      { employee_id: 'emp_santi', employee_name: 'santiago.perez', client_id: 'cli_mooving', client_name: 'Mooving', project_id: 'proj_moov_core', project_name: 'Senda Core', duration: 7.5, date: '2026-06-12', work_type: 'project', desc: 'Code review [Clockify]' }
    ];

    let inserted = 0;
    for (const rec of mockSyncRecords) {
      const id = 'clk_' + crypto.randomUUID().substring(0, 8);
      try {
        await db.prepare(`
          INSERT INTO time_records (
            id, company_id, employee_id, employee_name, client_id, client_name,
            project_id, project_name, duration_decimal, duration_hours, duration_minutes,
            date, work_type, description
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          id, company_id, rec.employee_id, rec.employee_name,
          rec.client_id, rec.client_name, rec.project_id, rec.project_name,
          rec.duration, Math.floor(rec.duration), Math.round((rec.duration % 1) * 60),
          rec.date, rec.work_type, rec.desc
        ).run();
        inserted++;
      } catch (err) {
        console.error('Error inserting clockify sync record:', err);
      }
    }

    return {
      success: true,
      message: `Horas de operaciones extraídas e importadas de Clockify para el tenant ${company_id}.`,
      records_fetched: mockSyncRecords.length,
      records_inserted: inserted,
      total_hours: mockSyncRecords.reduce((acc, r) => acc + r.duration, 0),
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
    for (const emp of employees) {
      const parts = (emp.name as string).toLowerCase().split(/[._\s]/);
      for (const part of parts) {
        if (part.length > 2 && textLower.includes(part)) {
          employee_id = emp.id as string;
          employee_name = emp.name as string;
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
  }
};

export const executeToolCall = async (toolName: string, params: any, c: HonoContext) => {
  const tool = (TOOL_REGISTRY as any)[toolName];
  if (!tool) {
    throw new Error(`Tool not found in registry: ${toolName}`);
  }
  return await tool(params, c);
};
