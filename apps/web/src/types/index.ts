/**
 * Core application types
 * Strict TypeScript interfaces for all data structures
 */

export interface TimeRecord {
  id: string
  tenant_id: string
  employee_id: string
  employee_name: string
  client_id: string
  client_name: string
  project_id: string
  project_name: string
  duration_decimal: number
  duration_hours: number
  duration_minutes: number
  date: string
  work_type: 'project' | 'internal' | 'meeting' | 'training' | 'other'
  description: string
  created_at: string
  updated_at: string
}

export interface Employee {
  id: string
  tenant_id: string
  name: string
  email: string
  department: string
  is_active: boolean
  created_at: string
}

export interface Client {
  id: string
  tenant_id: string
  name: string
  industry: string
  is_active: boolean
  created_at: string
}

export interface DashboardMetrics {
  total_records: number
  filtered_records: number
  total_hours: number
  average_hours_per_day: number
  unique_employees: number
  unique_clients: number
  occupancy_rate: number
  team_availability_hours: number
}

export interface FilterState {
  dateRangeStart: string
  dateRangeEnd: string
  employees: string[]
  clients: string[]
  projects: string[]
  workTypes: string[]
}

export interface AppState {
  records: TimeRecord[]
  employees: Employee[]
  clients: Client[]
  filters: FilterState
  isLoading: boolean
  error: string | null
  version: string
}

export interface APIResponse<T> {
  success: boolean
  data?: T
  error?: string
  timestamp: string
}

export interface CsvImportPayload {
  tenant_id: string
  records: Omit<TimeRecord, 'id' | 'created_at' | 'updated_at'>[]
}
