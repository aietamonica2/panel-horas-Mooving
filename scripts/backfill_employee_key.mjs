#!/usr/bin/env node
/**
 * B5 — Backfill de time_records.employee_key (identidad canónica, migración 0022).
 *
 * Genera a stdout los UPDATE SQL que completan employee_key en los registros
 * HISTÓRICOS, usando EL MISMO resolvedor de identidad que las ingestas
 * (apps/api/src/lib/identity.ts: id exacto → alias → normKey). Identidades que
 * no resuelven salen como comentario `-- SIN RESOLVER: ...` para revisión manual.
 * El script NO toca ninguna base: sólo emite SQL; el orquestador lo corre
 * contra prod (p.ej. con `wrangler d1 execute`).
 *
 * USO
 *   node scripts/backfill_employee_key.mjs '<json>'          # JSON inline por argv
 *   node scripts/backfill_employee_key.mjs input.json        # o ruta a un archivo .json
 *   node scripts/backfill_employee_key.mjs input.json > backfill.sql
 *
 * INPUT (JSON): { employees, aliases, identities }
 *   employees:  filas de `employees`        → [{ company_id?, id, name, email, is_active }]
 *   aliases:    filas de `employee_aliases` → [{ company_id?, alias_email, alias_name, employee_id }]
 *   identities: filas DISTINCT de time_records
 *               → [{ company_id?, employee_id, employee_name }]
 *               p.ej.: SELECT DISTINCT company_id, employee_id, employee_name FROM time_records;
 *   company_id ausente en una fila → 'mooving-default' (mismo fallback del backend).
 *
 * OUTPUT (stdout): una sentencia por identidad resuelta:
 *   UPDATE time_records SET employee_key='<canonical>' WHERE company_id='<cid>'
 *     AND employee_id='<raw>' AND employee_name='<raw>';
 * y al final los `-- SIN RESOLVER: ...` + un resumen comentado.
 *
 * Resolvedor: se intenta importar el módulo TS compartido (Node >= 22.18 hace
 * type-stripping nativo). Si el runtime no puede importar TS, se usa la COPIA
 * EXACTA local de normKey + buildIdentityResolver incluida abajo.
 */

import { readFileSync, existsSync } from 'node:fs';

const DEFAULT_COMPANY = 'mooving-default';

// ---------------------------------------------------------------------------
// Copia local del resolvedor — copia exacta de apps/api/src/lib/identity.ts
// (normKey + buildIdentityResolver, sin las anotaciones de tipos). Se usa SOLO
// si el import del módulo TS falla en este runtime. Si cambiás identity.ts,
// actualizá esta copia.
// ---------------------------------------------------------------------------

/** copia exacta de identity.ts */
function normKeyCopy(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[.\s_@-]+/g, '');
}

/** copia exacta de identity.ts */
function buildIdentityResolverCopy(employees, aliasRows) {
  const normKey = normKeyCopy;
  const emps = employees || [];

  // (a) ids canónicos existentes.
  const canonicalIds = new Set();
  for (const e of emps) {
    if (e && e.id) canonicalIds.add(String(e.id));
  }

  // (b) mapa de alias normalizados → employee_id. Ante claves repetidas gana
  // la PRIMERA fila (orden de aliasRows), para que el resultado sea estable.
  const aliasToEmp = {};
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
      const keys = new Set();
      const nameKey = normKey(e.name || '');
      if (nameKey) keys.add(nameKey);
      const emailLocalKey = normKey(String(e.email || '').split('@')[0]);
      if (emailLocalKey) keys.add(emailLocalKey);
      const active =
        e.is_active === undefined || e.is_active === null ? true : !!Number(e.is_active);
      return { id: String(e.id), active, keys };
    });

  return (rawId, rawName, rawEmail) => {
    const id = String(rawId ?? '');
    const name = String(rawName ?? '');
    const email = String(rawEmail ?? '');

    if (id && canonicalIds.has(id)) return id;

    const candidates = [];
    for (const k of [normKey(id), normKey(name), normKey(email.split('@')[0])]) {
      if (k && !candidates.includes(k)) candidates.push(k);
    }
    if (candidates.length === 0) return null;

    for (const k of candidates) {
      const target = aliasToEmp[k];
      if (target && canonicalIds.has(target)) return target;
    }

    let firstInactiveMatch = null;
    for (const emp of empEntries) {
      if (!candidates.some((k) => emp.keys.has(k))) continue;
      if (emp.active) return emp.id;
      if (firstInactiveMatch === null) firstInactiveMatch = emp.id;
    }
    return firstInactiveMatch;
  };
}

/**
 * Intenta usar el MISMO módulo que las ingestas (import TS nativo de Node);
 * si falla, cae a la copia exacta local.
 */
async function loadResolverFactory() {
  try {
    const mod = await import(new URL('../apps/api/src/lib/identity.ts', import.meta.url));
    if (typeof mod.buildIdentityResolver === 'function') {
      return { buildIdentityResolver: mod.buildIdentityResolver, source: 'apps/api/src/lib/identity.ts (import TS)' };
    }
  } catch {
    // Runtime sin type-stripping: usamos la copia exacta local.
  }
  return { buildIdentityResolver: buildIdentityResolverCopy, source: 'copia exacta local de identity.ts' };
}

// ---------------------------------------------------------------------------
// Input / helpers SQL
// ---------------------------------------------------------------------------

function readInput() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Uso: node scripts/backfill_employee_key.mjs \'<json>\' | <ruta.json>');
    console.error('JSON esperado: { "employees": [...], "aliases": [...], "identities": [...] }');
    process.exit(1);
  }
  let raw = arg;
  // Si el argumento es una ruta existente (no un JSON inline), se lee el archivo.
  if (!arg.trim().startsWith('{') && existsSync(arg)) {
    raw = readFileSync(arg, 'utf8');
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    console.error('No se pudo parsear el JSON de entrada:', err.message);
    process.exit(1);
  }
  for (const key of ['employees', 'aliases', 'identities']) {
    if (!Array.isArray(data[key])) {
      console.error(`El JSON de entrada debe tener un array "${key}".`);
      process.exit(1);
    }
  }
  return data;
}

/** Escapa comillas simples para literal SQL. */
const sq = (s) => String(s).replace(/'/g, "''");

/** Condición SQL para una columna que puede venir NULL en la fila DISTINCT. */
function eqOrNull(column, value) {
  if (value === null || value === undefined) return `${column} IS NULL`;
  return `${column}='${sq(value)}'`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const { employees, aliases, identities } = readInput();
const { buildIdentityResolver, source } = await loadResolverFactory();

// Resolvedor POR TENANT: el padrón y los alias de una empresa nunca deben
// resolver identidades de otra (aislamiento multi-tenant, MT-02).
const cidOf = (row) => (row && row.company_id ? String(row.company_id) : DEFAULT_COMPANY);
const resolvers = new Map();
function resolverFor(company_id) {
  if (!resolvers.has(company_id)) {
    resolvers.set(
      company_id,
      buildIdentityResolver(
        employees.filter((e) => cidOf(e) === company_id),
        aliases.filter((a) => cidOf(a) === company_id)
      )
    );
  }
  return resolvers.get(company_id);
}

const updates = [];
const unresolved = [];
const seen = new Set();

for (const ident of identities) {
  const company_id = cidOf(ident);
  const rawId = ident.employee_id ?? null;
  const rawName = ident.employee_name ?? null;

  // Dedupe defensivo por (tenant, id, nombre): un UPDATE por identidad.
  const dedupeKey = JSON.stringify([company_id, rawId, rawName]);
  if (seen.has(dedupeKey)) continue;
  seen.add(dedupeKey);

  const canonical = resolverFor(company_id)(rawId ?? '', rawName ?? '');

  if (canonical) {
    updates.push(
      `UPDATE time_records SET employee_key='${sq(canonical)}' ` +
        `WHERE company_id='${sq(company_id)}' AND ${eqOrNull('employee_id', rawId)} AND ${eqOrNull('employee_name', rawName)};`
    );
  } else {
    unresolved.push(
      `-- SIN RESOLVER: company_id='${sq(company_id)}' employee_id=${rawId === null ? 'NULL' : `'${sq(rawId)}'`} ` +
        `employee_name=${rawName === null ? 'NULL' : `'${sq(rawName)}'`} — revisar manualmente ` +
        `(crear alias con link_external_user o corregir la ficha) y re-correr el backfill.`
    );
  }
}

const out = [];
out.push('-- B5 backfill de time_records.employee_key — generado por scripts/backfill_employee_key.mjs');
out.push(`-- Resolvedor: ${source}`);
out.push(`-- Identidades de entrada: ${seen.size} | resueltas: ${updates.length} | sin resolver: ${unresolved.length}`);
out.push('-- Idempotente: re-ejecutar produce el mismo estado. No borra ni inventa identidades.');
out.push('');
out.push(...updates);
if (unresolved.length > 0) {
  out.push('');
  out.push('-- ---------------------------------------------------------------');
  out.push('-- Identidades SIN resolución automática (employee_key queda NULL):');
  out.push('-- ---------------------------------------------------------------');
  out.push(...unresolved);
}
process.stdout.write(out.join('\n') + '\n');
