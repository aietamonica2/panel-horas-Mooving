/**
 * Internal Tasks Table Component
 * Shows internal tasks breakdown by employee and month
 */

import React from 'react'
import { TimeRecord } from '../types'

interface InternalTasksTableProps {
  records: TimeRecord[]  // Pre-filtered by work_type='internal'
}

const MOOVING_COLORS = {
  primary: '#1a5f7a',
  internalColor: '#6366f1',
  lightBg: '#f8fafc',
  border: '#e2e8f0',
}

// --- Sub-clasificación de tareas internas ---------------------------------
// Orden de prioridad y de despliegue de las sub-categorías.
const INTERNAL_SUBCATEGORIES = [
  'Ausencias (Vac./Lic.)',
  'Capacitación',
  'Reuniones',
  'Entrevistas',
  'RRHH',
  'Comercial',
  'Investigación',
  'Operaciones',
  'Otras internas',
] as const

const SUBCATEGORY_COLORS: { [k: string]: string } = {
  'Ausencias (Vac./Lic.)': '#ef4444', // rojo
  'Capacitación': '#0ea5e9',          // celeste
  'Reuniones': '#ec4899',             // rosa
  'Entrevistas': '#8b5cf6',           // violeta
  'RRHH': '#f97316',                  // naranja mooving
  'Comercial': '#10b981',             // verde
  'Investigación': '#6366f1',         // índigo
  'Operaciones': '#1a5f7a',           // azul mooving
  'Otras internas': '#64748b',        // gris
}

/** Normaliza texto a minúsculas y sin acentos (case/acento-insensitive). */
function normalizeDesc(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // elimina diacríticos combinantes
}

/** Deriva la sub-categoría de una tarea interna por palabra clave en la descripción. */
function internalSubcategory(record: TimeRecord): string {
  const d = normalizeDesc(record.description)
  if (/vacacion|licencia|franco|ausencia/.test(d)) return 'Ausencias (Vac./Lic.)'
  if (/capacitacion|onboarding|formacion/.test(d)) return 'Capacitación'
  if (/reunion|daily|sync|scrum/.test(d)) return 'Reuniones'
  if (/entrevista/.test(d)) return 'Entrevistas'
  if (/rrhh|recursos humanos/.test(d)) return 'RRHH'
  if (/comercial|venta/.test(d)) return 'Comercial'
  if (/investigacion|research/.test(d)) return 'Investigación'
  if (/operacion/.test(d)) return 'Operaciones'
  return 'Otras internas'
}

/** Agrupa horas y cantidad de registros internos por sub-categoría (orden fijo). */
function summarizeInternalSubcategories(
  internalRecords: TimeRecord[]
): { cat: string; hours: number; count: number }[] {
  const hoursByCat = new Map<string, number>()
  const countByCat = new Map<string, number>()
  internalRecords.forEach(r => {
    const cat = internalSubcategory(r)
    hoursByCat.set(cat, (hoursByCat.get(cat) || 0) + r.duration_decimal)
    countByCat.set(cat, (countByCat.get(cat) || 0) + 1)
  })
  return INTERNAL_SUBCATEGORIES
    .filter(cat => (countByCat.get(cat) || 0) > 0)
    .map(cat => ({ cat, hours: hoursByCat.get(cat) || 0, count: countByCat.get(cat) || 0 }))
}

interface EmployeeMonthData {
  employee: string
  months: Map<string, number>
  total: number
}

export const InternalTasksTable: React.FC<InternalTasksTableProps> = ({ records }) => {
  // Aggregate data by employee and month
  const aggregateData = (): {
    employees: EmployeeMonthData[]
    months: string[]
    monthTotals: Map<string, number>
  } => {
    const employeeData = new Map<string, Map<string, number>>()
    const allMonths = new Set<string>()
    const monthTotals = new Map<string, number>()

    // Process each record
    records.forEach(record => {
      const month = record.date.substring(0, 7) // YYYY-MM
      const employee = record.employee_name

      allMonths.add(month)

      // Initialize employee if needed
      if (!employeeData.has(employee)) {
        employeeData.set(employee, new Map())
      }

      // Add hours to employee/month
      const employeeMonths = employeeData.get(employee)!
      const current = employeeMonths.get(month) || 0
      employeeMonths.set(month, current + record.duration_decimal)

      // Add to month total
      const currentMonth = monthTotals.get(month) || 0
      monthTotals.set(month, currentMonth + record.duration_decimal)
    })

    // Convert to array and sort
    const months = Array.from(allMonths).sort()
    const employees: EmployeeMonthData[] = Array.from(employeeData.entries())
      .map(([employee, monthMap]) => ({
        employee,
        months: monthMap,
        total: Array.from(monthMap.values()).reduce((a, b) => a + b, 0),
      }))
      .sort((a, b) => b.total - a.total)

    return { employees, months, monthTotals }
  }

  const { employees, months, monthTotals } = aggregateData()
  const grandTotal = Array.from(monthTotals.values()).reduce((a, b) => a + b, 0)

  // Desglose de tareas internas por sub-categoría (derivado de la descripción)
  const subcatBreakdown = summarizeInternalSubcategories(records)

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b" style={{ borderColor: MOOVING_COLORS.border }}>
        <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: MOOVING_COLORS.primary }}>
          <span>⚙️</span> Tareas Internas por Empleado y Mes
        </h3>
      </div>

      {/* Desglose por sub-categoría */}
      {subcatBreakdown.length > 0 && (
        <div className="px-6 py-4 border-b" style={{ borderColor: MOOVING_COLORS.border }}>
          <p className="text-sm font-semibold mb-3" style={{ color: MOOVING_COLORS.primary }}>
            Desglose por sub-categoría
          </p>
          <div className="flex flex-wrap gap-2">
            {subcatBreakdown.map(({ cat, hours, count }) => {
              const color = SUBCATEGORY_COLORS[cat] || MOOVING_COLORS.internalColor
              return (
                <div
                  key={cat}
                  className="flex items-center gap-2 rounded-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700/40"
                  style={{ border: `1px solid ${color}33` }}
                >
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-200">{cat}</span>
                  <span className="text-xs font-bold" style={{ color }}>{hours.toFixed(1)}h</span>
                  <span className="text-[11px] text-gray-400">({count})</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead style={{ backgroundColor: MOOVING_COLORS.lightBg }}>
            <tr>
              <th className="px-6 py-3 text-left font-semibold" style={{ color: MOOVING_COLORS.primary }}>
                Empleado
              </th>
              {months.map(month => (
                <th
                  key={month}
                  className="px-4 py-3 text-center font-semibold whitespace-nowrap"
                  style={{ color: MOOVING_COLORS.primary }}
                >
                  {formatMonth(month)}
                </th>
              ))}
              <th className="px-6 py-3 text-center font-semibold" style={{ color: MOOVING_COLORS.primary }}>
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp, idx) => (
              <tr
                key={emp.employee}
                style={{
                  backgroundColor: idx % 2 === 0 ? '#fff' : MOOVING_COLORS.lightBg,
                  borderBottom: `1px solid ${MOOVING_COLORS.border}`,
                }}
              >
                <td className="px-6 py-3 font-medium text-gray-900">{emp.employee}</td>
                {months.map(month => (
                  <td key={`${emp.employee}-${month}`} className="px-4 py-3 text-center">
                    <span style={{ color: MOOVING_COLORS.internalColor, fontWeight: '600' }}>
                      {(emp.months.get(month) || 0).toFixed(1)}h
                    </span>
                  </td>
                ))}
                <td className="px-6 py-3 text-center font-bold" style={{ color: MOOVING_COLORS.internalColor }}>
                  {emp.total.toFixed(1)}h
                </td>
              </tr>
            ))}
            {/* Total Row */}
            <tr style={{ backgroundColor: MOOVING_COLORS.lightBg, fontWeight: 'bold' }}>
              <td className="px-6 py-3">Total por Mes</td>
              {months.map(month => (
                <td key={`total-${month}`} className="px-4 py-3 text-center">
                  <span style={{ color: MOOVING_COLORS.internalColor }}>
                    {(monthTotals.get(month) || 0).toFixed(1)}h
                  </span>
                </td>
              ))}
              <td className="px-6 py-3 text-center" style={{ color: MOOVING_COLORS.internalColor }}>
                {grandTotal.toFixed(1)}h
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="px-6 py-4 bg-gray-50 text-sm text-gray-600">
        <p>
          Total de horas en tareas internas: <strong style={{ color: MOOVING_COLORS.internalColor }}>{grandTotal.toFixed(1)}h</strong> en {employees.length} empleados
        </p>
      </div>
    </div>
  )
}

/**
 * Format month from YYYY-MM to Spanish month name and year
 */
function formatMonth(dateStr: string): string {
  const [year, month] = dateStr.split('-')
  const monthNames = [
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
  const monthName = monthNames[parseInt(month) - 1] || month
  return `${monthName}`
}
