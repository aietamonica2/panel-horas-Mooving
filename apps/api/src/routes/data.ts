import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import type { CloudflareBindings } from '@/types'
import { CSVUploadSchema } from '@/types/schemas'

const router = new Hono<{ Bindings: CloudflareBindings }>()

router.post('/upload', zValidator('json', CSVUploadSchema), async (c) => {
  const data = c.req.valid('json')

  if (!data.records || data.records.length === 0) {
    return c.json(
      {
        success: false,
        error: 'No records provided',
      },
      400
    )
  }

  try {
    // Validar cada registro
    const validRecords = data.records.filter((record) => {
      return (
        record.proyecto &&
        record.cliente &&
        record.usuario &&
        record.duracion_decimal > 0 &&
        record.fecha_inicio &&
        /^\d{2}\/\d{2}\/\d{4}$/.test(record.fecha_inicio)
      )
    })

    return c.json({
      success: true,
      data: {
        recordCount: validRecords.length,
        uploadedAt: new Date().toISOString(),
      },
      message: `Successfully processed ${validRecords.length} records`,
    })
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process data',
      },
      400
    )
  }
})

router.get('/validate', (c) => {
  return c.json({
    success: true,
    data: {
      requiredFields: ['proyecto', 'cliente', 'usuario', 'duracion_decimal', 'fecha_inicio', 'grupo'],
      dateFormat: 'DD/MM/YYYY',
    },
  })
})

export default router
