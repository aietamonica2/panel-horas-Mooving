/**
 * B5 — Identidad canónica de empleados (módulo compartido).
 *
 * Problema histórico: los time_records quedan bajo identificadores con formato
 * distinto según el origen. Ejemplos reales de la auditoría:
 *   - ficha `emp_admin_1` / "Mónica Aieta"  vs. Clockify employee_id='monica-aieta',
 *     employee_name='monica.aieta'
 *   - ficha "felipe.gutierrez"              vs. 'felipe-gutierrez' / 'felipe.gutierrez'
 *   - ficha `emp_7db45c63` / "Bautista Barrio"
 * Eso rompía métricas, inactividad y drafts, que matcheaban por igualdad exacta.
 *
 * Este módulo centraliza la resolución raw → employees.id canónico:
 *   - normKey(): normalización de identificadores (minúsculas, sin acentos,
 *     sin separadores). Movida acá desde mcp/email_templates.ts, que la
 *     re-exporta para no romper imports existentes.
 *   - buildIdentityResolver(): resolvedor puro (sin DB) con prioridad
 *     id exacto → alias → normKey.
 *   - loadIdentityResolver() / resolveEmployeeKeyForInsert(): helpers async
 *     que cargan employees + employee_aliases del tenant y resuelven.
 *
 * Lo usan las ingestas (Clockify, Zendesk, MCP create_*, routes/data) para
 * setear `time_records.employee_key` (migración 0022) al insertar, y el script
 * de backfill (scripts/backfill_employee_key.mjs) para los registros históricos.
 * Regla de oro: si no se puede resolver, employee_key queda NULL — NUNCA se
 * inventa una identidad.
 */

/**
 * Normaliza un identificador de persona: minúsculas, sin acentos y sin
 * separadores (punto, espacio, guion, guion bajo, arroba). Así "juan.cruz",
 * "juan-cruz", "Juan Cruz" y "JUANCRUZ" colapsan al mismo valor.
 */
export function normKey(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[.\s_@-]+/g, '');
}

/** Fila mínima de `employees` que necesita el resolvedor. */
export interface IdentityEmployeeRow {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  /** 0/1 (D1) o boolean. Ausente/null se trata como activo. */
  is_active?: number | boolean | null;
}

/** Fila mínima de `employee_aliases` que necesita el resolvedor. */
export interface IdentityAliasRow {
  alias_email?: string | null;
  alias_name?: string | null;
  employee_id?: string | null;
}

/**
 * Resolvedor de identidad: (rawId, rawName, rawEmail?) → employees.id canónico
 * o null si ninguna regla matchea (nunca inventa).
 */
export type IdentityResolver = (
  rawId: string,
  rawName: string,
  rawEmail?: string
) => string | null;

/**
 * Construye el resolvedor canónico de identidad a partir del padrón de
 * empleados y la tabla de alias del tenant (ambos YA cargados — el resolvedor
 * es puro y no toca la DB, así se puede reusar por fila en un sync).
 *
 * Prioridad de resolución (primer match gana):
 *  (a) rawId igual EXACTO a un employees.id (ya es canónico).
 *  (b) alias: normKey(alias_name) o normKey(local-part de alias_email) →
 *      employee_id, buscando por normKey(rawId), normKey(rawName) y
 *      normKey(local-part de rawEmail). Sólo se acepta si el employee_id del
 *      alias existe en el padrón (el contrato es devolver un id canónico real).
 *  (c) normKey(rawId) / normKey(rawName) / normKey(local-part de rawEmail)
 *      igual a normKey(employee.name) o al local-part normalizado del email de
 *      la ficha. Empates dentro de (c): se prefieren empleados ACTIVOS; a
 *      igualdad de actividad, el primero en el orden de `employees`.
 */
export function buildIdentityResolver(
  employees: IdentityEmployeeRow[],
  aliasRows: IdentityAliasRow[]
): IdentityResolver {
  const emps = employees || [];

  // (a) ids canónicos existentes.
  const canonicalIds = new Set<string>();
  for (const e of emps) {
    if (e && e.id) canonicalIds.add(String(e.id));
  }

  // (b) mapa de alias normalizados → employee_id. Ante claves repetidas gana
  // la PRIMERA fila (orden de aliasRows), para que el resultado sea estable.
  const aliasToEmp: Record<string, string> = {};
  for (const a of aliasRows || []) {
    if (!a || !a.employee_id) continue;
    const target = String(a.employee_id);
    const nameKey = normKey(a.alias_name || '');
    if (nameKey && !(nameKey in aliasToEmp)) aliasToEmp[nameKey] = target;
    const emailLocalKey = normKey(String(a.alias_email || '').split('@')[0]);
    if (emailLocalKey && !(emailLocalKey in aliasToEmp)) aliasToEmp[emailLocalKey] = target;
  }

  // (c) claves normalizadas por empleado (nombre + local-part del email).
  const empEntries = emps
    .filter((e) => e && e.id)
    .map((e) => {
      const keys = new Set<string>();
      const nameKey = normKey(e.name || '');
      if (nameKey) keys.add(nameKey);
      const emailLocalKey = normKey(String(e.email || '').split('@')[0]);
      if (emailLocalKey) keys.add(emailLocalKey);
      // is_active ausente/null → activo (padrones parciales de stubs/tests).
      const active =
        e.is_active === undefined || e.is_active === null ? true : !!Number(e.is_active);
      return { id: String(e.id), active, keys };
    });

  return (rawId: string, rawName: string, rawEmail?: string): string | null => {
    const id = String(rawId ?? '');
    const name = String(rawName ?? '');
    const email = String(rawEmail ?? '');

    // (a) el id crudo YA es un id canónico.
    if (id && canonicalIds.has(id)) return id;

    // Claves candidatas normalizadas, en orden de prioridad, sin vacíos ni dupes.
    const candidates: string[] = [];
    for (const k of [normKey(id), normKey(name), normKey(email.split('@')[0])]) {
      if (k && !candidates.includes(k)) candidates.push(k);
    }
    if (candidates.length === 0) return null;

    // (b) resolución vía employee_aliases.
    for (const k of candidates) {
      const target = aliasToEmp[k];
      if (target && canonicalIds.has(target)) return target;
    }

    // (c) match normalizado contra nombre / local-part del email de la ficha.
    // Se prefiere el primer empleado ACTIVO que matchee; si sólo matchean
    // inactivos, se devuelve el primero de ellos.
    let firstInactiveMatch: string | null = null;
    for (const emp of empEntries) {
      if (!candidates.some((k) => emp.keys.has(k))) continue;
      if (emp.active) return emp.id;
      if (firstInactiveMatch === null) firstInactiveMatch = emp.id;
    }
    return firstInactiveMatch;
  };
}

/**
 * Carga employees + employee_aliases del tenant y devuelve el resolvedor listo.
 * Pensado para ingestas por lote (Clockify/Zendesk/CSV): se llama UNA vez por
 * sync y se reusa la función devuelta por cada fila.
 *
 * Best-effort: si alguna de las dos consultas falla (tabla ausente en un stub
 * de test, D1 caído), se sigue con lo que haya — en el peor caso el resolvedor
 * no matchea nada y todo resuelve a null (nunca rompe la ingesta).
 */
export async function loadIdentityResolver(
  db: any,
  company_id: string
): Promise<IdentityResolver> {
  let employees: IdentityEmployeeRow[] = [];
  try {
    const res = await db
      .prepare('SELECT id, name, email, is_active FROM employees WHERE company_id = ?')
      .bind(company_id)
      .all();
    employees = ((res && res.results) || []) as IdentityEmployeeRow[];
  } catch {
    employees = [];
  }

  let aliases: IdentityAliasRow[] = [];
  try {
    const res = await db
      .prepare('SELECT alias_email, alias_name, employee_id FROM employee_aliases WHERE company_id = ?')
      .bind(company_id)
      .all();
    aliases = ((res && res.results) || []) as IdentityAliasRow[];
  } catch {
    aliases = [];
  }

  return buildIdentityResolver(employees, aliases);
}

/**
 * Helper de conveniencia para inserciones INDIVIDUALES (create_time_record,
 * POST /records, PUT /records/:id): carga el padrón del tenant y resuelve una
 * única identidad. Para lotes usá loadIdentityResolver() una sola vez.
 *
 * No cachea entre requests a propósito: en Workers el binding D1 persiste entre
 * requests del mismo isolate y un cache module-level serviría padrones viejos
 * (p.ej. un empleado recién creado no resolvería).
 *
 * @returns el employees.id canónico o null si no se pudo resolver (nunca inventa).
 */
export async function resolveEmployeeKeyForInsert(
  db: any,
  company_id: string,
  rawId: string,
  rawName: string
): Promise<string | null> {
  const resolve = await loadIdentityResolver(db, company_id);
  return resolve(rawId, rawName);
}
