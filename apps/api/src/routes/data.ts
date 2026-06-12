/**
 * Data management routes
 * CSV upload, data validation, retrieval
 */

import { Router } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { HonoContext, ApiResponse, TimeRecordPayload } from '../types'

export const dataRouter = new Router()

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
      const tenant_id = c.get('auth')?.tenant_id || 'default-tenant'

      // TODO: Insert records into D1 database
      // await c.env.DB.prepare(
      //   'INSERT INTO time_records (tenant_id, employee_id, ...) VALUES (?, ?, ...)'
      // ).all(...)

      const response: ApiResponse = {
        success: true,
        data: {
          uploaded: data.records.length,
          tenant_id,
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

// GET /api/data/records - Get time records
dataRouter.get('/records', async (c: HonoContext): Promise<Response> => {
  try {
    const tenant_id = c.get('auth')?.tenant_id || 'default-tenant'
    const limit = c.req.query('limit') || '100'

    // TODO: Query D1 database
    // const result = await c.env.DB.prepare(
    //   'SELECT * FROM time_records WHERE tenant_id = ? LIMIT ?'
    // ).all(tenant_id, parseInt(limit))

    const response: ApiResponse = {
      success: true,
      data: {
        records: [],
        total: 0,
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

export default dataRouter
