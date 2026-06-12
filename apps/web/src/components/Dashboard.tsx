/**
 * Main Dashboard Component
 * Displays KPIs, filters, data visualization, and controls
 */

import React, { useState } from 'react'
import { useDataStore } from '../stores/dataStore'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { APP_VERSION, RELEASE_DATE } from '../version'

export const Dashboard: React.FC = () => {
  const { records, filters, setFilters, getFilteredRecords } = useDataStore()
  const [csvFile, setCsvFile] = useState<File | null>(null)

  const filteredRecords = getFilteredRecords()
  
  const totalHours = filteredRecords.reduce((sum, r) => sum + r.duration_hours, 0)
  const avgHours = filteredRecords.length > 0 ? (totalHours / filteredRecords.length).toFixed(2) : '0.00'
  const uniqueEmployees = new Set(filteredRecords.map(r => r.employee_id)).size
  const uniqueClients = new Set(filteredRecords.map(r => r.client_id)).size

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const text = await file.text()
    const lines = text.split('\n')
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    
    // Parse CSV records
    const newRecords = lines.slice(1)
      .filter(line => line.trim())
      .map(line => {
        const values = line.split(',').map(v => v.trim())
        return {
          id: Math.random().toString(36).substr(2, 9),
          tenant_id: 'default',
          employee_id: values[0],
          employee_name: values[1],
          client_id: values[2],
          client_name: values[3],
          project_id: values[4],
          project_name: values[5],
          duration_decimal: parseFloat(values[6]),
          duration_hours: Math.floor(parseFloat(values[6])),
          duration_minutes: Math.round((parseFloat(values[6]) % 1) * 60),
          date: values[7],
          work_type: 'project' as const,
          description: values[8] || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      })

    useDataStore.setState({ records: newRecords })
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-4xl font-bold text-gray-900">Panel de Operaciones Mooving</h1>
          <p className="text-gray-600 mt-2">Análisis en tiempo real • {APP_VERSION} • {RELEASE_DATE}</p>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Importar Datos</h2>
            <input
              type="file"
              accept=".csv"
              onChange={handleCsvUpload}
              className="block w-full text-sm text-gray-500 border border-gray-300 rounded-lg p-2 cursor-pointer"
            />
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Estado del Panel</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Registros Cargados:</span>
                <p className="text-2xl font-bold text-blue-600">{records.length}</p>
              </div>
              <div>
                <span className="text-gray-600">Registros Filtrados:</span>
                <p className="text-2xl font-bold text-green-600">{filteredRecords.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-600 font-medium">Total Horas</h3>
            <p className="text-3xl font-bold text-blue-600 mt-2">{totalHours.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-600 font-medium">Promedio Diario</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">{avgHours}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-600 font-medium">Empleados</h3>
            <p className="text-3xl font-bold text-purple-600 mt-2">{uniqueEmployees}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-600 font-medium">Clientes</h3>
            <p className="text-3xl font-bold text-orange-600 mt-2">{uniqueClients}</p>
          </div>
        </div>

        {/* Chart */}
        {filteredRecords.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Distribución de Horas</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={filteredRecords.slice(0, 20)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="employee_name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="duration_hours" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Data Table */}
        {filteredRecords.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mt-6">
            <h2 className="text-lg font-semibold mb-4">Últimos Registros</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left">Empleado</th>
                    <th className="px-4 py-2 text-left">Cliente</th>
                    <th className="px-4 py-2 text-left">Proyecto</th>
                    <th className="px-4 py-2 text-center">Horas</th>
                    <th className="px-4 py-2 text-left">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.slice(0, 10).map(record => (
                    <tr key={record.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2">{record.employee_name}</td>
                      <td className="px-4 py-2">{record.client_name}</td>
                      <td className="px-4 py-2">{record.project_name}</td>
                      <td className="px-4 py-2 text-center font-semibold">{record.duration_hours.toFixed(2)}</td>
                      <td className="px-4 py-2">{record.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
