/**
 * Client Monthly Distribution Component
 * Shows hours per client per month matrix
 */

import React from 'react'
import { TimeRecord } from '../types'

interface ClientMonthlyDistributionProps {
  records: TimeRecord[]
}

const MOOVING_COLORS = {
  primary: '#1a5f7a',
  secondary: '#f97316',
  success: '#10b981',
  info: '#0ea5e9',
}

export const ClientMonthlyDistribution: React.FC<ClientMonthlyDistributionProps> = ({ records }) => {
  // Filter for project work only (clients are associated with projects)
  const projectRecords = records.filter(r => r.work_type === 'project' && r.client_name)

  if (projectRecords.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-8 text-center">
        <p className="text-gray-500">No hay horas de proyecto registradas</p>
      </div>
    )
  }

  // Extract unique months
  const uniqueMonths = Array.from(new Set(
    projectRecords.map(r => r.date.substring(0, 7))
  )).sort()

  // Extract unique clients
  const uniqueClients = Array.from(new Set(
    projectRecords.map(r => r.client_name)
  )).sort()

  // Build client x month matrix
  const buildMatrix = () => {
    const matrix: { [client: string]: { [month: string]: number } } = {}

    uniqueClients.forEach(client => {
      matrix[client] = {}
      uniqueMonths.forEach(month => {
        const hours = projectRecords
          .filter(r => r.client_name === client && r.date.substring(0, 7) === month)
          .reduce((sum, r) => sum + r.duration_decimal, 0)
        matrix[client][month] = hours
      })
    })

    return matrix
  }

  const matrix = buildMatrix()

  // Calculate totals
  const totals = { byMonth: {} as { [m: string]: number }, byClient: {} as { [c: string]: number } }

  uniqueMonths.forEach(m => {
    totals.byMonth[m] = uniqueClients.reduce((sum, c) => sum + (matrix[c]?.[m] || 0), 0)
  })

  uniqueClients.forEach(c => {
    totals.byClient[c] = uniqueMonths.reduce((sum, m) => sum + (matrix[c]?.[m] || 0), 0)
  })

  const grandTotal = uniqueClients.reduce((sum, c) => sum + totals.byClient[c], 0)

  const monthFormat = (month: string) => {
    const monthNames: { [key: string]: string } = {
      '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
      '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
      '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
    }
    return monthNames[month.substring(5, 7)] || month
  }

  // Sort clients by total hours descending
  const sortedClients = [...uniqueClients].sort(
    (a, b) => (totals.byClient[b] || 0) - (totals.byClient[a] || 0)
  )

  return (
    <div className="bg-white rounded-xl shadow-md p-8">
      <h2 className="text-2xl font-bold mb-6" style={{ color: MOOVING_COLORS.primary }}>
        📋 Distribución Mensual por Cliente
      </h2>

      <div style={{ overflowX: 'auto' }}>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr style={{ background: `linear-gradient(135deg, ${MOOVING_COLORS.primary}, ${MOOVING_COLORS.secondary})`, color: 'white' }}>
              <th className="px-4 py-3 text-left font-semibold">Cliente</th>
              {uniqueMonths.map(m => (
                <th key={m} className="px-3 py-3 text-center font-semibold whitespace-nowrap">
                  {monthFormat(m)}
                </th>
              ))}
              <th className="px-3 py-3 text-center font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {sortedClients.map(client => (
              <tr key={client} className="border-b hover:bg-gray-50 transition">
                <td className="px-4 py-3 font-medium text-gray-800">{client}</td>
                {uniqueMonths.map(m => (
                  <td key={m} className="px-3 py-3 text-center">
                    {matrix[client]?.[m] > 0 ? `${matrix[client][m]}h` : '-'}
                  </td>
                ))}
                <td className="px-3 py-3 text-center font-semibold" style={{ color: MOOVING_COLORS.secondary }}>
                  {totals.byClient[client]}h
                </td>
              </tr>
            ))}
            <tr style={{ background: `${MOOVING_COLORS.secondary}15`, borderTop: `2px solid ${MOOVING_COLORS.secondary}` }}>
              <td className="px-4 py-3 font-bold">Total/Mes</td>
              {uniqueMonths.map(m => (
                <td key={m} className="px-3 py-3 text-center font-bold" style={{ color: MOOVING_COLORS.secondary }}>
                  {totals.byMonth[m]}h
                </td>
              ))}
              <td className="px-3 py-3 text-center font-bold text-lg" style={{ color: MOOVING_COLORS.secondary }}>
                {grandTotal}h
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
        <div className="bg-blue-50 rounded-lg p-4 border-l-4" style={{ borderColor: MOOVING_COLORS.primary }}>
          <div className="text-xs text-gray-600 uppercase font-semibold mb-1">Total Clientes</div>
          <div className="text-2xl font-bold" style={{ color: MOOVING_COLORS.primary }}>
            {uniqueClients.length}
          </div>
        </div>

        <div className="bg-orange-50 rounded-lg p-4 border-l-4" style={{ borderColor: MOOVING_COLORS.secondary }}>
          <div className="text-xs text-gray-600 uppercase font-semibold mb-1">Total Horas</div>
          <div className="text-2xl font-bold" style={{ color: MOOVING_COLORS.secondary }}>
            {grandTotal}h
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4 border-l-4" style={{ borderColor: MOOVING_COLORS.success }}>
          <div className="text-xs text-gray-600 uppercase font-semibold mb-1">Promedio/Cliente</div>
          <div className="text-2xl font-bold" style={{ color: MOOVING_COLORS.success }}>
            {(grandTotal / uniqueClients).toFixed(1)}h
          </div>
        </div>

        <div className="bg-cyan-50 rounded-lg p-4 border-l-4" style={{ borderColor: MOOVING_COLORS.info }}>
          <div className="text-xs text-gray-600 uppercase font-semibold mb-1">Mayor Cliente</div>
          <div className="text-2xl font-bold" style={{ color: MOOVING_COLORS.info }}>
            {sortedClients[0] ? totals.byClient[sortedClients[0]] : 0}h
          </div>
        </div>
      </div>
    </div>
  )
}
