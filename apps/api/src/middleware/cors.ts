/**
 * CORS middleware
 * Handles cross-origin requests from frontend.
 *
 * Hardening (SEC-10):
 *  - The production frontend origins (the *.pages.dev list) are always allowed.
 *  - http://localhost:* is reflected ONLY when ENVIRONMENT === 'development'.
 *  - Unknown origins receive NO Access-Control-Allow-Origin header — there is no
 *    permissive `allowedOrigins[0]` fallback.
 *  - The specific origin is reflected (never a `*` wildcard) and is never paired
 *    with Access-Control-Allow-Credentials.
 */

import { Context, Next } from 'hono'
import { HonoContext } from '../types'

export const cors = async (c: HonoContext, next: Next) => {
  const origin = c.req.header('Origin') || ''
  
  // Production frontend origins — the real deployed frontend. Do NOT remove these.
  const allowedOrigins = [
    'https://panel-horas-web.pages.dev',
    'https://panel-horas-mooving.pages.dev'
  ]
  // Also allow Cloudflare Pages preview subdomains of OUR projects only
  // (e.g. https://5b826dcd.panel-horas-mooving.pages.dev). Still restricted to
  // these two project names — no wildcard for arbitrary origins.
  const allowedOriginPattern =
    /^https:\/\/([a-z0-9-]+\.)?(panel-horas-mooving|panel-horas-web)\.pages\.dev$/

  const isDevelopment = c.env?.ENVIRONMENT === 'development'

  // Reflect the request Origin ONLY when it is explicitly allowed: a known
  // production origin or a preview subdomain of our Pages projects (always), or
  // any http://localhost:* origin but ONLY in development. Unknown origins get NO
  // Access-Control-Allow-Origin header — there is no permissive fallback.
  if (
    allowedOrigins.includes(origin) ||
    allowedOriginPattern.test(origin) ||
    (isDevelopment && origin.startsWith('http://localhost:'))
  ) {
    c.header('Access-Control-Allow-Origin', origin)
    c.header('Vary', 'Origin')
  }

  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (c.req.method === 'OPTIONS') {
    return c.text('', 204)
  }
  
  await next()
}
