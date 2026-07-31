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

// ── FUNC-02: detección de registros de AUSENCIA ────────────────────────────
// Vacaciones y licencias se cargan como tareas internas (work_type 'internal')
// y se identifican por una mención de ausencia en el proyecto, la descripción
// o el cliente/equipo. TimeRecord no tiene un campo "equipo" dedicado, por lo
// que usamos client_name como su equivalente. La comparación es insensible a
// mayúsculas y acentos. Estos registros NO son trabajo real: se excluyen del
// trabajo registrado y se descuentan de la capacidad esperada.
const ABSENCE_KEYWORDS = ['vacacion', 'licencia', 'ausencia', 'franco']

const normalizeText = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita acentos/diacríticos

const isAbsenceRecord = (r: TimeRecord): boolean => {
  if (r.work_type !== 'internal') return false
  const haystack = normalizeText(
    [r.project_name, r.description, r.client_name].filter(Boolean).join(' ')
  )
  return ABSENCE_KEYWORDS.some(kw => haystack.includes(kw))
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
    const matrix: { [emp: string]: { [month: string]: { worked: number; absence: number; available: number; percentage: number } } } = {}

    uniqueEmployees.forEach(emp => {
      matrix[emp] = {}
      uniqueMonths.forEach(month => {
        const businessDays = getBusinessDaysInMonth(month)
        const expectedHours = businessDays * 8 // capacidad bruta: 8h × días hábiles

        const monthRecords = records
          .filter(r => r.employee_name === emp && r.date.substring(0, 7) === month)

        // FUNC-02: separar trabajo real de ausencias (vacaciones/licencias/francos).
        // Las ausencias NO son horas trabajadas, así que no cuentan en la ocupación.
        const workedHours = monthRecords
          .filter(r => !isAbsenceRecord(r))
          .reduce((sum, r) => sum + r.duration_decimal, 0)
        const absenceHours = monthRecords
          .filter(r => isAbsenceRecord(r))
          .reduce((sum, r) => sum + r.duration_decimal, 0)

        // Descontamos las ausencias de la capacidad esperada: esos días la
        // persona no está ni ocupada ni disponible. Así la ocupación refleja
        // trabajo real sobre el tiempo en que efectivamente estuvo presente.
        const effectiveExpected = Math.max(0, expectedHours - absenceHours)
        const availableHours = Math.max(0, effectiveExpected - workedHours)
        // Ocupación sobre capacidad presente (guarda división por cero).
        const percentage = effectiveExpected > 0 ? (workedHours / effectiveExpected) * 100 : 0

        matrix[emp][month] = {
          worked: workedHours,
          absence: absenceHours,
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
        Cálculo: 8h/día × días hábiles del mes = horas esperadas. Las ausencias (vacaciones/licencias)
        se excluyen del trabajo y se descuentan de la capacidad. Tiempo libre = esperadas − ausencias − trabajadas
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
                        {data ? `${data.available.toFixed(1)}h` : '-'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {data ? `(${data.percentage.toFixed(0)}%)` : ''}
                      </div>
                      {/* FUNC-02: ausencias mostradas aparte, excluidas de la ocupación */}
                      {data && data.absence > 0 && (
                        <div className="text-xs" style={{ color: MOOVING_COLORS.warning }}>
                          🌴 {data.absence.toFixed(1)}h aus.
                        </div>
                      )}
                    </td>
                  )
                })}
                <td className="px-3 py-3 text-center font-bold" style={{ color: MOOVING_COLORS.success }}>
                  {getTotalAvailable(emp).toFixed(1)}h
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
          <li>El porcentaje en paréntesis es el % de ocupación del mes (sobre trabajo real)</li>
          <li><span style={{ color: MOOVING_COLORS.warning }} className="font-semibold">🌴 Ausencias:</span> vacaciones/licencias; no cuentan como trabajo ni como capacidad disponible</li>
          <li>Total Libre = suma de horas disponibles durante todo el período</li>
        </ul>
      </div>
    </div>
  )
}
