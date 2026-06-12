/**
 * Backend type definitions
 * Shared between routes and middleware
 */

import { Context } from 'hono'

export interface CloudflareEnv {
  DB: D1Database
  ENVIRONMENT: 'development' | 'production'
  SECRET_KEY: string
}

export interface TimeRecordPayload {
  tenant_id: string
  employee_id: string
  employee_name: string
  client_id: string
  client_name: string
  project_id: string
  project_name: string
  duration_decimal: number
  date: string
  work_type: 'project' | 'internal' | 'meeting' | 'training' | 'other'
  description?: string
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  timestamp: string
  version: string
}

export type HonoContext = Context<{ Bindings: CloudflareEnv }>
