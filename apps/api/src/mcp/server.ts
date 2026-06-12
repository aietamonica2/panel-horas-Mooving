import { HonoContext } from '../types';

export const TOOL_REGISTRY = {
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

  sync_zendesk_hours: async (params: any, c: HonoContext) => {
    // Mock integration: Simulates fetching recent solved tickets from Zendesk
    // and extracting time-tracking data.
    const { company_id, days_back = 7 } = params;
    return {
      success: true,
      message: `Fetched Zendesk tickets from the last ${days_back} days.`,
      tickets_processed: 45,
      extracted_hours: 120.5,
      records_ready_for_audit: true
    };
  },

  audit_timesheet: async (params: any, c: HonoContext) => {
    // Simulates an audit on the extracted records (CSV or Zendesk)
    const { records } = params;
    let anomalies = [];
    
    if (records && Array.isArray(records)) {
      records.forEach((r, idx) => {
        if (r.duration_hours > 12) {
          anomalies.push({ index: idx, issue: `Exceeds 12 hours in a single day (${r.duration_hours}h)`, user: r.employee_name });
        }
        if (!r.project_id) {
          anomalies.push({ index: idx, issue: 'Missing project assignment', user: r.employee_name });
        }
      });
    }

    return {
      status: anomalies.length > 0 ? 'requires_review' : 'clean',
      total_records: records?.length || 0,
      anomalies_found: anomalies
    };
  },

  send_inactivity_alerts: async (params: any, c: HonoContext) => {
    // Simulates finding users who haven't logged hours recently and sending Slack/Email alerts
    const db = c.env.DB;
    const { company_id, days_threshold = 7 } = params;
    
    // In a real app, query users table left join time_records where date > now - threshold
    return {
      success: true,
      alerts_sent: 3,
      users_alerted: ['fede.mooving', 'alex.mooving', 'juan.perez'],
      channel: 'Slack & Email'
    };
  },

  write_time_records: async (params: any, c: HonoContext) => {
    // Secure write access for Senda after human confirmation
    const db = c.env.DB;
    const { company_id, records } = params; // array of records
    
    if (!records || !Array.isArray(records)) {
      throw new Error('Records array is required');
    }

    // In a real scenario, we would use a D1 batch insert
    return {
      success: true,
      inserted_count: records.length,
      message: 'Records securely written to database post-audit.'
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
