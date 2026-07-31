/**
 * Availability Metrics Component
 * Shows occupancy, availability, and utilization metrics
 */

import React from 'react'
import { TimeRecord } from '../types'

interface AvailabilityMetricsProps {
  records: TimeRecord[]
  employeeCapacities?: Record<string, number> // employee_id -> daily_hours_expected
}

const MOOVING_COLORS = {
  primary: '#1a5f7a',
  secondary: '#f97316',
  success: '#10b981',
  info: '#0ea5e9',
  danger: '#ef4444',
}

// ── FUNC-02: detección de registros de AUSENCIA ────────────────────────────
// Vacaciones y licencias se cargan como tareas internas (work_type 'internal')
// y se identifican por una mención de ausencia en el proyecto, la descripción
// o el cliente/equipo. TimeRecord no tiene un campo "equipo" dedicado, por lo
// que usamos client_name como su equivalente. La comparación es insensible a
// mayúsculas y acentos. Estos registros NO son trabajo real: se excluyen del
// numerador de ocupación y se descuentan de la capacidad disponible.
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

export const AvailabilityMetrics: React.FC<AvailabilityMetricsProps> = ({ records, employeeCapacities = {} }) => {
  // Calculate metrics
  const calculateMetrics = () => {
    if (records.length === 0) {
      return {
        workedHours: 0,
        absenceHours: 0,
        workdays: 0,
        avgHoursPerDay: 0,
        occupancyPercentage: 0,
        availabilityPercentage: 0,
        teamUtilization: 0,
        employees: 0,
        totalAvailableHours: 0,
        effectiveAvailableHours: 0,
        freeHours: 0,
      }
    }

    // Get unique dates and employees
    const uniqueDates = new Set(records.map(r => r.date))
    const uniqueEmployees = Array.from(new Set(records.map(r => r.employee_id)))

    // FUNC-02: separar el trabajo real de las horas de ausencia. Las ausencias
    // (vacaciones/licencias/francos) NO se cuentan como horas trabajadas.
    const workedHours = records
      .filter(r => !isAbsenceRecord(r))
      .reduce((sum, r) => sum + r.duration_decimal, 0)
    const absenceHours = records
      .filter(r => isAbsenceRecord(r))
      .reduce((sum, r) => sum + r.duration_decimal, 0)

    const workdays = uniqueDates.size
    const employeesCount = uniqueEmployees.length

    // Capacidad bruta esperada según las horas diarias de cada empleado.
    let totalAvailableHours = 0
    uniqueEmployees.forEach(empId => {
      const expectedDaily = employeeCapacities[empId] !== undefined ? employeeCapacities[empId] : 8
      totalAvailableHours += workdays * expectedDaily
    })

    if (totalAvailableHours === 0) totalAvailableHours = workdays * employeesCount * 8 || 1

    // FUNC-02: una persona de vacaciones/licencia no está ni "ocupada" ni
    // "disponible", así que descontamos las horas de ausencia de la capacidad
    // esperada. De este modo las ausencias salen del numerador y del
    // denominador y no inflan la ocupación.
    const effectiveAvailableHours = Math.max(0, totalAvailableHours - absenceHours)

    // Ocupación: trabajo real / capacidad neta de ausencias (guarda /0).
    const occupancyPercentage = effectiveAvailableHours > 0
      ? (workedHours / effectiveAvailableHours) * 100
      : 0
    const availabilityPercentage = Math.max(0, 100 - occupancyPercentage)

    // Horas libres reales: capacidad presente que todavía no se ocupó.
    const freeHours = Math.max(0, effectiveAvailableHours - workedHours)

    // Team utilization: % of team capacity utilized (== ocupación real).
    const avgHoursPerDay = workedHours / (workdays || 1)
    const teamUtilization = occupancyPercentage

    return {
      workedHours,
      absenceHours,
      workdays,
      avgHoursPerDay,
      occupancyPercentage,
      availabilityPercentage,
      teamUtilization,
      employees: employeesCount,
      totalAvailableHours,
      effectiveAvailableHours,
      freeHours,
    }
  }

  const metrics = calculateMetrics()

  const MetricCard: React.FC<{
    label: string
    value: string | number
    unit?: string
    icon: string
    color: string
    trend?: string
  }> = ({ label, value, unit, icon, color, trend }) => (
    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm font-medium">{label}</p>
          <p className="text-3xl font-bold mt-2" style={{ color }}>
            {value}{unit}
          </p>
          {trend && <p className="text-xs text-gray-400 mt-1">{trend}</p>}
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  )

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-6" style={{ color: MOOVING_COLORS.primary }}>
        📊 Métricas de Capacidad del Equipo
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard
          label="Ocupación Actual"
          value={metrics.occupancyPercentage.toFixed(1)}
          unit="%"
          icon="🎯"
          color={metrics.occupancyPercentage > 80 ? MOOVING_COLORS.danger : MOOVING_COLORS.secondary}
          trend={
            metrics.occupancyPercentage > 80
              ? '⚠️ Equipo sobrecargado'
              : metrics.occupancyPercentage > 60
              ? '✅ Ocupación óptima'
              : '📈 Hay capacidad disponible'
          }
        />

        <MetricCard
          label="Disponibilidad"
          value={metrics.availabilityPercentage.toFixed(1)}
          unit="%"
          icon="📅"
          color={MOOVING_COLORS.success}
          trend={`${metrics.freeHours.toFixed(1)}h libres`}
        />

        <MetricCard
          label="Utilización del Equipo"
          value={metrics.teamUtilization.toFixed(1)}
          unit="%"
          icon="👥"
          color={MOOVING_COLORS.primary}
          trend={`${metrics.employees} empleados`}
        />

        <MetricCard
          label="Horas Trabajadas"
          value={metrics.workedHours.toFixed(1)}
          unit="h"
          icon="⏱️"
          color={MOOVING_COLORS.info}
          trend={`Trabajo real, excl. ausencias · ${metrics.workdays} días`}
        />

        {/* FUNC-02: ausencias mostradas por separado; excluidas de la ocupación */}
        <MetricCard
          label="Ausencias (Vac./Lic.)"
          value={metrics.absenceHours.toFixed(1)}
          unit="h"
          icon="🌴"
          color={MOOVING_COLORS.secondary}
          trend="No cuentan como ocupación"
        />

        <MetricCard
          label="Promedio Diario"
          value={metrics.avgHoursPerDay.toFixed(2)}
          unit="h"
          icon="📈"
          color={MOOVING_COLORS.secondary}
          trend={`Por ${metrics.employees} empleados`}
        />

        <MetricCard
          label="Carga Máxima Permitida"
          value={metrics.freeHours.toFixed(1)}
          unit="h"
          icon="💪"
          color={MOOVING_COLORS.success}
          trend="Horas aún disponibles"
        />
      </div>

      {/* Occupancy Bar */}
      <div className="bg-white rounded-xl shadow-md p-6 mt-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: MOOVING_COLORS.primary }}>
          Distribución de Capacidad
        </h3>
        <div className="flex items-center gap-4">
          <div className="flex-1 bg-gray-200 rounded-full h-8 overflow-hidden">
            <div
              style={{
                width: `${Math.min(metrics.occupancyPercentage, 100)}%`,
                backgroundColor:
                  metrics.occupancyPercentage > 80
                    ? MOOVING_COLORS.danger
                    : metrics.occupancyPercentage > 60
                    ? MOOVING_COLORS.secondary
                    : MOOVING_COLORS.success,
                height: '100%',
                transition: 'width 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '12px',
                fontWeight: 'bold',
              }}
            >
              {metrics.occupancyPercentage > 10 && `${metrics.occupancyPercentage.toFixed(1)}%`}
            </div>
          </div>
          <span className="text-sm font-medium text-gray-600 w-20">
            {metrics.occupancyPercentage.toFixed(1)}% ocupado
          </span>
        </div>
      </div>
    </div>
  )
}
