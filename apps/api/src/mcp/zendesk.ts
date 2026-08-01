/**
 * N3 — Sincronización de tickets de Zendesk (lógica compartida).
 *
 * `syncZendeskTickets(db, creds, company_id)` contiene la ÚNICA implementación
 * de la importación de tickets resueltos de Zendesk como registros de horas
 * (1h por ticket resuelto). La usan dos entrypoints, sin duplicar lógica:
 *
 *   - La tool MCP `sync_zendesk_tickets` (mcp/server.ts) — disparo manual.
 *     Lee credenciales de c.env y company_id del principal; si faltan
 *     credenciales LANZA error (comportamiento original de la tool).
 *   - El cron diario `handleZendeskSyncCron` (cron/zendesk_sync.ts) —
 *     weekdays 10:30 UTC. Si faltan credenciales, loguea y sale sin error
 *     (no-op graceful).
 */

export interface ZendeskCredentials {
  subdomain: string
  email: string
  token: string
}

export interface ZendeskSyncResult {
  success: boolean
  message: string
  records_fetched: number
  records_inserted: number
  total_hours: number
  source: 'zendesk'
}

/**
 * Importa los tickets `status:solved` de Zendesk como time_records del tenant.
 * Resuelve el agente asignado contra el padrón de empleados (email exacto →
 * alias → nombre exacto → id sintético zen_user_/zen_agent_). Idempotente:
 * INSERT OR IGNORE con id determinístico 'zen_<ticket_id>'.
 */
export async function syncZendeskTickets(
  db: D1Database,
  creds: ZendeskCredentials,
  company_id: string
): Promise<ZendeskSyncResult> {
  const { subdomain, email, token } = creds

  const authStr = btoa(`${email}/token:${token}`)
  const url = `https://${subdomain}.zendesk.com/api/v2/search.json?query=type:ticket status:solved&include=users`

  let zendeskData
  try {
    const resp = await fetch(url, {
      headers: {
        'Authorization': `Basic ${authStr}`,
        'Accept': 'application/json'
      }
    })
    if (!resp.ok) {
      throw new Error(`Zendesk API error: ${resp.status} ${resp.statusText}`)
    }
    zendeskData = await resp.json() as any
  } catch (err: any) {
    console.error('Error fetching from Zendesk:', err)
    throw new Error('No se pudo conectar con Zendesk: ' + err.message)
  }

  const tickets = zendeskData.results || []
  const usersList: any[] = zendeskData.users || []
  const usersMap = new Map<number, { name: string; email: string }>()
  usersList.forEach(u => {
    if (u.id) {
      usersMap.set(u.id, { name: u.name || 'Agente Zendesk', email: u.email || '' })
    }
  })

  // Fetch existing employees & aliases for smart matching
  const empRes = await db.prepare(`SELECT id, name, email FROM employees WHERE company_id = ?`).bind(company_id).all()
  const existingEmployees = (empRes.results || []) as any[]

  const aliasRes = await db.prepare(`SELECT alias_email, alias_name, employee_id FROM employee_aliases WHERE company_id = ?`).bind(company_id).all()
  const existingAliases = (aliasRes.results || []) as any[]

  let inserted = 0
  let total_hours = 0

  for (const ticket of tickets) {
    const id = 'zen_' + ticket.id
    const duration = 1.0 // 1h por ticket resuelto
    const desc = `Resolución Ticket #${ticket.id} [Zendesk]: ${ticket.subject}`
    const dateStr = ticket.updated_at ? ticket.updated_at.split('T')[0] : new Date().toISOString().split('T')[0]

    // Resolve assignee
    const assigneeInfo = ticket.assignee_id ? usersMap.get(ticket.assignee_id) : null
    const assigneeEmail = (assigneeInfo?.email || '').toLowerCase().trim()
    const assigneeName = (assigneeInfo?.name || 'Agente Soporte').trim()

    let targetEmpId = ''
    let targetEmpName = ''

    // 1. Check exact email match in employees
    if (assigneeEmail) {
      const matchByEmail = existingEmployees.find(e => (e.email || '').toLowerCase().trim() === assigneeEmail)
      if (matchByEmail) {
        targetEmpId = matchByEmail.id
        targetEmpName = matchByEmail.name
      }
    }

    // 2. Check alias table
    if (!targetEmpId && assigneeEmail) {
      const matchAlias = existingAliases.find(a => (a.alias_email || '').toLowerCase().trim() === assigneeEmail)
      if (matchAlias) {
        const emp = existingEmployees.find(e => e.id === matchAlias.employee_id)
        if (emp) {
          targetEmpId = emp.id
          targetEmpName = emp.name
        }
      }
    }

    // 3. Check exact name match in employees
    if (!targetEmpId && assigneeName) {
      const matchByName = existingEmployees.find(e => (e.name || '').toLowerCase().trim() === assigneeName.toLowerCase())
      if (matchByName) {
        targetEmpId = matchByName.id
        targetEmpName = matchByName.name
      }
    }

    // Fallback: Use assignee name or email directly if unlinked
    if (!targetEmpId) {
      targetEmpId = assigneeEmail ? `zen_user_${assigneeEmail.replace(/[^a-zA-Z0-9]/g, '_')}` : `zen_agent_${ticket.assignee_id || 'soporte'}`
      targetEmpName = assigneeName || assigneeEmail || 'Agente Soporte'
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
      ).run()
      inserted++
      total_hours += duration
    } catch (err) {
      console.error('Error inserting zendesk sync record:', err)
    }
  }

  return {
    success: true,
    message: `Tickets de soporte procesados e importados de Zendesk para el tenant ${company_id}.`,
    records_fetched: tickets.length,
    records_inserted: inserted,
    total_hours: total_hours,
    source: 'zendesk'
  }
}
