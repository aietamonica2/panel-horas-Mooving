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
  SENDA_API_KEY?: string
  ZENDESK_SUBDOMAIN?: string
  ZENDESK_EMAIL?: string
  ZENDESK_API_TOKEN?: string
  CLOCKIFY_API_TOKEN?: string
  SENDGRID_API_KEY?: string
  SENDGRID_FROM_EMAIL?: string
  RESEND_API_KEY?: string
  RESEND_FROM_EMAIL?: string
  [key: string]: any
}

/** Alias used by cron handlers and Workers entry-point */
export type Env = CloudflareEnv

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
