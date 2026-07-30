/**
 * Employee Workload Breakdown Component
 * Shows how each employee's hours are distributed across clients/projects
 */

import React from 'react'
import { TimeRecord } from '../types'

interface EmployeeWorkloadBreakdownProps {
  records: TimeRecord[]
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

export const EmployeeWorkloadBreakdown: React.FC<EmployeeWorkloadBreakdownProps> = ({ records }) => {
  if (records.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-8 text-center">
        <p className="text-gray-500">No hay datos disponibles</p>
      </div>
    )
  }

  // Get unique employees
  const uniqueEmployees = Array.from(new Set(
    records.map(r => r.employee_name)
  )).sort()

  // Build breakdown for each employee
  const getEmployeeBreakdown = (empName: string) => {
    const empRecords = records.filter(r => r.employee_name === empName && r.work_type === 'project')

    const breakdown: { [client: string]: number } = {}
    empRecords.forEach(r => {
      const key = r.client_name || 'Sin Cliente'
      breakdown[key] = (breakdown[key] || 0) + r.duration_decimal
    })

    const total = Object.values(breakdown).reduce((sum, h) => sum + h, 0)

    return {
      breakdown,
      total,
      items: Object.entries(breakdown)
        .sort((a, b) => b[1] - a[1])
        .map(([client, hours]) => ({
          client,
          hours,
          percentage: (hours / total) * 100
        }))
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-8">
      <h2 className="text-2xl font-bold mb-2" style={{ color: MOOVING_COLORS.primary }}>
        💼 Distribución de Carga por Empleado
      </h2>
      <p className="text-gray-600 text-sm mb-6">
        Cómo se distribuyen las horas de cada empleado entre los diferentes clientes/proyectos
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {uniqueEmployees.map((emp, idx) => {
          const breakdown = getEmployeeBreakdown(emp)

          if (breakdown.total === 0) {
            return null
          }

          return (
            <div
              key={emp}
              className="bg-gradient-to-br rounded-lg p-6 border shadow-sm hover:shadow-md transition"
              style={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                borderColor: COLORS[idx % COLORS.length]
              }}
            >
              <div
                className="font-bold mb-4 pb-3 border-b-2"
                style={{
                  color: COLORS[idx % COLORS.length],
                  borderColor: COLORS[idx % COLORS.length]
                }}
              >
                {emp}
              </div>

              <div className="space-y-3 mb-5">
                {breakdown.items.map((item, itemIdx) => (
                  <div key={item.client}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-700">{item.client}</span>
                      <span className="text-sm font-bold" style={{ color: COLORS[itemIdx % COLORS.length] }}>
                        {item.hours.toFixed(2)}h
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full transition-all rounded-full"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: COLORS[itemIdx % COLORS.length]
                        }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1 flex justify-between items-center">
                      <span>{item.percentage.toFixed(1)}% del tiempo</span>
                    </div>
                  </div>
                ))}
              </div>

              <div
                className="bg-white rounded p-3 text-center border-2"
                style={{ borderColor: COLORS[idx % COLORS.length] }}
              >
                <div className="text-xs text-gray-600 uppercase font-semibold mb-1">Total Proyectos</div>
                <div className="text-2xl font-bold" style={{ color: COLORS[idx % COLORS.length] }}>
                  {breakdown.total.toFixed(2)}h
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary Statistics */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
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
            {(records.filter(r => r.work_type === 'project').reduce((sum, r) => sum + r.duration_decimal, 0) / uniqueEmployees.length).toFixed(1)}h
          </div>
        </div>

        <div className="bg-cyan-50 rounded-lg p-4 border-l-4" style={{ borderColor: MOOVING_COLORS.info }}>
          <div className="text-xs text-gray-600 uppercase font-semibold mb-1">Clientes Únicos</div>
          <div className="text-2xl font-bold" style={{ color: MOOVING_COLORS.info }}>
            {Array.from(new Set(records.filter(r => r.work_type === 'project').map(r => r.client_name))).length}
          </div>
        </div>
      </div>
    </div>
  )
}
