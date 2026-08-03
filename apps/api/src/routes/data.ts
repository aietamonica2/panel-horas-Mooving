/**
 * Data management routes
 * CSV upload, data validation, retrieval
 */

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { HonoContext, ApiResponse, TimeRecordPayload } from '../types'
import { validateTimeRecord } from '../lib/policyValidation'
import { logAudit, actorFromAuth } from '../lib/audit'
// B5: resolvedor canónico de identidad → time_records.employee_key (migración 0022).
import { loadIdentityResolver, resolveEmployeeKeyForInsert } from '../lib/identity'
// B1: la versión sale SIEMPRE de src/version.ts (única fuente de verdad,
// en sync con /VERSION en la raíz del repo).
import { APP_VERSION } from '../version'

export const dataRouter = new Hono()

const DATA_API_VERSION = APP_VERSION

// Validation schema for time records
const TimeRecordSchema = z.object({
  employee_id: z.string().min(1),
  employee_name: z.string().min(1),
  client_id: z.string().min(1),
  client_name: z.string().min(1),
  project_id: z.string().min(1),
  project_name: z.string().min(1),
  duration_decimal: z.number().positive(),
  date: z.string().date(),
  work_type: z.enum(['project', 'internal', 'meeting', 'training', 'other']),
  description: z.string().optional(),
  source: z.string().optional(),
  // DATA-06: optional billing / status fields. Accepted (not required) so
  // payloads that omit them keep working; persisted with safe defaults.
  is_billable: z.union([z.boolean(), z.number()]).optional(),
  rate_usd: z.number().optional(),
  amount_usd: z.number().optional(),
  status: z.string().optional(),
})

// DATA-06: resolve the billable flag as a 0/1 integer. If the record carries an
// explicit is_billable it wins (boolean or number); otherwise it is derived
// from work_type === 'project'.
function resolveIsBillable(record: {
  is_billable?: boolean | number
  work_type?: string
}): number {
  if (record.is_billable !== undefined && record.is_billable !== null) {
    return record.is_billable ? 1 : 0
  }
  return record.work_type === 'project' ? 1 : 0
}

const CsvUploadSchema = z.object({
  records: z.array(TimeRecordSchema).min(1),
})

// POST /api/data/upload - CSV file upload
dataRouter.post(
  '/upload',
  zValidator('json', CsvUploadSchema),
  async (c: HonoContext): Promise<Response> => {
    try {
      const data = c.req.valid('json')
      const company_id = c.get('auth')?.company_id || 'mooving-default'

      // FUNC-01: validate every row against the load policies before insert.
      // Rows with errors are rejected (not inserted); rows with only warnings
      // are inserted and their warnings are reported back.
      const rejected: Array<{ index: number; errors: string[] }> = []
      const warnings: Array<{ index: number; warnings: string[] }> = []
      let inserted = 0

      // B5: padrón (employees + aliases) cargado UNA vez por upload, no por fila.
      const resolveIdentity = await loadIdentityResolver(c.env.DB, company_id)

      for (let index = 0; index < data.records.length; index++) {
        const record = data.records[index]

        const validation = validateTimeRecord(record)
        if (!validation.valid) {
          rejected.push({ index, errors: validation.errors })
          continue
        }
        if (validation.warnings.length > 0) {
          warnings.push({ index, warnings: validation.warnings })
        }

        // B5: employees.id canónico (id exacto → alias → normKey); NULL si no resuelve.
        const employeeKey = resolveIdentity(record.employee_id, record.employee_name)

        // DATA-06: persist billable flag, USD rate/amount and approval status.
        const id = crypto.randomUUID()
        await c.env.DB.prepare(`
          INSERT INTO time_records (
            id, company_id, employee_id, employee_name, employee_key, client_id, client_name,
            project_id, project_name, duration_decimal, duration_hours, duration_minutes,
            date, work_type, description, is_billable, rate_usd, amount_usd, status, source
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          id, company_id, record.employee_id, record.employee_name, employeeKey,
          record.client_id, record.client_name, record.project_id, record.project_name,
          record.duration_decimal, Math.floor(record.duration_decimal),
          Math.round((record.duration_decimal % 1) * 60),
          record.date, record.work_type, record.description || '',
          resolveIsBillable(record), record.rate_usd ?? 0, record.amount_usd ?? 0,
          record.status ?? 'approved', record.source ?? 'csv'
        ).run()

        inserted++
      }

      const response: ApiResponse = {
        success: true,
        data: {
          // `uploaded` kept for backwards compatibility, now = rows inserted.
          uploaded: inserted,
          inserted,
          rejected,
          warnings,
          company_id,
        },
        timestamp: new Date().toISOString(),
        version: DATA_API_VERSION,
      }
      return c.json(response)
    } catch (error) {
      console.error(error)
      return c.json({
        success: false,
        error: 'Error interno',
        timestamp: new Date().toISOString(),
        version: DATA_API_VERSION,
      }, 400)
    }
  }
)

// POST /api/data/records - Carga manual de horas (Fase 5)
dataRouter.post(
  '/records',
  zValidator('json', TimeRecordSchema),
  async (c: HonoContext): Promise<Response> => {
    try {
      const data = c.req.valid('json')
      const authCtx = c.get('auth')
      if (!authCtx) {
        return c.json({ success: false, error: 'No autenticado' }, 401)
      }
      const company_id = authCtx?.company_id || 'mooving-default'
      const currentUserRole = authCtx?.role
      const currentUserId = authCtx?.user_id
      
      // Validación RBAC: Solo administradores pueden cargar horas para otros empleados
      if (currentUserRole !== 'admin' && data.employee_id !== currentUserId) {
        return c.json({ success: false, error: 'No tienes permisos para cargar horas a nombre de otro empleado' }, 403)
      }

      const id = crypto.randomUUID()

      // B5: employee_key = employees.id canónico (el employee_id que llega suele ser
      // ya la ficha; igual se resuelve por id/alias/nombre). NULL si no resuelve.
      const employeeKey = await resolveEmployeeKeyForInsert(
        c.env.DB, company_id, data.employee_id, data.employee_name
      )

      // DATA-06: persist billable flag, USD rate/amount and approval status.
      await c.env.DB.prepare(`
        INSERT INTO time_records (
          id, company_id, employee_id, employee_name, employee_key, client_id, client_name, project_id, project_name,
          duration_decimal, duration_hours, duration_minutes, date, work_type, description, source,
          is_billable, rate_usd, amount_usd, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id, company_id, data.employee_id, data.employee_name, employeeKey, data.client_id, data.client_name, data.project_id, data.project_name,
        data.duration_decimal, Math.floor(data.duration_decimal), Math.round((data.duration_decimal % 1) * 60), data.date, data.work_type, data.description || '', data.source || 'manual',
        resolveIsBillable(data), data.rate_usd ?? 0, data.amount_usd ?? 0, data.status ?? 'approved'
      ).run()

      // N4: auditoría best-effort (logAudit nunca rompe el flujo principal).
      await logAudit(c.env.DB, {
        company_id,
        ...actorFromAuth(authCtx),
        action: 'create',
        entity: 'time_record',
        entity_id: id,
        summary: `Creó registro ${data.duration_decimal}h de ${data.employee_name} (${data.date})`,
      })

      return c.json({
        success: true,
        data: { id, message: 'Registro creado exitosamente' },
        timestamp: new Date().toISOString(),
        version: DATA_API_VERSION
      })
    } catch (error) {
      console.error(error)
      return c.json({ success: false, error: 'Error interno' }, 500)
    }
  }
)

// GET /api/data/records - Get time records
dataRouter.get('/records', async (c: HonoContext): Promise<Response> => {
  try {
    const authPayload = c.get('auth')
    const company_id = authPayload?.company_id || 'mooving-default'
    const limit = c.req.query('limit') || '5000'
    const currentUserRole = authPayload?.role || 'employee'
    const currentUserId = authPayload?.user_id

    let query = 'SELECT * FROM time_records WHERE company_id = ?'
    const params: any[] = [company_id]

    if (currentUserRole !== 'admin' && currentUserId) {
      query += ' AND employee_id = ?'
      params.push(currentUserId)
    }

    query += ' ORDER BY date DESC LIMIT ?'
    params.push(parseInt(limit))

    // Query D1 database
    const result = await c.env.DB.prepare(query).bind(...params).all()

    const response: ApiResponse = {
      success: true,
      data: {
        records: result.results || [],
        total: result.results?.length || 0,
        limit: parseInt(limit),
      },
      timestamp: new Date().toISOString(),
      version: DATA_API_VERSION,
    }
    return c.json(response)
  } catch (error) {
    console.error(error)
    return c.json({
      success: false,
      error: 'Error interno',
      timestamp: new Date().toISOString(),
      version: DATA_API_VERSION,
    }, 500)
  }
})

// PUT /api/data/records/:id - Edición manual de horas
dataRouter.put(
  '/records/:id',
  zValidator('json', TimeRecordSchema),
  async (c: HonoContext): Promise<Response> => {
    try {
      const data = c.req.valid('json')
      const id = c.req.param('id')
      const authCtx = c.get('auth')
      if (!authCtx) {
        return c.json({ success: false, error: 'No autenticado' }, 401)
      }
      const company_id = authCtx?.company_id || 'mooving-default'
      const currentUserRole = authCtx?.role
      const currentUserId = authCtx?.user_id
      
      if (currentUserRole !== 'admin' && data.employee_id !== currentUserId) {
        return c.json({ success: false, error: 'No tienes permisos para editar' }, 403)
      }

      // B5: re-resolver employee_key por si la edición cambió el empleado del
      // registro (id exacto → alias → normKey; NULL si no resuelve).
      const employeeKey = await resolveEmployeeKeyForInsert(
        c.env.DB, company_id, data.employee_id, data.employee_name
      )

      // U7: recomputar is_billable según el (posiblemente nuevo) work_type, para
      // que reclasificar de proyecto a interno deje de contar como facturable.
      await c.env.DB.prepare(`
        UPDATE time_records SET
          employee_id = ?, employee_name = ?, employee_key = ?, client_id = ?, client_name = ?, project_id = ?, project_name = ?,
          duration_decimal = ?, duration_hours = ?, duration_minutes = ?, date = ?, work_type = ?, description = ?, is_billable = ?
        WHERE id = ? AND company_id = ?
      `).bind(
        data.employee_id, data.employee_name, employeeKey, data.client_id, data.client_name, data.project_id, data.project_name,
        data.duration_decimal, Math.floor(data.duration_decimal), Math.round((data.duration_decimal % 1) * 60), data.date, data.work_type, data.description || '', resolveIsBillable(data),
        id, company_id
      ).run()

      // N4: auditoría best-effort (logAudit nunca rompe el flujo principal).
      await logAudit(c.env.DB, {
        company_id,
        ...actorFromAuth(authCtx),
        action: 'update',
        entity: 'time_record',
        entity_id: id,
        summary: `Editó registro ${data.duration_decimal}h de ${data.employee_name} (${data.date})`,
      })

      return c.json({ success: true, timestamp: new Date().toISOString(), version: DATA_API_VERSION })
    } catch (error) {
      console.error(error)
      return c.json({ success: false, error: 'Error interno' }, 500)
    }
  }
)

// DELETE /api/data/records/:id
dataRouter.delete('/records/:id', async (c: HonoContext): Promise<Response> => {
  try {
    const authCtx = c.get('auth')
    if (!authCtx) {
      return c.json({ success: false, error: 'No autenticado' }, 401)
    }
    const currentUserRole = authCtx?.role
    const currentUserId = authCtx?.user_id
    const id = c.req.param('id')
    const company_id = authCtx?.company_id || 'mooving-default'

    // Validación RBAC: un no-admin solo puede borrar registros propios
    if (currentUserRole !== 'admin') {
      const existing = await c.env.DB
        .prepare('SELECT employee_id FROM time_records WHERE id = ? AND company_id = ?')
        .bind(id, company_id)
        .first<{ employee_id: string }>()
      if (existing && existing.employee_id !== currentUserId) {
        return c.json({ success: false, error: 'No tienes permisos para borrar este registro' }, 403)
      }
    }

    // N4: leemos el registro ANTES de borrarlo, sólo para armar el summary de
    // auditoría. Best-effort: si falla, el summary cae al id.
    let deletedInfo: any = null
    try {
      deletedInfo = await c.env.DB
        .prepare('SELECT employee_id, employee_name, duration_decimal, date FROM time_records WHERE id = ? AND company_id = ?')
        .bind(id, company_id)
        .first()
    } catch { /* best-effort */ }

    await c.env.DB.prepare('DELETE FROM time_records WHERE id = ? AND company_id = ?').bind(id, company_id).run()

    // N4: auditoría best-effort (logAudit nunca rompe el flujo principal).
    await logAudit(c.env.DB, {
      company_id,
      ...actorFromAuth(authCtx),
      action: 'delete',
      entity: 'time_record',
      entity_id: id,
      summary: deletedInfo
        ? `Eliminó registro ${deletedInfo.duration_decimal}h de ${deletedInfo.employee_name || deletedInfo.employee_id} (${deletedInfo.date})`
        : `Eliminó registro ${id}`,
    })

    return c.json({ success: true, timestamp: new Date().toISOString(), version: DATA_API_VERSION })
  } catch (error) {
    console.error(error)
    return c.json({ success: false, error: 'Error interno' }, 500)
  }
})

export default dataRouter
