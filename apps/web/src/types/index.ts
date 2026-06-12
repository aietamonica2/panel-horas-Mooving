export interface TimeRecord {
  proyecto: string
  cliente: string
  usuario: string
  duracion_decimal: number
  fecha_inicio: string
  grupo: string
}

export interface FilteredData {
  records: TimeRecord[]
  months: string[]
  categories: string[]
  users: string[]
}

export interface DashboardMetrics {
  totalHours: number
  avgDaily: number
  activeUsers: number
  totalClients: number
}

export interface UserWorkload {
  usuario: string
  totalHoras: number
  distribucion: Record<string, number>
}

export interface AvailabilityRecord {
  usuario: string
  mes: string
  horasEsperadas: number
  horasRegistradas: number
  tiempoLibre: number
}
