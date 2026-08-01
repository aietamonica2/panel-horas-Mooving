/**
 * N4 — Audit log ("quién cambió qué y cuándo").
 *
 * Helper compartido para escribir entradas en la tabla `audit_logs`
 * (migración 0021) desde las rutas REST (routes/data.ts) y las tools MCP
 * (mcp/server.ts).
 *
 * REGLA DE ORO: la auditoría NUNCA rompe el flujo principal. `logAudit`
 * envuelve todo en try/catch y traga cualquier error (tabla inexistente,
 * DB caída, stub de test incompleto, etc.), sólo dejando un console.error.
 */

export type AuditAction = 'create' | 'update' | 'delete'

export interface AuditEntry {
  /** Tenant dueño de la entrada. SIEMPRE el company_id del principal. */
  company_id: string
  /** Quién hizo el cambio (user_id del principal autenticado). */
  actor_id?: string | null
  /** Nombre legible del actor (name/email del JWT; fallback user_id). */
  actor_name?: string | null
  /** Rol del actor al momento del cambio (admin/employee/service/...). */
  actor_role?: string | null
  action: AuditAction
  /** Entidad afectada, p.ej. 'time_record', 'employee', 'email_template'. */
  entity: string
  entity_id?: string | null
  /** Resumen corto legible, p.ej. "Editó registro 5.5h de Bautista Barrio (2026-07-15)". */
  summary?: string | null
}

/**
 * Deriva los campos de actor a partir del payload de auth (c.get('auth')).
 * Tolerante a payloads parciales (dev/default/service principals).
 */
export function actorFromAuth(auth: any): Pick<AuditEntry, 'actor_id' | 'actor_name' | 'actor_role'> {
  return {
    actor_id: auth?.user_id ?? null,
    actor_name: auth?.name || auth?.email || auth?.user_id || null,
    actor_role: auth?.role ?? null,
  }
}

/**
 * Inserta una fila de auditoría. Best-effort: cualquier error se loguea y se
 * ignora, para que un fallo de auditoría jamás rompa la operación auditada.
 * `created_at` lo completa la DB (DEFAULT datetime('now')).
 */
export async function logAudit(db: D1Database, entry: AuditEntry): Promise<void> {
  try {
    await db
      .prepare(
        `INSERT INTO audit_logs (
          id, company_id, actor_id, actor_name, actor_role, action, entity, entity_id, summary
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        crypto.randomUUID(),
        entry.company_id,
        entry.actor_id ?? null,
        entry.actor_name ?? null,
        entry.actor_role ?? null,
        entry.action,
        entry.entity,
        entry.entity_id ?? null,
        entry.summary ?? null
      )
      .run()
  } catch (err) {
    // Silencioso a propósito: la auditoría nunca debe romper el flujo principal.
    console.error('[audit] logAudit falló (ignorado):', err)
  }
}
