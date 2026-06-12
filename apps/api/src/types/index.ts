export interface TimeRecord {
  proyecto: string
  cliente: string
  usuario: string
  duracion_decimal: number
  fecha_inicio: string
  grupo: string
}

export interface CloudflareBindings {
  DB: D1Database
  ENVIRONMENT: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface UploadedData {
  records: TimeRecord[]
  recordCount: number
  uploadedAt: string
}
