/**
 * Editable email templates ("mensajes estándar") — defaults + interpolation.
 *
 * Three standard cases, each with a Spanish label and the list of variables the
 * body/subject may reference. Tenants can override the subject/body of any case
 * (stored in the `email_templates` table, migration 0020); when no override row
 * exists we fall back to the DEFAULT_TEMPLATES below.
 *
 * The default texts use an "employee-ownership" tone: the registro de horas is
 * presented as the person's own record to keep up to date, not a request from
 * management.
 *
 * Variables are written as {firstName}, {hours}, {month}, {days} and substituted
 * by renderTemplate(). Keys are CASE-SENSITIVE and must match exactly.
 */

/** The three editable cases. Order is the order returned by get_email_templates. */
export const TEMPLATE_KEYS: string[] = ['reminder_hours', 'reminder_zero', 'inactivity'];

/** Spanish label + available variables per case (for the settings UI). */
export const TEMPLATE_META: Record<string, { label: string; variables: string[] }> = {
  reminder_hours: {
    label: 'Recordatorio mensual (con horas)',
    variables: ['firstName', 'hours', 'month'],
  },
  reminder_zero: {
    label: 'Recordatorio mensual (sin horas)',
    variables: ['firstName', 'month'],
  },
  inactivity: {
    label: 'Alerta de inactividad',
    variables: ['firstName', 'days'],
  },
};

/**
 * Default subject/body per case (employee-ownership tone). Used verbatim when the
 * tenant has not saved an override. Variables use {var} placeholders.
 */
export const DEFAULT_TEMPLATES: Record<string, { subject: string; body: string }> = {
  reminder_hours: {
    subject: 'Tus horas de {month} — mantené tu registro al día',
    body:
      'Hola {firstName},\n\n' +
      'Este es tu recordatorio para mantener tu carga de horas al día. Por ahora figuran {hours} horas registradas a tu nombre en {month}. Revisá que esté completo y sumá lo que falte para que tu registro refleje tu trabajo real.\n\n' +
      '¡Gracias por mantenerlo actualizado!\n' +
      'Equipo Mooving Tech',
  },
  reminder_zero: {
    subject: 'Cargá tus horas de {month}',
    body:
      'Hola {firstName},\n\n' +
      'Todavía no figuran horas cargadas a tu nombre en {month}. Tomate unos minutos para registrar tu trabajo y mantené tu carga al día — es la forma de que tus horas queden reflejadas.\n\n' +
      'Gracias,\n' +
      'Equipo Mooving Tech',
  },
  inactivity: {
    subject: 'Recordá cargar tus horas',
    body:
      'Hola {firstName},\n\n' +
      'Notamos que hace {days} días no registrás horas. Recordá mantener tu carga al día sumando tu trabajo reciente. Si ya lo hiciste, ¡gracias y podés ignorar este mensaje!\n\n' +
      'Equipo Mooving Tech',
  },
};

/**
 * Replaces every {var} in `text` with vars[var]. Missing variables render as an
 * empty string. Keys are case-sensitive and matched exactly as written.
 */
export function renderTemplate(text: string, vars: Record<string, string | number>): string {
  return String(text ?? '').replace(/\{(\w+)\}/g, (_match, key: string) => {
    const v = vars[key];
    return v === undefined || v === null ? '' : String(v);
  });
}

/**
 * Loads the tenant override for (company_id, template_key) from the DB, falling
 * back to the built-in default when there is no row (or on any read error, e.g.
 * the table not existing yet). Shared by the MCP tools and both send paths so
 * every path resolves templates identically.
 *
 * Uses `.all()` (not `.first()`) so it works against every D1 stub in the test
 * suite as well as real D1.
 */
export async function loadTemplate(
  db: any,
  company_id: string,
  template_key: string
): Promise<{ subject: string; body: string; is_default: boolean }> {
  try {
    const res = await db
      .prepare('SELECT subject, body FROM email_templates WHERE company_id = ? AND template_key = ?')
      .bind(company_id, template_key)
      .all();
    const row = res && res.results && res.results[0];
    if (row && row.subject && row.body) {
      return { subject: String(row.subject), body: String(row.body), is_default: false };
    }
  } catch {
    // Tabla ausente o error de lectura → caemos al texto por defecto.
  }
  const def = DEFAULT_TEMPLATES[template_key] || { subject: '', body: '' };
  return { subject: def.subject, body: def.body, is_default: true };
}
