/**
 * Formatea un identificador de mes en formato `YYYY-MM` (o `YYYY-MM-DD`) al
 * nombre del mes en español.
 *
 * Helper compartido por InternalTasksTable y MeetingsTable. Antes cada tabla
 * declaraba su propia copia idéntica de esta función (deuda técnica B9) y
 * desestructuraba `const [year, month]` dejando `year` sin usar (lint B10).
 * Centralizarlo elimina ambos problemas.
 */
const MONTH_NAMES_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

export function formatMonth(dateStr: string): string {
  const month = (dateStr || '').split('-')[1] ?? ''
  return MONTH_NAMES_ES[parseInt(month, 10) - 1] || month
}
