/**
 * Employee Workload Breakdown Component
 * Shows how each employee's hours are distributed across clients/projects,
 * plus the overhead share (non-project hours) per employee and for the team
 */

import React from 'react'
import { TimeRecord } from '../types'

interface EmployeeWorkloadBreakdownProps {
  records: TimeRecord[]
  employeeCapacities?: Record<string, number> // employee_id -> daily_hours_expected
}

const MOOVING_COLORS = {
  primary: '#1a5f7a',
  secondary: '#f97316',
  success: '#10b981',
  info: '#0ea5e9',
  indigo: '#6366f1',
  pink: '#ec4899',
}

const COLORS = ['#1a5f7a', '#f97316', '#10b981', '#0ea5e9', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4']

/**
 * Counts business days (Monday–Friday), inclusive, between two ISO dates
 * (YYYY-MM-DD). Timezone-safe: parses the date parts and iterates in UTC so
 * getUTCDay() is never shifted by the runtime's local timezone. Returns 0 for
 * empty/invalid input or when the end date is before the start date.
 */
const countWeekdays = (startISO: string, endISO: string): number => {
  if (!startISO || !endISO) return 0
  const [sy, sm, sd] = startISO.slice(0, 10).split('-').map(Number)
  const [ey, em, ed] = endISO.slice(0, 10).split('-').map(Number)
  const start = Date.UTC(sy, sm - 1, sd)
  const end = Date.UTC(ey, em - 1, ed)
  if (Number.isNaN(start) || Number.isNaN(end) || start > end) return 0
  const DAY_MS = 24 * 60 * 60 * 1000
  let count = 0
  for (let t = start; t <= end; t += DAY_MS) {
    const day = new Date(t).getUTCDay() // 0 = Sunday, 6 = Saturday
    if (day !== 0 && day !== 6) count++
  }
  return count
}

/**
 * A6: un registro cuenta como "overhead" cuando no es trabajo de proyecto:
 * tareas internas, reuniones o capacitación.
 */
const isOverheadRecord = (r: TimeRecord): boolean =>
  r.work_type === 'internal' || r.work_type === 'meeting' || r.work_type === 'training'

export const EmployeeWorkloadBreakdown: React.FC<EmployeeWorkloadBreakdownProps> = ({ records, employeeCapacities = {} }) => {
  if (records.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-8 text-center">
        <p className="text-gray-500">No hay datos disponibles</p>
      </div>
    )
  }

  // Analyzed period = actual date span of the filtered records (min → max).
  // NUEVO-11: the capacity denominator must be the REAL business days (Mon–Fri)
  // in that span, not the count of distinct dates that happen to have records.
  // Using "days with data" let anyone who logged only a few days appear to
  // comply (3 días → esperado 3*8=24h); real weekdays fix that understatement.
  const sortedDates = records.map(r => r.date).filter(Boolean).sort()
  const periodStart = sortedDates[0] ?? ''
  const periodEnd = sortedDates[sortedDates.length - 1] ?? ''
  const periodWeekdays = countWeekdays(periodStart, periodEnd)

  // Get unique employees
  const uniqueEmployees = Array.from(new Set(
    records.map(r => r.employee_name)
  )).sort()

  // B8-FIX: el "Promedio/Empleado" de horas de proyecto debe dividirse solo
  // entre quienes efectivamente registraron horas de proyecto. Incluir a los
  // empleados con 0h de proyecto en el denominador distorsiona el promedio.
  const projectEmployeeCount = new Set(
    records.filter(r => r.work_type === 'project').map(r => r.employee_name)
  ).size

  // A6: overhead agregado del subconjunto visible = horas no-proyecto
  // (internal + meeting + training) / total de horas registradas.
  const teamTotalHours = records.reduce((sum, r) => sum + r.duration_decimal, 0)
  const teamOverheadHours = records.filter(isOverheadRecord).reduce((sum, r) => sum + r.duration_decimal, 0)
  const teamOverheadRate = teamTotalHours > 0 ? (teamOverheadHours / teamTotalHours) * 100 : 0

  // Build breakdown for each employee
  const getEmployeeBreakdown = (empName: string) => {
    const empRecords = records.filter(r => r.employee_name === empName)
    const empId = empRecords[0]?.employee_id || ''
    const dailyExpected = employeeCapacities[empId] !== undefined ? employeeCapacities[empId] : 8.0
    // Expected = daily capacity × real business days of the period (see above).
    const expectedPeriodHours = dailyExpected * periodWeekdays

    const projectRecords = empRecords.filter(r => r.work_type === 'project')
    const breakdown: { [client: string]: number } = {}
    projectRecords.forEach(r => {
      const key = r.client_name || 'Sin Cliente'
      breakdown[key] = (breakdown[key] || 0) + r.duration_decimal
    })

    const totalLoggedAll = empRecords.reduce((sum, r) => sum + r.duration_decimal, 0)
    const totalProject = Object.values(breakdown).reduce((sum, h) => sum + h, 0)
    const complianceRate = expectedPeriodHours > 0 ? (totalLoggedAll / expectedPeriodHours) * 100 : 0

    let statusColor = 'bg-red-100 text-red-800 border-red-300'
    let statusIcon = '🔴 Red'
    let statusLabel = 'Baja Carga (<70%)'
    if (complianceRate >= 90) {
      statusColor = 'bg-emerald-100 text-emerald-800 border-emerald-300'
      statusIcon = '🟢 Verde'
      statusLabel = 'Óptimo (≥90%)'
    } else if (complianceRate >= 70) {
      statusColor = 'bg-amber-100 text-amber-800 border-amber-300'
      statusIcon = '🟡 Amarillo'
      statusLabel = 'Moderado (70-89%)'
    }

    // A6: % de overhead del empleado = horas no-proyecto (internas + reuniones
    // + capacitación) / total de horas registradas. Sin horas → null (sin chip).
    const totalOverhead = empRecords.filter(isOverheadRecord).reduce((sum, r) => sum + r.duration_decimal, 0)
    const overheadRate = totalLoggedAll > 0 ? (totalOverhead / totalLoggedAll) * 100 : null

    let overheadColor = 'bg-emerald-100 text-emerald-800 border-emerald-300'
    let overheadLabel = overheadRate === null ? '' : `Overhead ${overheadRate.toFixed(0)}%`
    let overheadTitle = 'Horas no-proyecto (internas + reuniones + capacitación) sobre el total registrado'
    if (overheadRate !== null && overheadRate > 20) {
      overheadColor = 'bg-red-100 text-red-800 border-red-300'
      overheadLabel = `⚠ Overhead ${overheadRate.toFixed(0)}%`
      overheadTitle = 'Más del 20% de sus horas son reuniones/tareas internas/capacitación'
    } else if (overheadRate !== null && overheadRate >= 10) {
      overheadColor = 'bg-amber-100 text-amber-800 border-amber-300'
    }

    return {
      empId,
      dailyExpected,
      expectedPeriodHours,
      totalLoggedAll,
      totalProject,
      complianceRate,
      statusColor,
      statusIcon,
      statusLabel,
      overheadRate,
      overheadColor,
      overheadLabel,
      overheadTitle,
      items: Object.entries(breakdown)
        .sort((a, b) => b[1] - a[1])
        .map(([client, hours]) => ({
          client,
          hours,
          percentage: totalProject > 0 ? (hours / totalProject) * 100 : 0
        }))
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-8">
      <div className="flex flex-wrap justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: MOOVING_COLORS.primary }}>
            💼 Distribución de Carga y Cumplimiento de Capacidad
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            Análisis de horas esperadas vs registradas por empleado con semáforo de cumplimiento 🟢🟡🔴
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {uniqueEmployees.map((emp, idx) => {
          const b = getEmployeeBreakdown(emp)

          return (
            <div
              key={emp}
              className="bg-gradient-to-br rounded-xl p-6 border shadow-sm hover:shadow-md transition flex flex-col justify-between"
              style={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                borderColor: COLORS[idx % COLORS.length]
              }}
            >
              <div>
                <div className="flex justify-between items-start mb-3 pb-3 border-b-2" style={{ borderColor: COLORS[idx % COLORS.length] }}>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">{emp}</h3>
                    <span className="text-xs text-slate-500 font-medium">Meta diaria: {b.dailyExpected}h/día</span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${b.statusColor}`}>
                      {b.statusIcon} ({b.expectedPeriodHours > 0 ? `${b.complianceRate.toFixed(0)}%` : '—'})
                    </span>
                    {b.overheadRate !== null && (
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold border ${b.overheadColor}`}
                        title={b.overheadTitle}
                      >
                        {b.overheadLabel}
                      </span>
                    )}
                  </div>
                </div>

                {/* Sub-breakdown per client */}
                <div className="space-y-3 mb-5">
                  {b.items.map((item, itemIdx) => (
                    <div key={item.client}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium text-gray-700 truncate max-w-[160px]">{item.client}</span>
                        <span className="text-xs font-bold" style={{ color: COLORS[itemIdx % COLORS.length] }}>
                          {item.hours.toFixed(1)}h
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full transition-all rounded-full"
                          style={{
                            width: `${item.percentage}%`,
                            backgroundColor: COLORS[itemIdx % COLORS.length]
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  {b.items.length === 0 && (
                    <p className="text-xs text-slate-400 italic">Sin horas de proyectos externos registradas</p>
                  )}
                </div>
              </div>

              {/* Bottom capacity comparison */}
              <div className="bg-white rounded-lg p-3 border border-slate-200 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <span className="text-slate-400 font-medium block uppercase text-[10px]">Esperadas</span>
                  <span className="font-bold text-slate-700 text-sm">{b.expectedPeriodHours.toFixed(0)}h</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block uppercase text-[10px]">Registradas</span>
                  <span className="font-bold text-indigo-700 text-sm">{b.totalLoggedAll.toFixed(1)}h</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block uppercase text-[10px]">Desviación Δ</span>
                  <span className={`font-bold text-sm ${b.totalLoggedAll >= b.expectedPeriodHours ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {b.expectedPeriodHours > 0 ? `${(b.totalLoggedAll - b.expectedPeriodHours).toFixed(1)}h` : '—'}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary Statistics */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 border-l-4" style={{ borderColor: MOOVING_COLORS.primary }}>
          <div className="text-xs text-gray-600 uppercase font-semibold mb-1">Total Empleados</div>
          <div className="text-2xl font-bold" style={{ color: MOOVING_COLORS.primary }}>
            {uniqueEmployees.length}
          </div>
        </div>

        <div className="bg-orange-50 rounded-lg p-4 border-l-4" style={{ borderColor: MOOVING_COLORS.secondary }}>
          <div className="text-xs text-gray-600 uppercase font-semibold mb-1">Total Horas (Proyectos)</div>
          <div className="text-2xl font-bold" style={{ color: MOOVING_COLORS.secondary }}>
            {records.filter(r => r.work_type === 'project').reduce((sum, r) => sum + r.duration_decimal, 0).toFixed(2)}h
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4 border-l-4" style={{ borderColor: MOOVING_COLORS.success }}>
          <div className="text-xs text-gray-600 uppercase font-semibold mb-1">Promedio/Empleado</div>
          <div className="text-2xl font-bold" style={{ color: MOOVING_COLORS.success }}>
            {(records.filter(r => r.work_type === 'project').reduce((sum, r) => sum + r.duration_decimal, 0) / (projectEmployeeCount || 1)).toFixed(1)}h
          </div>
        </div>

        <div className="bg-cyan-50 rounded-lg p-4 border-l-4" style={{ borderColor: MOOVING_COLORS.info }}>
          <div className="text-xs text-gray-600 uppercase font-semibold mb-1">Clientes Únicos</div>
          <div className="text-2xl font-bold" style={{ color: MOOVING_COLORS.info }}>
            {Array.from(new Set(records.filter(r => r.work_type === 'project').map(r => r.client_name))).length}
          </div>
        </div>

        <div className="bg-indigo-50 rounded-lg p-4 border-l-4" style={{ borderColor: MOOVING_COLORS.indigo }}>
          <div className="text-xs text-gray-600 uppercase font-semibold mb-1">Overhead del Equipo</div>
          <div className="text-2xl font-bold" style={{ color: MOOVING_COLORS.indigo }}>
            {teamOverheadRate.toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  )
}
