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

export const AvailabilityMetrics: React.FC<AvailabilityMetricsProps> = ({ records, employeeCapacities = {} }) => {
  // Calculate metrics
  const calculateMetrics = () => {
    if (records.length === 0) {
      return {
        totalHours: 0,
        workdays: 0,
        avgHoursPerDay: 0,
        occupancyPercentage: 0,
        availabilityPercentage: 0,
        teamUtilization: 0,
        employees: 0,
        totalAvailableHours: 0,
      }
    }

    // Get unique dates and employees
    const uniqueDates = new Set(records.map(r => r.date))
    const uniqueEmployees = Array.from(new Set(records.map(r => r.employee_id)))

    const totalHours = records.reduce((sum, r) => sum + r.duration_decimal, 0)
    const workdays = uniqueDates.size
    const employeesCount = uniqueEmployees.length

    // Dynamic available hours calculation based on each employee's expected daily hours
    let totalAvailableHours = 0
    uniqueEmployees.forEach(empId => {
      const expectedDaily = employeeCapacities[empId] !== undefined ? employeeCapacities[empId] : 8
      totalAvailableHours += workdays * expectedDaily
    })

    if (totalAvailableHours === 0) totalAvailableHours = workdays * employeesCount * 8 || 1

    // Occupancy: hours booked / total available hours
    const occupancyPercentage = (totalHours / totalAvailableHours) * 100
    const availabilityPercentage = Math.max(0, 100 - occupancyPercentage)

    // Team utilization: % of team capacity utilized
    const avgHoursPerDay = totalHours / (workdays || 1)
    const teamUtilization = (totalHours / totalAvailableHours) * 100

    return {
      totalHours,
      workdays,
      avgHoursPerDay,
      occupancyPercentage,
      availabilityPercentage,
      teamUtilization,
      employees: employeesCount,
      totalAvailableHours,
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
          trend={`${(metrics.workdays * metrics.employees * 8 - metrics.totalHours).toFixed(1)}h libres`}
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
          label="Total de Horas"
          value={metrics.totalHours.toFixed(1)}
          unit="h"
          icon="⏱️"
          color={MOOVING_COLORS.info}
          trend={`En ${metrics.workdays} días laborales`}
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
          value={((metrics.workdays * metrics.employees * 8) - metrics.totalHours).toFixed(1)}
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
