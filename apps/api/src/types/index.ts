/**
 * Backend type definitions
 * Shared between routes and middleware
 */

/// <reference types="@cloudflare/workers-types" />

import { Context } from 'hono'

export interface CloudflareEnv {
  DB: D1Database
  ENVIRONMENT: 'development' | 'production'
  SECRET_KEY?: string
  SENDA_BASE_URL?: string
  ZENDESK_SUBDOMAIN?: string
  ZENDESK_EMAIL?: string
  ZENDESK_API_TOKEN?: string
  [key: string]: any
}

export interface TimeRecordPayload {
  company_id: string
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

export type AppEnv = { Bindings: CloudflareEnv }
export type HonoContext = Context<AppEnv>
