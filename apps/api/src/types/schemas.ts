import { z } from 'zod'

export const TimeRecordSchema = z.object({
  proyecto: z.string(),
  cliente: z.string(),
  usuario: z.string(),
  duracion_decimal: z.number().positive(),
  fecha_inicio: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/),
  grupo: z.string(),
})

export const CSVUploadSchema = z.object({
  records: z.array(TimeRecordSchema),
})

export type TimeRecordType = z.infer<typeof TimeRecordSchema>
export type CSVUploadType = z.infer<typeof CSVUploadSchema>
