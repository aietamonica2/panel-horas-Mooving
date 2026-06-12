/**
 * Analytics Charts Component
 * Shows monthly trends, top employees, and top clients
 */

import React from 'react'
import { TimeRecord } from '../types'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'

interface AnalyticsChartsProps {
  records: TimeRecord[]
}

const MOOVING_COLORS = {
  primary: '#1a5f7a',
  secondary: '#f97316',
  success: '#10b981',
  info: '#0ea5e9',
  danger: '#ef4444',
  indigo: '#6366f1',
  pink: '#ec4899',
}

const CHART_COLORS = ['#1a5f7a', '#f97316', '#10b981', '#0ea5e9', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4', '#ef4444', '#6ee7b7']

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ records }) => {
  if (records.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-8 text-center">
        <p className="text-gray-500">No hay datos disponibles para mostrar gráficos</p>
      </div>
    )
  }

  // 1. Monthly hours trend
  const getMonthlyData = () => {
    const monthlyMap: { [month: string]: number } = {}

    records.forEach(r => {
      const month = r.date.substring(0, 7)
      monthlyMap[month] = (monthlyMap[month] || 0) + r.duration_hours
    })

    return Object.entries(monthlyMap)
      .sort()
      .map(([month, hours]) => ({
        month: monthFormat(month),
        horas: hours,
        fill: MOOVING_COLORS.secondary
      }))
  }

  // 2. Top 10 employees
  const getTopEmployees = () => {
    const employeeMap: { [name: string]: number } = {}

    records.forEach(r => {
      employeeMap[r.employee_name] = (employeeMap[r.employee_name] || 0) + r.duration_hours
    })

    return Object.entries(employeeMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, hours], idx) => ({
        name: name.split(' ')[0], // First name only for space
        horas: hours,
        fill: CHART_COLORS[idx % CHART_COLORS.length]
      }))
  }

  // 3. Top 10 clients
  const getTopClients = () => {
    const clientMap: { [name: string]: number } = {}

    records.forEach(r => {
      if (r.client_name) {
        clientMap[r.client_name] = (clientMap[r.client_name] || 0) + r.duration_hours
      }
    })

    return Object.entries(clientMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, hours], idx) => ({
        name: name.length > 15 ? name.substring(0, 12) + '...' : name,
        horas: hours,
        fill: CHART_COLORS[idx % CHART_COLORS.length]
      }))
  }

  const monthFormat = (month: string) => {
    const monthNames: { [key: string]: string } = {
      '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr',
      '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago',
      '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic'
    }
    return monthNames[month.substring(5, 7)] || month
  }

  const monthlyData = getMonthlyData()
  const topEmployees = getTopEmployees()
  const topClients = getTopClients()

  return (
    <div className="space-y-8">
      {/* Monthly Trend */}
      <div className="bg-white rounded-xl shadow-md p-8">
        <h2 className="text-2xl font-bold mb-6" style={{ color: MOOVING_COLORS.primary }}>
          📈 Horas por Mes - Tendencia Anual
        </h2>

        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" stroke={MOOVING_COLORS.primary} />
            <YAxis stroke={MOOVING_COLORS.primary} label={{ value: 'Horas', angle: -90, position: 'insideLeft' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: `2px solid ${MOOVING_COLORS.secondary}`,
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
              }}
              formatter={(value) => [`${value}h`, 'Horas']}
            />
            <Bar dataKey="horas" fill={MOOVING_COLORS.secondary} radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-6 bg-orange-50 rounded-lg p-4 border-l-4" style={{ borderColor: MOOVING_COLORS.secondary }}>
          <p className="text-sm text-gray-700">
            <span className="font-bold" style={{ color: MOOVING_COLORS.secondary }}>Total anual:</span> {monthlyData.reduce((sum, m) => sum + m.horas, 0)}h
            <span className="ml-4"><span className="font-bold" style={{ color: MOOVING_COLORS.secondary }}>Promedio/mes:</span> {(monthlyData.reduce((sum, m) => sum + m.horas, 0) / monthlyData.length).toFixed(0)}h</span>
          </p>
        </div>
      </div>

      {/* Top 10 Employees */}
      <div className="bg-white rounded-xl shadow-md p-8">
        <h2 className="text-2xl font-bold mb-6" style={{ color: MOOVING_COLORS.primary }}>
          👥 Top 10 Empleados Más Activos
        </h2>

        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={topEmployees}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 200, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" stroke={MOOVING_COLORS.primary} />
            <YAxis dataKey="name" type="category" stroke={MOOVING_COLORS.primary} width={190} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: `2px solid ${MOOVING_COLORS.primary}`,
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
              }}
              formatter={(value) => [`${value}h`, 'Horas']}
            />
            <Bar dataKey="horas" radius={[0, 8, 8, 0]}>
              {topEmployees.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-6 bg-blue-50 rounded-lg p-4 border-l-4" style={{ borderColor: MOOVING_COLORS.primary }}>
          <p className="text-sm text-gray-700">
            <span className="font-bold" style={{ color: MOOVING_COLORS.primary }}>Empleado más activo:</span> {topEmployees[0]?.name} ({topEmployees[0]?.horas}h)
            <span className="ml-4"><span className="font-bold" style={{ color: MOOVING_COLORS.primary }}>Promedio Top 10:</span> {(topEmployees.reduce((sum, e) => sum + e.horas, 0) / 10).toFixed(0)}h</span>
          </p>
        </div>
      </div>

      {/* Top 10 Clients */}
      <div className="bg-white rounded-xl shadow-md p-8">
        <h2 className="text-2xl font-bold mb-6" style={{ color: MOOVING_COLORS.primary }}>
          🏢 Top 10 Clientes por Horas
        </h2>

        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={topClients}
            margin={{ top: 5, right: 30, left: 0, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="name"
              stroke={MOOVING_COLORS.primary}
              angle={-45}
              textAnchor="end"
              height={100}
            />
            <YAxis stroke={MOOVING_COLORS.primary} label={{ value: 'Horas', angle: -90, position: 'insideLeft' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: `2px solid ${MOOVING_COLORS.info}`,
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
              }}
              formatter={(value) => [`${value}h`, 'Horas']}
            />
            <Bar dataKey="horas" radius={[8, 8, 0, 0]}>
              {topClients.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-6 bg-cyan-50 rounded-lg p-4 border-l-4" style={{ borderColor: MOOVING_COLORS.info }}>
          <p className="text-sm text-gray-700">
            <span className="font-bold" style={{ color: MOOVING_COLORS.info }}>Cliente principal:</span> {topClients[0]?.name} ({topClients[0]?.horas}h)
            <span className="ml-4"><span className="font-bold" style={{ color: MOOVING_COLORS.info }}>Total Top 10:</span> {topClients.reduce((sum, c) => sum + c.horas, 0)}h</span>
          </p>
        </div>
      </div>
    </div>
  )
}
