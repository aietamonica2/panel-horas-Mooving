/**
 * Meetings Table Component
 * Shows team meetings breakdown by employee and month
 */

import React from 'react'
import { TimeRecord } from '../types'

interface MeetingsTableProps {
  records: TimeRecord[]  // Pre-filtered by work_type='meeting'
}

const MOOVING_COLORS = {
  primary: '#1a5f7a',
  meetingColor: '#ec4899',
  lightBg: '#f8fafc',
  border: '#e2e8f0',
}

interface EmployeeMonthData {
  employee: string
  months: Map<string, number>
  total: number
}

export const MeetingsTable: React.FC<MeetingsTableProps> = ({ records }) => {
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
      employeeMonths.set(month, current + record.duration_hours)

      // Add to month total
      const currentMonth = monthTotals.get(month) || 0
      monthTotals.set(month, currentMonth + record.duration_hours)
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

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b" style={{ borderColor: MOOVING_COLORS.border }}>
        <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: MOOVING_COLORS.primary }}>
          <span>👥</span> Reuniones de Equipo por Empleado y Mes
        </h3>
      </div>
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
                    <span style={{ color: MOOVING_COLORS.meetingColor, fontWeight: '600' }}>
                      {(emp.months.get(month) || 0).toFixed(1)}h
                    </span>
                  </td>
                ))}
                <td className="px-6 py-3 text-center font-bold" style={{ color: MOOVING_COLORS.meetingColor }}>
                  {emp.total.toFixed(1)}h
                </td>
              </tr>
            ))}
            {/* Total Row */}
            <tr style={{ backgroundColor: MOOVING_COLORS.lightBg, fontWeight: 'bold' }}>
              <td className="px-6 py-3">Total por Mes</td>
              {months.map(month => (
                <td key={`total-${month}`} className="px-4 py-3 text-center">
                  <span style={{ color: MOOVING_COLORS.meetingColor }}>
                    {(monthTotals.get(month) || 0).toFixed(1)}h
                  </span>
                </td>
              ))}
              <td className="px-6 py-3 text-center" style={{ color: MOOVING_COLORS.meetingColor }}>
                {grandTotal.toFixed(1)}h
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="px-6 py-4 bg-gray-50 text-sm text-gray-600">
        <p>
          Total de horas en reuniones: <strong style={{ color: MOOVING_COLORS.meetingColor }}>{grandTotal.toFixed(1)}h</strong> en {employees.length} empleados
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
