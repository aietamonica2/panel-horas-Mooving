/**
 * Data management routes
 * CSV upload, data validation, retrieval
 */

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { HonoContext, ApiResponse, TimeRecordPayload } from '../types'

export const dataRouter = new Hono()

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
})

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

      // Insert records into D1 database
      for (const record of data.records) {
        const id = crypto.randomUUID()
        await c.env.DB.prepare(`
          INSERT INTO time_records (
            id, company_id, employee_id, employee_name, client_id, client_name,
            project_id, project_name, duration_decimal, duration_hours, duration_minutes,
            date, work_type, description
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          id, company_id, record.employee_id, record.employee_name,
          record.client_id, record.client_name, record.project_id, record.project_name,
          record.duration_decimal, Math.floor(record.duration_decimal),
          Math.round((record.duration_decimal % 1) * 60),
          record.date, record.work_type, record.description || ''
        ).run()
      }

      const response: ApiResponse = {
        success: true,
        data: {
          uploaded: data.records.length,
          company_id,
        },
        timestamp: new Date().toISOString(),
        version: 'v1.0.0',
      }
      return c.json(response)
    } catch (error) {
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        version: 'v1.0.0',
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
      const company_id = c.get('auth')?.company_id || 'mooving-default'
      const currentUserRole = 'admin' // MOCK: Esto vendría del JWT en un entorno real
      const currentUserId = 'mock-user-123'
      
      // Validación RBAC: Solo administradores pueden cargar horas para otros empleados
      if (currentUserRole !== 'admin' && data.employee_id !== currentUserId) {
        return c.json({ success: false, error: 'No tienes permisos para cargar horas a nombre de otro empleado' }, 403)
      }

      const id = crypto.randomUUID()

      await c.env.DB.prepare(`
        INSERT INTO time_records (
          id, company_id, employee_id, employee_name, client_id, client_name, project_id, project_name, 
          duration_decimal, duration_hours, duration_minutes, date, work_type, description, source
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id, company_id, data.employee_id, data.employee_name, data.client_id, data.client_name, data.project_id, data.project_name,
        data.duration_decimal, Math.floor(data.duration_decimal), Math.round((data.duration_decimal % 1) * 60), data.date, data.work_type, data.description || '', data.source || 'manual'
      ).run()

      return c.json({
        success: true,
        data: { id, message: 'Registro creado exitosamente' },
        timestamp: new Date().toISOString(),
        version: 'v1.0.0'
      })
    } catch (error) {
      return c.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, 500)
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
      version: 'v1.0.0',
    }
    return c.json(response)
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      version: 'v1.0.0',
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
      const company_id = c.get('auth')?.company_id || 'mooving-default'
      const currentUserRole = 'admin' // MOCK: Esto vendría del JWT
      const currentUserId = 'mock-user-123'
      
      if (currentUserRole !== 'admin' && data.employee_id !== currentUserId) {
        return c.json({ success: false, error: 'No tienes permisos para editar' }, 403)
      }

      await c.env.DB.prepare(`
        UPDATE time_records SET 
          employee_id = ?, employee_name = ?, client_id = ?, client_name = ?, project_id = ?, project_name = ?, 
          duration_decimal = ?, duration_hours = ?, duration_minutes = ?, date = ?, work_type = ?, description = ?
        WHERE id = ? AND company_id = ?
      `).bind(
        data.employee_id, data.employee_name, data.client_id, data.client_name, data.project_id, data.project_name,
        data.duration_decimal, Math.floor(data.duration_decimal), Math.round((data.duration_decimal % 1) * 60), data.date, data.work_type, data.description || '',
        id, company_id
      ).run()

      return c.json({ success: true, timestamp: new Date().toISOString(), version: 'v1.0.0' })
    } catch (error) {
      return c.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, 500)
    }
  }
)

// DELETE /api/data/records/:id
dataRouter.delete('/records/:id', async (c: HonoContext): Promise<Response> => {
  try {
    const id = c.req.param('id')
    const company_id = c.get('auth')?.company_id || 'mooving-default'
    await c.env.DB.prepare('DELETE FROM time_records WHERE id = ? AND company_id = ?').bind(id, company_id).run()
    return c.json({ success: true, timestamp: new Date().toISOString(), version: 'v1.0.0' })
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, 500)
  }
})

export default dataRouter
