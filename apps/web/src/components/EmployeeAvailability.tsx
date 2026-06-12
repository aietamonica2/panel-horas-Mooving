/**
 * Employee Availability Component
 * Shows available hours vs registered hours per employee per month
 */

import React from 'react'
import { TimeRecord } from '../types'

interface EmployeeAvailabilityProps {
  records: TimeRecord[]
}

const MOOVING_COLORS = {
  primary: '#1a5f7a',
  secondary: '#f97316',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
}

export const EmployeeAvailability: React.FC<EmployeeAvailabilityProps> = ({ records }) => {
  if (records.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-8 text-center">
        <p className="text-gray-500">No hay registros disponibles</p>
      </div>
    )
  }

  // Extract unique months
  const uniqueMonths = Array.from(new Set(
    records.map(r => r.date.substring(0, 7))
  )).sort()

  // Extract unique employees
  const uniqueEmployees = Array.from(new Set(
    records.map(r => r.employee_name)
  )).sort()

  // Calculate business days in month
  const getBusinessDaysInMonth = (yearMonth: string) => {
    const [year, month] = yearMonth.split('-')
    const date = new Date(`${year}-${month}-01`)
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()

    let businessDays = 0
    for (let day = 1; day <= lastDay; day++) {
      const currentDate = new Date(parseInt(year), parseInt(month) - 1, day)
      const dayOfWeek = currentDate.getDay()
      // Monday (1) to Friday (5) are business days
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        businessDays++
      }
    }
    return businessDays
  }

  // Build availability matrix
  const buildMatrix = () => {
    const matrix: { [emp: string]: { [month: string]: { registered: number; available: number; percentage: number } } } = {}

    uniqueEmployees.forEach(emp => {
      matrix[emp] = {}
      uniqueMonths.forEach(month => {
        const businessDays = getBusinessDaysInMonth(month)
        const expectedHours = businessDays * 8 // 8 hours per business day

        const registeredHours = records
          .filter(r => r.employee_name === emp && r.date.substring(0, 7) === month)
          .reduce((sum, r) => sum + r.duration_hours, 0)

        const availableHours = Math.max(0, expectedHours - registeredHours)
        const percentage = (registeredHours / expectedHours) * 100

        matrix[emp][month] = {
          registered: registeredHours,
          available: availableHours,
          percentage: Math.min(percentage, 100)
        }
      })
    })

    return matrix
  }

  const matrix = buildMatrix()

  const monthFormat = (month: string) => {
    const monthNames: { [key: string]: string } = {
      '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
      '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
      '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
    }
    return monthNames[month.substring(5, 7)] || month
  }

  // Sort employees by name
  const sortedEmployees = [...uniqueEmployees].sort()

  // Calculate totals
  const getTotalAvailable = (emp: string) => {
    return uniqueMonths.reduce((sum, m) => sum + (matrix[emp]?.[m]?.available || 0), 0)
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-8">
      <h2 className="text-2xl font-bold mb-2" style={{ color: MOOVING_COLORS.primary }}>
        📅 Disponibilidad Mensual por Empleado
      </h2>
      <p className="text-gray-600 text-sm mb-6">
        Cálculo: 8h/día × días hábiles del mes = horas esperadas. Tiempo libre = esperadas - registradas
      </p>

      <div style={{ overflowX: 'auto' }}>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr style={{ background: `linear-gradient(135deg, ${MOOVING_COLORS.primary}, ${MOOVING_COLORS.secondary})`, color: 'white' }}>
              <th className="px-4 py-3 text-left font-semibold">Empleado</th>
              {uniqueMonths.map(m => (
                <th key={m} className="px-3 py-3 text-center font-semibold whitespace-nowrap">
                  <div>{monthFormat(m)}</div>
                  <div className="text-xs font-normal opacity-90">Disponible</div>
                </th>
              ))}
              <th className="px-3 py-3 text-center font-semibold">Total Libre</th>
            </tr>
          </thead>
          <tbody>
            {sortedEmployees.map(emp => (
              <tr key={emp} className="border-b hover:bg-gray-50 transition">
                <td className="px-4 py-3 font-medium text-gray-800">{emp}</td>
                {uniqueMonths.map(m => {
                  const data = matrix[emp]?.[m]
                  const isLowAvailability = data && data.percentage > 80
                  const color = isLowAvailability ? MOOVING_COLORS.danger : MOOVING_COLORS.success

                  return (
                    <td key={m} className="px-3 py-3 text-center">
                      <div className="font-semibold" style={{ color }}>
                        {data ? `${data.available}h` : '-'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {data ? `(${data.percentage.toFixed(0)}%)` : ''}
                      </div>
                    </td>
                  )
                })}
                <td className="px-3 py-3 text-center font-bold" style={{ color: MOOVING_COLORS.success }}>
                  {getTotalAvailable(emp)}h
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend and Notes */}
      <div className="mt-6 bg-blue-50 rounded-lg p-4 border-l-4" style={{ borderColor: MOOVING_COLORS.primary }}>
        <h3 className="font-semibold text-sm mb-3" style={{ color: MOOVING_COLORS.primary }}>
          📌 Cómo leer la disponibilidad
        </h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li><span style={{ color: MOOVING_COLORS.success }} className="font-semibold">Verde:</span> Empleado con disponibilidad (ocupación &lt; 80%)</li>
          <li><span style={{ color: MOOVING_COLORS.danger }} className="font-semibold">Rojo:</span> Empleado sin disponibilidad (ocupación ≥ 80%)</li>
          <li>El porcentaje en paréntesis es el % de ocupación del mes</li>
          <li>Total Libre = suma de horas disponibles durante todo el período</li>
        </ul>
      </div>
    </div>
  )
}
