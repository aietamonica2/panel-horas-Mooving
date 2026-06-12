/**
 * Distribution Table Component
 * Shows hours distribution by client and employee
 */

import React from 'react'
import { TimeRecord } from '../types'

interface DistributionTableProps {
  records: TimeRecord[]
  title: string
  groupBy: 'client' | 'employee' | 'project'
}

const MOOVING_COLORS = {
  primary: '#1a5f7a',
  secondary: '#f97316',
  lightBg: '#f8fafc',
  border: '#e2e8f0',
}

export const DistributionTable: React.FC<DistributionTableProps> = ({
  records,
  title,
  groupBy,
}) => {
  // Aggregate data based on groupBy
  const aggregateData = () => {
    const grouped = new Map<string, { name: string; total: number; count: number }>()

    records.forEach((record) => {
      let key = ''
      let name = ''

      if (groupBy === 'client') {
        key = record.client_id
        name = record.client_name
      } else if (groupBy === 'employee') {
        key = record.employee_id
        name = record.employee_name
      } else {
        key = record.project_id
        name = record.project_name
      }

      const existing = grouped.get(key) || { name, total: 0, count: 0 }
      existing.total += record.duration_hours
      existing.count += 1
      grouped.set(key, existing)
    })

    return Array.from(grouped.values()).sort((a, b) => b.total - a.total)
  }

  const data = aggregateData()
  const totalHours = data.reduce((sum, item) => sum + item.total, 0)

  if (data.length === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b" style={{ borderColor: MOOVING_COLORS.border }}>
        <h3 className="text-lg font-semibold" style={{ color: MOOVING_COLORS.primary }}>
          {title}
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead style={{ backgroundColor: MOOVING_COLORS.lightBg }}>
            <tr>
              <th className="px-6 py-3 text-left font-semibold" style={{ color: MOOVING_COLORS.primary }}>
                {groupBy === 'client' && 'Cliente'}
                {groupBy === 'employee' && 'Empleado'}
                {groupBy === 'project' && 'Proyecto'}
              </th>
              <th className="px-6 py-3 text-center font-semibold" style={{ color: MOOVING_COLORS.primary }}>
                Horas
              </th>
              <th className="px-6 py-3 text-center font-semibold" style={{ color: MOOVING_COLORS.primary }}>
                Registros
              </th>
              <th className="px-6 py-3 text-center font-semibold" style={{ color: MOOVING_COLORS.primary }}>
                % del Total
              </th>
              <th className="px-6 py-3 text-left font-semibold" style={{ color: MOOVING_COLORS.primary }}>
                Visualización
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => {
              const percentage = ((item.total / totalHours) * 100).toFixed(1)
              const barWidth = (item.total / Math.max(...data.map(d => d.total))) * 100

              return (
                <tr
                  key={item.name}
                  style={{
                    backgroundColor: idx % 2 === 0 ? '#fff' : MOOVING_COLORS.lightBg,
                    borderBottom: `1px solid ${MOOVING_COLORS.border}`,
                  }}
                >
                  <td className="px-6 py-3 font-medium">{item.name}</td>
                  <td className="px-6 py-3 text-center">
                    <span className="font-semibold" style={{ color: MOOVING_COLORS.secondary }}>
                      {item.total.toFixed(2)}h
                    </span>
                  </td>
                  <td className="px-6 py-3 text-center text-gray-600">{item.count}</td>
                  <td className="px-6 py-3 text-center text-gray-600">{percentage}%</td>
                  <td className="px-6 py-3">
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        style={{
                          width: `${barWidth}%`,
                          backgroundColor: MOOVING_COLORS.primary,
                          height: '100%',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </td>
                </tr>
              )
            })}
            <tr style={{ backgroundColor: MOOVING_COLORS.lightBg, fontWeight: 'bold' }}>
              <td className="px-6 py-3">Total</td>
              <td className="px-6 py-3 text-center" style={{ color: MOOVING_COLORS.secondary }}>
                {totalHours.toFixed(2)}h
              </td>
              <td className="px-6 py-3 text-center">{records.length}</td>
              <td className="px-6 py-3 text-center">100%</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
