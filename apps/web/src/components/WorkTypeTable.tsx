/**
 * WorkType Table Component (B9-FIX Generic Refactor)
 * Renders employee vs month breakdown for any specific work_type (internal, meeting, training, etc.)
 */

import React from 'react'
import { TimeRecord } from '../types'

interface WorkTypeTableProps {
  records: TimeRecord[]
  workType?: 'internal' | 'meeting' | 'training' | 'project' | 'other'
  title: string
  icon?: string
  accentColor?: string
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

const MONTHS_ES: Record<string, string> = {
  '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr',
  '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic'
}

export const WorkTypeTable: React.FC<WorkTypeTableProps> = ({
  records,
  workType,
  title,
  icon = '📋',
  accentColor = '#6366f1'
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
      const current = employeeMonths.get(month) || 0
      employeeMonths.set(month, current + record.duration_decimal)

      const currentMonth = monthTotals.get(month) || 0
      monthTotals.set(month, currentMonth + record.duration_decimal)
    })

    const months = Array.from(allMonths).sort()

    const employees: EmployeeMonthData[] = Array.from(employeeData.entries()).map(
      ([employee, monthsMap]) => {
        const total = Array.from(monthsMap.values()).reduce((sum, h) => sum + h, 0)
        return { employee, months: monthsMap, total }
      }
    ).sort((a, b) => b.total - a.total)

    return { employees, months, monthTotals }
  }

  const { employees, months, monthTotals } = aggregateData()
  const grandTotal = Array.from(monthTotals.values()).reduce((sum, h) => sum + h, 0)

  const formatMonth = (ym: string) => {
    const [year, month] = ym.split('-')
    return `${MONTHS_ES[month] || month} ${year?.slice(2) || ''}`
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border-t-4" style={{ borderColor: accentColor }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: MOOVING_COLORS.primary }}>
          <span>{icon}</span> {title}
        </h3>
        <span className="text-sm font-semibold px-3 py-1 bg-gray-100 rounded-full text-gray-700">
          Total: {grandTotal.toFixed(1)}h
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr style={{ background: accentColor, color: 'white' }}>
              <th className="px-4 py-3 text-left font-semibold rounded-tl-lg">Empleado</th>
              {months.map(m => (
                <th key={m} className="px-3 py-3 text-center font-semibold whitespace-nowrap">
                  {formatMonth(m)}
                </th>
              ))}
              <th className="px-4 py-3 text-right font-semibold rounded-tr-lg">Total</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp, index) => (
              <tr
                key={emp.employee}
                className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                style={{ borderBottom: `1px solid ${MOOVING_COLORS.border}` }}
              >
                <td className="px-4 py-3 font-medium text-gray-900">{emp.employee}</td>
                {months.map(m => {
                  const hours = emp.months.get(m) || 0
                  return (
                    <td key={m} className="px-3 py-3 text-center text-gray-600">
                      {hours > 0 ? `${hours.toFixed(1)}h` : '-'}
                    </td>
                  )
                })}
                <td className="px-4 py-3 text-right font-bold text-gray-900">
                  {emp.total.toFixed(1)}h
                </td>
              </tr>
            ))}
            <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
              <td className="px-4 py-3 text-gray-900">Total General</td>
              {months.map(m => (
                <td key={m} className="px-3 py-3 text-center text-gray-900">
                  {(monthTotals.get(m) || 0).toFixed(1)}h
                </td>
              ))}
              <td className="px-4 py-3 text-right text-gray-900">
                {grandTotal.toFixed(1)}h
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
