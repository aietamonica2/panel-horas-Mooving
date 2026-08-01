/**
 * WorkType Table Component (B2 — tabla genérica consolidada)
 *
 * Renderiza el desglose Empleado × Mes para un tipo de trabajo (internal,
 * meeting, training, etc.). Reemplaza a las antiguas InternalTasksTable y
 * MeetingsTable, que eran ~95% idénticas entre sí.
 *
 * Es un componente "tonto": recibe registros (opcionalmente los filtra por
 * work_type) y, si el contenedor lo pide, muestra una fila de chips con un
 * desglose por sub-categoría ya calculado (p.ej. las sub-categorías de tareas
 * internas que computa TimeBagSection).
 */

import React from 'react'
import { TimeRecord } from '../types'
import { formatMonth } from '../utils/formatMonth'

export interface SubcategoryBreakdownItem {
  label: string
  hours: number
  count: number
  color: string
}

interface WorkTypeTableProps {
  records: TimeRecord[]
  /** Si se indica, filtra `records` por work_type; si no, los usa tal cual (ya pre-filtrados). */
  workType?: TimeRecord['work_type']
  title: string
  icon?: string
  /** Color de acento para los valores de horas y el total. */
  accentColor?: string
  /** Texto del pie, p.ej. "Total de horas en tareas internas". */
  footerLabel?: string
  /** Chips opcionales de desglose por sub-categoría (calculado por el contenedor). */
  breakdown?: SubcategoryBreakdownItem[]
  breakdownTitle?: string
}

const MOOVING_COLORS = {
  primary: '#1a5f7a',
  lightBg: '#f8fafc',
  border: '#e2e8f0',
}

interface EmployeeMonthData {
  employee: string
  months: Map<string, number>
  total: number
}

export const WorkTypeTable: React.FC<WorkTypeTableProps> = ({
  records,
  workType,
  title,
  icon = '📋',
  accentColor = '#6366f1',
  footerLabel = 'Total de horas',
  breakdown,
  breakdownTitle = 'Desglose por sub-categoría',
}) => {
  const filteredRecords = workType ? records.filter(r => r.work_type === workType) : records

  if (filteredRecords.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 text-center">
        <p className="text-gray-500">No hay registros de {title.toLowerCase()}</p>
      </div>
    )
  }

  // Aggregate data by employee and month
  const aggregateData = (): {
    employees: EmployeeMonthData[]
    months: string[]
    monthTotals: Map<string, number>
  } => {
    const employeeData = new Map<string, Map<string, number>>()
    const allMonths = new Set<string>()
    const monthTotals = new Map<string, number>()

    filteredRecords.forEach(record => {
      const month = record.date.substring(0, 7) // YYYY-MM
      const employee = record.employee_name || 'Desconocido'

      allMonths.add(month)

      if (!employeeData.has(employee)) {
        employeeData.set(employee, new Map())
      }

      const employeeMonths = employeeData.get(employee)!
      employeeMonths.set(month, (employeeMonths.get(month) || 0) + record.duration_decimal)

      monthTotals.set(month, (monthTotals.get(month) || 0) + record.duration_decimal)
    })

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

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b" style={{ borderColor: MOOVING_COLORS.border }}>
        <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: MOOVING_COLORS.primary }}>
          <span>{icon}</span> {title}
        </h3>
      </div>

      {/* Desglose por sub-categoría (opcional) */}
      {breakdown && breakdown.length > 0 && (
        <div className="px-6 py-4 border-b" style={{ borderColor: MOOVING_COLORS.border }}>
          <p className="text-sm font-semibold mb-3" style={{ color: MOOVING_COLORS.primary }}>
            {breakdownTitle}
          </p>
          <div className="flex flex-wrap gap-2">
            {breakdown.map(({ label, hours, count, color }) => (
              <div
                key={label}
                className="flex items-center gap-2 rounded-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700/40"
                style={{ border: `1px solid ${color}33` }}
              >
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-200">{label}</span>
                <span className="text-xs font-bold" style={{ color }}>{hours.toFixed(1)}h</span>
                <span className="text-[11px] text-gray-400">({count})</span>
              </div>
            ))}
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
                    <span style={{ color: accentColor, fontWeight: '600' }}>
                      {(emp.months.get(month) || 0).toFixed(1)}h
                    </span>
                  </td>
                ))}
                <td className="px-6 py-3 text-center font-bold" style={{ color: accentColor }}>
                  {emp.total.toFixed(1)}h
                </td>
              </tr>
            ))}
            {/* Total Row */}
            <tr style={{ backgroundColor: MOOVING_COLORS.lightBg, fontWeight: 'bold' }}>
              <td className="px-6 py-3">Total por Mes</td>
              {months.map(month => (
                <td key={`total-${month}`} className="px-4 py-3 text-center">
                  <span style={{ color: accentColor }}>
                    {(monthTotals.get(month) || 0).toFixed(1)}h
                  </span>
                </td>
              ))}
              <td className="px-6 py-3 text-center" style={{ color: accentColor }}>
                {grandTotal.toFixed(1)}h
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="px-6 py-4 bg-gray-50 text-sm text-gray-600">
        <p>
          {footerLabel}: <strong style={{ color: accentColor }}>{grandTotal.toFixed(1)}h</strong> en {employees.length} empleados
        </p>
      </div>
    </div>
  )
}
