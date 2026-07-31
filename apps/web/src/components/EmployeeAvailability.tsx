/**
 * Employee Availability Component
 * Shows available hours vs registered hours per employee per month
 */

import React, { useState, useEffect } from 'react'
import { TimeRecord } from '../types'
import { api } from '../api'

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
    .replace(/[̀-ͯ]/g, '') // quita acentos/diacríticos

const isAbsenceRecord = (r: TimeRecord): boolean => {
  if (r.work_type !== 'internal') return false
  const haystack = normalizeText(
    [r.project_name, r.description, r.client_name].filter(Boolean).join(' ')
  )
  return ABSENCE_KEYWORDS.some(kw => haystack.includes(kw))
}

// ── FIX capacidad: maestro de empleados ACTIVOS ────────────────────────────
// La capacidad/utilización del equipo debe medirse contra el maestro de
// empleados ACTIVOS (is_active == 1), no contra los que aparecen en los
// registros (solo los que cargaron horas). Traemos ese maestro vía MCP.
interface ActiveEmployee {
  id: string
  daily_hours_expected: number
}

export const EmployeeAvailability: React.FC<EmployeeAvailabilityProps> = ({ records }) => {
  // Maestro de empleados activos (denominador real de la capacidad del equipo).
  // Los hooks van SIEMPRE antes de cualquier return condicional (reglas de hooks).
  const [activeEmployees, setActiveEmployees] = useState<ActiveEmployee[]>([])
  const [masterLoaded, setMasterLoaded] = useState(false)
  const [masterLoading, setMasterLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const loadMaster = async () => {
      try {
        setMasterLoading(true)
        const res = await api.callMcpTool('get_employees', {})
        const data = await res.json()
        if (!cancelled && data?.success && Array.isArray(data.result?.employees)) {
          // Contamos como activos solo los is_active == 1 (SQLite guarda 1/0).
          const actives: ActiveEmployee[] = data.result.employees
            .filter((e: any) => Number(e.is_active) === 1)
            .map((e: any) => ({
              id: e.id,
              daily_hours_expected:
                e.daily_hours_expected !== undefined && e.daily_hours_expected !== null
                  ? Number(e.daily_hours_expected)
                  : 8,
            }))
          setActiveEmployees(actives)
          setMasterLoaded(true)
        }
      } catch (err) {
        // Si falla, seguimos sin el maestro (no rompemos la vista).
        console.error('EmployeeAvailability: no se pudo obtener el maestro de empleados', err)
      } finally {
        if (!cancelled) setMasterLoading(false)
      }
    }
    loadMaster()
    return () => {
      cancelled = true
    }
  }, [])

  const activeCount = activeEmployees.length
  const usingMaster = masterLoaded && activeCount > 0

  if (records.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">No hay registros disponibles</p>
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

  // ── FIX capacidad: métricas del EQUIPO sobre el maestro de ACTIVOS ─────────
  // La capacidad total del equipo se mide contra TODOS los activos (incluidos
  // los que no cargaron), no solo contra los presentes en los registros.
  const totalBusinessDays = uniqueMonths.reduce((sum, m) => sum + getBusinessDaysInMonth(m), 0)

  // Adopción: empleados que cargaron al menos 1 hora vs total de activos.
  const loadedEmployeeIds = new Set(
    records.filter(r => (r.duration_decimal || 0) > 0).map(r => r.employee_id)
  )
  const loadedCount = loadedEmployeeIds.size
  const adoptionGap = usingMaster ? Math.max(0, activeCount - loadedCount) : 0

  // Totales de trabajo real y ausencias del período (para la utilización del equipo).
  let teamWorked = 0
  let teamAbsence = 0
  records.forEach(r => {
    if (isAbsenceRecord(r)) teamAbsence += r.duration_decimal
    else teamWorked += r.duration_decimal
  })

  // Capacidad bruta del equipo = Σ(activos) días hábiles × horas esperadas.
  let teamCapacityGross = 0
  if (usingMaster) {
    activeEmployees.forEach(emp => {
      teamCapacityGross += totalBusinessDays * emp.daily_hours_expected
    })
  }
  // Neta de ausencias (guardas de división por cero).
  const teamEffectiveCapacity = Math.max(0, teamCapacityGross - teamAbsence)
  const teamUtilization = teamEffectiveCapacity > 0 ? (teamWorked / teamEffectiveCapacity) * 100 : 0
  const teamFreeHours = Math.max(0, teamEffectiveCapacity - teamWorked)

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
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-8">
      <h2 className="text-2xl font-bold mb-2" style={{ color: MOOVING_COLORS.primary }}>
        📅 Disponibilidad Mensual por Empleado
      </h2>
      <p className="text-gray-600 dark:text-gray-300 text-sm mb-6">
        Cálculo: 8h/día × días hábiles del mes = horas esperadas. Las ausencias (vacaciones/licencias)
        se excluyen del trabajo y se descuentan de la capacidad. Tiempo libre = esperadas − ausencias − trabajadas
      </p>

      {/* FIX capacidad: resumen del equipo sobre el maestro de ACTIVOS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
          <p className="text-gray-500 dark:text-gray-300 text-xs font-medium uppercase tracking-wide">
            Empleados con carga / activos
          </p>
          <p
            className="text-2xl font-bold mt-1"
            style={{
              color:
                masterLoading && !masterLoaded
                  ? MOOVING_COLORS.primary
                  : adoptionGap > 0
                  ? MOOVING_COLORS.danger
                  : MOOVING_COLORS.success,
            }}
          >
            {masterLoading && !masterLoaded ? '…' : `${loadedCount} / ${activeCount}`}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {masterLoading && !masterLoaded
              ? 'Cargando maestro de empleados…'
              : !usingMaster
              ? 'Maestro de activos no disponible'
              : adoptionGap > 0
              ? `${adoptionGap} activo(s) sin carga en el período`
              : 'Todos los activos cargaron horas'}
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
          <p className="text-gray-500 dark:text-gray-300 text-xs font-medium uppercase tracking-wide">
            Utilización del equipo
          </p>
          <p className="text-2xl font-bold mt-1" style={{ color: MOOVING_COLORS.primary }}>
            {masterLoading && !masterLoaded ? '…' : usingMaster ? `${teamUtilization.toFixed(1)}%` : 'N/D'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {usingMaster
              ? `Sobre ${activeCount} activos · ${totalBusinessDays} días hábiles`
              : 'Requiere el maestro de activos'}
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
          <p className="text-gray-500 dark:text-gray-300 text-xs font-medium uppercase tracking-wide">
            Capacidad libre del equipo
          </p>
          <p className="text-2xl font-bold mt-1" style={{ color: MOOVING_COLORS.success }}>
            {masterLoading && !masterLoaded ? '…' : usingMaster ? `${teamFreeHours.toFixed(0)}h` : 'N/D'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {usingMaster ? 'Horas de activos aún disponibles' : 'Requiere el maestro de activos'}
          </p>
        </div>
      </div>

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
              <tr key={emp} className="border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
                <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">{emp}</td>
                {uniqueMonths.map(m => {
                  const data = matrix[emp]?.[m]
                  const isLowAvailability = data && data.percentage > 80
                  const color = isLowAvailability ? MOOVING_COLORS.danger : MOOVING_COLORS.success

                  return (
                    <td key={m} className="px-3 py-3 text-center">
                      <div className="font-semibold" style={{ color }}>
                        {data ? `${data.available.toFixed(1)}h` : '-'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
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
      <div className="mt-6 bg-blue-50 dark:bg-slate-700 rounded-lg p-4 border-l-4" style={{ borderColor: MOOVING_COLORS.primary }}>
        <h3 className="font-semibold text-sm mb-3" style={{ color: MOOVING_COLORS.primary }}>
          📌 Cómo leer la disponibilidad
        </h3>
        <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
          <li><span style={{ color: MOOVING_COLORS.success }} className="font-semibold">Verde:</span> Empleado con disponibilidad (ocupación &lt; 80%)</li>
          <li><span style={{ color: MOOVING_COLORS.danger }} className="font-semibold">Rojo:</span> Empleado sin disponibilidad (ocupación ≥ 80%)</li>
          <li>El porcentaje en paréntesis es el % de ocupación del mes (sobre trabajo real)</li>
          <li><span style={{ color: MOOVING_COLORS.warning }} className="font-semibold">🌴 Ausencias:</span> vacaciones/licencias; no cuentan como trabajo ni como capacidad disponible</li>
          <li>Total Libre = suma de horas disponibles durante todo el período</li>
          <li><span className="font-semibold">Empleados con carga / activos:</span> adopción real — cuántos de los {usingMaster ? activeCount : 'N'} activos cargaron horas en el período</li>
        </ul>
      </div>
    </div>
  )
}
