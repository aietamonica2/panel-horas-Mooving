/**
 * Main Dashboard Component - Mooving Style
 * Professional operations dashboard with modern design
 */

import React, { useState } from 'react'
import { useDataStore } from '../stores/dataStore'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'
import { APP_VERSION, RELEASE_DATE } from '../version'
import { FilterPanel } from './FilterPanel'
import { DistributionTable } from './DistributionTable'
import { AvailabilityMetrics } from './AvailabilityMetrics'

const MOOVING_COLORS = {
  primary: '#1a5f7a',    // Mooving dark blue
  secondary: '#f97316',  // Mooving orange
  success: '#10b981',    // Green
  warning: '#f59e0b',    // Amber
  info: '#0ea5e9',       // Light blue
  danger: '#ef4444',     // Red
  lightBg: '#f8fafc',    // Light background
  border: '#e2e8f0',     // Border color
}

const CHART_COLORS = ['#1a5f7a', '#f97316', '#10b981', '#0ea5e9', '#8b5cf6', '#ec4899']

export const Dashboard: React.FC = () => {
  const { records, filters, setFilters, getFilteredRecords, clearFilters } = useDataStore()
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['project', 'internal', 'meeting'])

  const filteredRecords = getFilteredRecords()

  // Extract unique months from records
  const availableMonths = Array.from(new Set(
    records.map(r => r.date.substring(5, 7))
  )).sort()

  // Get unique categories
  const categories = Array.from(new Set(records.map(r => r.work_type)))

  // Filter by month and category
  const applyFilters = () => {
    if (selectedMonth) {
      setFilters({ dateRangeStart: `2026-${selectedMonth}-01`, dateRangeEnd: `2026-${selectedMonth}-31` })
    }
    if (selectedCategories.length > 0) {
      setFilters({ workTypes: selectedCategories })
    }
  }

  // Reset filters
  const handleResetFilters = () => {
    setSelectedMonth('')
    setSelectedCategories(['project', 'internal', 'meeting'])
    clearFilters()
  }

  // Apply filters on change
  React.useEffect(() => {
    if (selectedMonth) {
      setFilters({ dateRangeStart: `2026-${selectedMonth}-01`, dateRangeEnd: `2026-${selectedMonth}-31` })
    } else {
      setFilters({ dateRangeStart: '', dateRangeEnd: '' })
    }
  }, [selectedMonth, setFilters])

  React.useEffect(() => {
    if (selectedCategories.length > 0) {
      setFilters({ workTypes: selectedCategories })
    } else {
      setFilters({ workTypes: [] })
    }
  }, [selectedCategories, setFilters])

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

  // Chart data - Distribution by employee
  const employeeData = Array.from(
    filteredRecords.reduce((acc, r) => {
      const key = r.employee_name
      const existing = acc.get(key) || { name: key, horas: 0 }
      existing.horas += r.duration_hours
      acc.set(key, existing)
      return acc
    }, new Map()).values()
  ).slice(0, 8)

  // Chart data - Distribution by client
  const clientData = Array.from(
    filteredRecords.reduce((acc, r) => {
      const key = r.client_name
      const existing = acc.get(key) || { name: key, value: 0 }
      existing.value += r.duration_hours
      acc.set(key, existing)
      return acc
    }, new Map()).values()
  ).slice(0, 6)

  return (
    <div style={{ backgroundColor: MOOVING_COLORS.lightBg }} className="min-h-screen">
      {/* Header */}
      <div style={{ backgroundColor: MOOVING_COLORS.primary }} className="text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold">Panel de Operaciones</h1>
              <p className="text-blue-100 mt-1">Mooving • Análisis de Horas y Capacidad</p>
            </div>
            <div className="text-right">
              <p className="text-blue-100">{APP_VERSION}</p>
              <p className="text-sm text-blue-200">{RELEASE_DATE}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Upload Section */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8" style={{ borderLeft: `4px solid ${MOOVING_COLORS.secondary}` }}>
          <h2 className="text-xl font-semibold mb-4" style={{ color: MOOVING_COLORS.primary }}>📤 Importar Datos</h2>
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept=".csv"
              onChange={handleCsvUpload}
              className="block flex-1 text-sm px-4 py-2 border-2 rounded-lg cursor-pointer hover:border-opacity-50 transition"
              style={{ borderColor: MOOVING_COLORS.border }}
            />
            <span className="text-sm text-gray-500">Arrastra o selecciona CSV</span>
          </div>
        </div>

        {/* Filter Panel */}
        {records.length > 0 && (
          <FilterPanel
            selectedMonth={selectedMonth}
            selectedCategories={selectedCategories}
            availableMonths={availableMonths}
            categories={categories}
            onMonthChange={setSelectedMonth}
            onCategoriesChange={setSelectedCategories}
            onReset={handleResetFilters}
          />
        )}

        {/* KPIs Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Hours */}
          <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Total Horas</p>
                <p className="text-4xl font-bold mt-2" style={{ color: MOOVING_COLORS.primary }}>
                  {totalHours.toFixed(1)}
                </p>
              </div>
              <div className="text-4xl">⏱️</div>
            </div>
            <p className="text-xs text-gray-400 mt-4">de {filteredRecords.length} registros</p>
          </div>

          {/* Daily Average */}
          <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Promedio Diario</p>
                <p className="text-4xl font-bold mt-2" style={{ color: MOOVING_COLORS.secondary }}>
                  {avgHours}h
                </p>
              </div>
              <div className="text-4xl">📊</div>
            </div>
            <p className="text-xs text-gray-400 mt-4">por trabajador</p>
          </div>

          {/* Employees */}
          <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Empleados</p>
                <p className="text-4xl font-bold mt-2" style={{ color: MOOVING_COLORS.success }}>
                  {uniqueEmployees}
                </p>
              </div>
              <div className="text-4xl">👥</div>
            </div>
            <p className="text-xs text-gray-400 mt-4">activos en período</p>
          </div>

          {/* Clients */}
          <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Clientes</p>
                <p className="text-4xl font-bold mt-2" style={{ color: MOOVING_COLORS.info }}>
                  {uniqueClients}
                </p>
              </div>
              <div className="text-4xl">🏢</div>
            </div>
            <p className="text-xs text-gray-400 mt-4">en cartera</p>
          </div>
        </div>

        {/* Charts Section */}
        {filteredRecords.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Hours by Employee */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4" style={{ color: MOOVING_COLORS.primary }}>
                Horas por Empleado
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={employeeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={MOOVING_COLORS.border} />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                  <YAxis />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: `2px solid ${MOOVING_COLORS.primary}`,
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="horas" fill={MOOVING_COLORS.primary} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Hours by Client */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4" style={{ color: MOOVING_COLORS.primary }}>
                Distribución por Cliente
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={clientData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => entry.name}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {clientData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${Number(value).toFixed(1)}h`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Availability Metrics */}
        {filteredRecords.length > 0 && (
          <AvailabilityMetrics records={filteredRecords} />
        )}

        {/* Distribution Tables */}
        {filteredRecords.length > 0 && (
          <div className="space-y-8">
            <DistributionTable
              records={filteredRecords}
              title="📋 Distribución por Cliente"
              groupBy="client"
            />
            <DistributionTable
              records={filteredRecords}
              title="👤 Distribución por Empleado"
              groupBy="employee"
            />
            <DistributionTable
              records={filteredRecords}
              title="📂 Distribución por Proyecto"
              groupBy="project"
            />
          </div>
        )}

        {/* Data Table */}
        {filteredRecords.length > 0 && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden mt-8">
            <div className="px-6 py-4 border-b" style={{ borderColor: MOOVING_COLORS.border }}>
              <h3 className="text-lg font-semibold" style={{ color: MOOVING_COLORS.primary }}>
                📅 Últimos Registros
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ backgroundColor: MOOVING_COLORS.lightBg }}>
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold" style={{ color: MOOVING_COLORS.primary }}>Empleado</th>
                    <th className="px-6 py-3 text-left font-semibold" style={{ color: MOOVING_COLORS.primary }}>Cliente</th>
                    <th className="px-6 py-3 text-left font-semibold" style={{ color: MOOVING_COLORS.primary }}>Proyecto</th>
                    <th className="px-6 py-3 text-center font-semibold" style={{ color: MOOVING_COLORS.primary }}>Horas</th>
                    <th className="px-6 py-3 text-left font-semibold" style={{ color: MOOVING_COLORS.primary }}>Tipo</th>
                    <th className="px-6 py-3 text-left font-semibold" style={{ color: MOOVING_COLORS.primary }}>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.slice(0, 15).map((record, idx) => (
                    <tr
                      key={record.id}
                      className="border-t hover:bg-opacity-50 transition"
                      style={{
                        backgroundColor: idx % 2 === 0 ? '#fff' : MOOVING_COLORS.lightBg,
                        borderColor: MOOVING_COLORS.border
                      }}
                    >
                      <td className="px-6 py-3 font-medium">{record.employee_name}</td>
                      <td className="px-6 py-3">{record.client_name}</td>
                      <td className="px-6 py-3 text-gray-600">{record.project_name}</td>
                      <td className="px-6 py-3 text-center">
                        <span className="font-semibold" style={{ color: MOOVING_COLORS.secondary }}>
                          {record.duration_hours.toFixed(2)}h
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-600">
                        {record.work_type === 'project' && '🏢 Proyecto'}
                        {record.work_type === 'internal' && '⚙️ Interna'}
                        {record.work_type === 'meeting' && '👥 Reunión'}
                      </td>
                      <td className="px-6 py-3 text-gray-500">{record.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredRecords.length === 0 && records.length === 0 && (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <p className="text-3xl mb-4">📁</p>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No hay datos</h3>
            <p className="text-gray-500">Carga un archivo CSV para comenzar a analizar</p>
          </div>
        )}
      </div>
    </div>
  )
}
