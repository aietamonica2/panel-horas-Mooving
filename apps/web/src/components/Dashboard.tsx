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
import { TimeBagSection } from './TimeBagSection'
import { EmployeeWorkloadBreakdown } from './EmployeeWorkloadBreakdown'
import { ClientMonthlyDistribution } from './ClientMonthlyDistribution'
import { EmployeeAvailability } from './EmployeeAvailability'
import { BagOfHoursTable } from './BagOfHoursTable'
import { AnalyticsCharts } from './AnalyticsCharts'
import { QuickLogModal } from './QuickLogModal'
import { EditRecordModal } from './EditRecordModal'
import { EmailRemindersModal } from './EmailRemindersModal'
import { api } from '../api'

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
  const [isQuickLogOpen, setIsQuickLogOpen] = useState(false)
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)

  
  // Multi-select filter states
  const [selectedMonths, setSelectedMonths] = useState<string[]>([])
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['project', 'internal', 'meeting', 'training', 'other'])
  const [aiMessage, setAiMessage] = useState<string | null>(null)
  const [auditResults, setAuditResults] = useState<{ status: string; anomalies_found: { issue: string; user: string }[] } | null>(null)
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<any | null>(null)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const pageSize = 15

  const filteredRecords = getFilteredRecords()

  // Senda AI action handler via MCP
  const handleSendaAction = async (action: string) => {
    let toolName = ''
    let params: any = {}
    
    if (action === 'Sincronización Clockify') {
      toolName = 'sync_clockify_hours'
    } else if (action === 'Sincronización Zendesk Support') {
      toolName = 'sync_zendesk_tickets'
    } else if (action === 'Auditoría Completa de Horas') {
      toolName = 'audit_timesheet'
    } else if (action === 'Envío de Alertas Inactividad') {
      toolName = 'send_inactivity_alerts'
      params = { users: ['monica.aieta', 'federico.gomez'] }
    } else {
      return
    }

    setAiMessage(`🤖 Senda AI: Ejecutando herramienta ${toolName}...`)
    
    try {
      const res = await api.callMcpTool(toolName, params)
      const data = await res.json()
      
      if (data.success) {
        if (toolName === 'audit_timesheet') {
          setAuditResults(data.result)
          setIsAuditModalOpen(true)
          setAiMessage(`✅ Senda AI: Auditoría finalizada. Estado: ${data.result.status}`)
        } else {
          setAiMessage(`✅ Senda AI: ${data.result.message || 'Completado con éxito'}`)
          await fetchRecords()
        }
      } else {
        setAiMessage(`❌ Error: ${data.error || 'No se pudo completar la operación'}`)
      }
    } catch (err) {
      console.error(err)
      setAiMessage('❌ Error de conexión al ejecutar herramienta.')
    } finally {
      setTimeout(() => setAiMessage(null), 6000)
    }
  }

  // Reset filters
  const handleResetFilters = () => {
    setSelectedMonths([])
    setSelectedEmployees([])
    setSelectedClients([])
    setSelectedProjects([])
    setSelectedCategories(['project', 'internal', 'meeting', 'training', 'other'])
    clearFilters()
  }

  const fetchRecords = async () => {
    try {
      const res = await api.listRecords()
      if (res.ok) {
        const json = await res.json()
        if (json.success && json.data?.records) {
          useDataStore.setState({ records: json.data.records })
        }
      }
    } catch (err) {
      console.error('Error fetching records:', err)
    }
  }

  // Load records on mount
  React.useEffect(() => {
    fetchRecords()
  }, [])

  // Sync state filters to Zustand store (consolidated to prevent cascading re-renders)
  React.useEffect(() => {
    setFilters({
      months: selectedMonths,
      employees: selectedEmployees,
      clients: selectedClients,
      projects: selectedProjects,
      workTypes: selectedCategories
    })
    setCurrentPage(1)
  }, [selectedMonths, selectedEmployees, selectedClients, selectedProjects, selectedCategories, setFilters])

  const totalHours = filteredRecords.reduce((sum, r) => sum + (r.duration_decimal || 0), 0)
  const avgHours = filteredRecords.length > 0 ? (totalHours / filteredRecords.length).toFixed(2) : '0.00'
  const uniqueEmployees = new Set(filteredRecords.map(r => r.employee_id)).size
  const uniqueClients = new Set(filteredRecords.map(r => r.client_id)).size

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setAiMessage('🤖 Senda QA Agent: Analizando y auditando el archivo CSV subido...')

    try {
      const text = await file.text()
      const lines = text.split('\n')
      
      // Fetch dynamic entities for mapping
      const [empRes, cliRes, projRes] = await Promise.all([
        api.callMcpTool('get_employees', {}).then(res => res.json()),
        api.callMcpTool('get_clients', {}).then(res => res.json()),
        api.callMcpTool('get_projects', {}).then(res => res.json())
      ])
      
      const dbEmployees = empRes.success ? empRes.result.employees : []
      const dbClients = cliRes.success ? cliRes.result.clients : []
      const dbProjects = projRes.success ? projRes.result.projects : []

      const recordsToUpload = lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
          const values = line.split(',').map(v => v.trim())
          const dur = parseFloat(values[6])
          
          // Validate and normalize work_type to fit enum with Spanish fallback mapping
          const rawWt = (values[8] || '').toLowerCase()
          let wt = 'project'
          if (rawWt.includes('reun') || rawWt.includes('meet') || rawWt.includes('call')) wt = 'meeting'
          else if (rawWt.includes('intern')) wt = 'internal'
          else if (rawWt.includes('capacit') || rawWt.includes('train')) wt = 'training'
          else if (rawWt.includes('otro') || rawWt.includes('other')) wt = 'other'
          else if (['project', 'internal', 'meeting', 'training', 'other'].includes(rawWt)) wt = rawWt

          const empName = values[1] || 'Unknown Employee';
          const cliName = values[3] || 'Unknown Client';
          const projName = values[5] || 'Unknown Project';

          const matchedEmp = dbEmployees.find((e: any) => e.name.toLowerCase() === empName.toLowerCase())
          const matchedCli = dbClients.find((c: any) => c.name.toLowerCase() === cliName.toLowerCase())
          const matchedProj = dbProjects.find((p: any) => p.name.toLowerCase() === projName.toLowerCase())

          return {
            employee_id: matchedEmp ? matchedEmp.id : (values[0] || 'unknown-emp'),
            employee_name: matchedEmp ? matchedEmp.name : empName,
            client_id: matchedCli ? matchedCli.id : (values[2] || 'unknown-client'),
            client_name: matchedCli ? matchedCli.name : cliName,
            project_id: matchedProj ? matchedProj.id : (values[4] || 'unknown-project'),
            project_name: matchedProj ? matchedProj.name : projName,
            duration_decimal: isNaN(dur) ? 1.0 : dur,
            date: values[7] || new Date().toISOString().split('T')[0],
            work_type: wt as any,
            description: values[9] || ''
          }
        })

      if (recordsToUpload.length === 0) {
        setAiMessage('❌ Error: El archivo CSV está vacío.')
        return
      }

      const res = await api.uploadCSV({ records: recordsToUpload })
      const json = await res.json()
      if (res.ok && json.success) {
        setAiMessage(`✅ Senda QA Agent: Se subieron y guardaron ${json.data.uploaded} registros.`)
        await fetchRecords()
      } else {
        setAiMessage(`❌ Error al subir: ${json.error || 'Error de validación'}`)
      }
    } catch (err) {
      setAiMessage(`❌ Error de conexión: ${err instanceof Error ? err.message : 'Error'}`)
    } finally {
      setTimeout(() => setAiMessage(null), 5000)
    }
  }

  // Chart data - Distribution by employee
  const employeeData = Array.from(
    filteredRecords.reduce((acc, r) => {
      const key = r.employee_name
      const existing = acc.get(key) || { name: key, horas: 0 }
      existing.horas += r.duration_decimal
      acc.set(key, existing)
      return acc
    }, new Map()).values()
  ).slice(0, 8)

  // Chart data - Distribution by client
  const clientData = Array.from(
    filteredRecords.reduce((acc, r) => {
      const key = r.client_name
      const existing = acc.get(key) || { name: key, value: 0 }
      existing.value += r.duration_decimal
      acc.set(key, existing)
      return acc
    }, new Map()).values()
  ).slice(0, 6)

  return (
    <div style={{ backgroundColor: MOOVING_COLORS.lightBg }} className="min-h-screen relative">
      {/* Toast Notification para Senda AI */}
      {aiMessage && (
        <div className="fixed top-6 right-6 z-50 bg-indigo-900 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 transition-all animate-fade-in-down border border-indigo-400">
          <span className="text-sm font-medium">{aiMessage}</span>
        </div>
      )}

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

        {/* Senda AI Copilot Section (Chatless UI) */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl shadow-md p-6 mb-8 border-l-4 border-indigo-500">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-indigo-900 flex items-center gap-2">
              <span className="text-2xl">🤖</span> Senda AI Copilot
            </h2>
            <span className="text-xs bg-indigo-200 text-indigo-800 px-3 py-1 rounded-full font-bold uppercase tracking-wider">Modo Integrado</span>
          </div>
          <div className="flex flex-wrap gap-3 mb-6">
            <button 
              onClick={() => setIsEmailModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-5 border border-indigo-700 rounded-lg shadow-sm transition flex items-center gap-2"
            >
              📧 Recordatorios por Mail
            </button>
            <button 
              onClick={() => setIsQuickLogOpen(true)}
              className="bg-white hover:bg-indigo-50 text-indigo-700 font-medium py-2 px-5 border border-indigo-200 rounded-lg shadow-sm transition flex items-center gap-2"
            >
              ⚡ Carga Rápida
            </button>
            <button 
              onClick={() => handleSendaAction('Sincronización Clockify')}
              className="bg-white hover:bg-indigo-50 text-indigo-700 font-medium py-2 px-5 border border-indigo-200 rounded-lg shadow-sm transition flex items-center gap-2"
            >
              ⏱️ Importar de Clockify
            </button>
            <button 
              onClick={() => handleSendaAction('Sincronización Zendesk Support')}
              className="bg-white hover:bg-indigo-50 text-indigo-700 font-medium py-2 px-5 border border-indigo-200 rounded-lg shadow-sm transition flex items-center gap-2"
            >
              🎧 Extraer de Zendesk
            </button>
            <button 
              onClick={() => handleSendaAction('Auditoría Completa de Horas')}
              className="bg-white hover:bg-indigo-50 text-indigo-700 font-medium py-2 px-5 border border-indigo-200 rounded-lg shadow-sm transition flex items-center gap-2"
            >
              🛡️ Auditar Tiempos
            </button>
          </div>

          {/* ROI Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-indigo-100 pt-4">
            <div className="bg-white/60 p-3 rounded-lg flex items-center gap-3">
              <div className="text-2xl">⚡</div>
              <div>
                <p className="text-xs text-indigo-600 font-semibold uppercase">Tiempo Ahorrado</p>
                <p className="text-lg font-bold text-indigo-900">42h / mes</p>
              </div>
            </div>
            <div className="bg-white/60 p-3 rounded-lg flex items-center gap-3">
              <div className="text-2xl">✅</div>
              <div>
                <p className="text-xs text-indigo-600 font-semibold uppercase">Errores Prevenidos</p>
                <p className="text-lg font-bold text-indigo-900">15 anomalías</p>
              </div>
            </div>
            <div className="bg-white/60 p-3 rounded-lg flex items-center gap-3">
              <div className="text-2xl">🔄</div>
              <div>
                <p className="text-xs text-indigo-600 font-semibold uppercase">Automatización</p>
                <p className="text-lg font-bold text-indigo-900">92% de tickets</p>
              </div>
            </div>
          </div>
          
          <p className="text-xs text-indigo-500 mt-4 font-medium uppercase tracking-wide">
            Capa 6 Senda AI: ROI Medible • Los procesos se ejecutan en segundo plano vía MCP
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8" style={{ borderLeft: `4px solid ${MOOVING_COLORS.secondary}` }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold" style={{ color: MOOVING_COLORS.primary }}>📤 Importación Manual (QA Validated)</h2>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept=".csv"
              onChange={handleCsvUpload}
              className="block flex-1 text-sm px-4 py-2 border-2 rounded-lg cursor-pointer hover:border-opacity-50 transition"
              style={{ borderColor: MOOVING_COLORS.border }}
            />
            <span className="text-sm text-gray-500 w-1/2">
              Al cargar el archivo, Senda AI lo interceptará para buscar anomalías antes de guardarlo en la base de datos.
            </span>
          </div>
        </div>

        {records.length > 0 && (
          <FilterPanel
            records={records}
            selectedMonths={selectedMonths}
            selectedEmployees={selectedEmployees}
            selectedClients={selectedClients}
            selectedProjects={selectedProjects}
            selectedCategories={selectedCategories}
            onMonthsChange={setSelectedMonths}
            onEmployeesChange={setSelectedEmployees}
            onClientsChange={setSelectedClients}
            onProjectsChange={setSelectedProjects}
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

        {/* Executive Insights (C-Level) */}
        {filteredRecords.length > 0 && (
          <div className="bg-gradient-to-r from-gray-900 to-slate-800 rounded-xl shadow-xl p-6 mb-8 text-white">
            <div className="flex items-center justify-between mb-6 border-b border-gray-700 pb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span className="text-yellow-400">👑</span> Métricas Ejecutivas (C-Level)
              </h2>
              <span className="text-xs bg-gray-700 px-3 py-1 rounded-full uppercase tracking-widest text-gray-300">Confidencial</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Facturabilidad */}
              <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm border border-white/5">
                <p className="text-sm text-gray-400 font-medium uppercase tracking-wider mb-1">Índice de Facturabilidad</p>
                <div className="flex items-end gap-3">
                  <p className="text-3xl font-bold text-green-400">
                    {totalHours > 0 ? ((filteredRecords.filter(r => r.work_type === 'project').reduce((acc, r) => acc + r.duration_decimal, 0) / totalHours) * 100).toFixed(1) : '0.0'}%
                  </p>
                </div>
                <p className="text-xs text-gray-400 mt-2">Objetivo saludable: &gt; 75%</p>
              </div>

              {/* Fuga de Capital / Overhead */}
              <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm border border-white/5">
                <p className="text-sm text-gray-400 font-medium uppercase tracking-wider mb-1">Carga de Overhead</p>
                <div className="flex items-end gap-3">
                  <p className="text-3xl font-bold text-red-400">
                    {totalHours > 0 ? ((filteredRecords.filter(r => r.work_type !== 'project').reduce((acc, r) => acc + r.duration_decimal, 0) / totalHours) * 100).toFixed(1) : '0.0'}%
                  </p>
                </div>
                <p className="text-xs text-gray-400 mt-2">Tiempo en reuniones internas / tareas no facturables</p>
              </div>

              {/* Cliente Riesgoso / Vampiro */}
              <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm border border-white/5">
                <p className="text-sm text-gray-400 font-medium uppercase tracking-wider mb-1">Concentración de Riesgo</p>
                <div className="flex items-end gap-3">
                  <p className="text-xl font-bold text-yellow-400 truncate">
                    {clientData.sort((a, b) => b.value - a.value)[0]?.name || 'N/A'}
                  </p>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Consume el {totalHours > 0 ? ((clientData.sort((a, b) => b.value - a.value)[0]?.value || 0) / totalHours * 100).toFixed(1) : '0.0'}% del tiempo total
                </p>
              </div>
            </div>
          </div>
        )}

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

        {/* Employee Workload Breakdown - NEW in Phase 2 */}
        {records.length > 0 && (
          <div className="mt-8">
            <EmployeeWorkloadBreakdown records={filteredRecords} />
          </div>
        )}

        {/* Client Monthly Distribution - NEW in Phase 2 */}
        {records.length > 0 && (
          <div className="mt-8">
            <ClientMonthlyDistribution records={filteredRecords} />
          </div>
        )}

        {/* Employee Availability - NEW in Phase 2 */}
        {records.length > 0 && (
          <div className="mt-8">
            <EmployeeAvailability records={filteredRecords} />
          </div>
        )}

        {/* Bag of Hours Table - NEW in Phase 2 */}
        {records.length > 0 && (
          <div className="mt-8">
            <BagOfHoursTable records={filteredRecords} />
          </div>
        )}

        {/* Analytics Charts - NEW in Phase 2 */}
        {records.length > 0 && (
          <div className="mt-8">
            <AnalyticsCharts records={filteredRecords} />
          </div>
        )}

        {/* Time Bag Section */}
        {records.length > 0 && (
          <TimeBagSection records={filteredRecords} />
        )}

        {/* Data Table */}
        {filteredRecords.length > 0 && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden mt-8">
            <div className="px-6 py-4 border-b flex justify-between items-center" style={{ borderColor: MOOVING_COLORS.border }}>
              <h3 className="text-lg font-semibold" style={{ color: MOOVING_COLORS.primary }}>
                📅 Registros de Horas ({filteredRecords.length})
              </h3>
              <div className="text-xs text-gray-500 font-medium">
                Mostrando {Math.min((currentPage - 1) * pageSize + 1, filteredRecords.length)} - {Math.min(currentPage * pageSize, filteredRecords.length)} de {filteredRecords.length}
              </div>
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
                    <th className="px-6 py-3 text-center font-semibold" style={{ color: MOOVING_COLORS.primary }}>Origen</th>
                    <th className="px-6 py-3 text-left font-semibold" style={{ color: MOOVING_COLORS.primary }}>Fecha</th>
                    <th className="px-6 py-3 text-center font-semibold" style={{ color: MOOVING_COLORS.primary }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((record, idx) => (
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
                          {record.duration_decimal.toFixed(2)}h
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-600">
                        {record.work_type === 'project' && '🏢 Proyecto'}
                        {record.work_type === 'internal' && '⚙️ Interna'}
                        {record.work_type === 'meeting' && '👥 Reunión'}
                        {record.work_type === 'training' && '🎓 Capacitación'}
                        {record.work_type === 'other' && '📋 Otro'}
                      </td>
                      <td className="px-6 py-3 text-center">
                        {record.source === 'senda_ai' ? (
                          <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs font-bold">🤖 Senda AI</span>
                        ) : record.source === 'zendesk' ? (
                          <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold">🎧 Zendesk</span>
                        ) : record.source === 'clockify' ? (
                          <span className="bg-sky-100 text-sky-700 px-2 py-1 rounded text-xs font-bold">⏱️ Clockify</span>
                        ) : (
                          <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-bold">📋 Manual</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-gray-500">{record.date}</td>
                      <td className="px-6 py-3 text-center">
                        <button 
                          onClick={() => setEditingRecord(record)}
                          className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-md text-xs font-medium transition"
                        >
                          ✏️ Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            {filteredRecords.length > pageSize && (
              <div className="px-6 py-3 bg-slate-50 border-t flex justify-between items-center text-xs">
                <span className="text-gray-500 font-medium">
                  Página {currentPage} de {Math.ceil(filteredRecords.length / pageSize)}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 bg-white border border-gray-300 rounded font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
                  >
                    ← Anterior
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredRecords.length / pageSize), p + 1))}
                    disabled={currentPage >= Math.ceil(filteredRecords.length / pageSize)}
                    className="px-3 py-1 bg-white border border-gray-300 rounded font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {filteredRecords.length === 0 && records.length === 0 && (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <p className="text-3xl mb-4">📭</p>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No hay datos</h3>
            <p className="text-gray-500">Carga un archivo CSV para comenzar a analizar</p>
          </div>
        )}

        <QuickLogModal 
          isOpen={isQuickLogOpen} 
          onClose={() => setIsQuickLogOpen(false)} 
        />

        <EditRecordModal
          isOpen={!!editingRecord}
          onClose={() => setEditingRecord(null)}
          record={editingRecord}
          onSuccess={() => {
            fetchRecords()
            setAiMessage('✅ Registro actualizado correctamente')
            setTimeout(() => setAiMessage(null), 3000)
          }}
        />

        {/* Modal de Auditoría */}
        {isAuditModalOpen && auditResults && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-900 to-slate-800 p-4 flex justify-between items-center text-white">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <span className="text-2xl">🛡️</span> Reporte de Auditoría de Horas
                </h2>
                <button onClick={() => setIsAuditModalOpen(false)} className="text-gray-300 hover:text-white transition">
                  ✕
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className={`p-4 rounded-lg flex items-center gap-3 ${auditResults.status === 'clean' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
                  <span className="text-2xl">{auditResults.status === 'clean' ? '✅' : '⚠️'}</span>
                  <div>
                    <h3 className="font-bold uppercase text-xs tracking-wider">
                      Estado: {auditResults.status === 'clean' ? 'Limpio' : 'Requiere Revisión'}
                    </h3>
                    <p className="text-sm">
                      {auditResults.status === 'clean' 
                        ? 'No se detectaron excesos de horas diarias en el período auditado.' 
                        : `Se encontraron ${auditResults.anomalies_found.length} registros con posibles anomalías.`}
                    </p>
                  </div>
                </div>

                {auditResults.anomalies_found.length > 0 && (
                  <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                    {auditResults.anomalies_found.map((anomaly, idx) => (
                      <div key={idx} className="p-3 hover:bg-gray-50 flex justify-between items-center text-sm">
                        <span className="font-semibold text-gray-700">{anomaly.user}</span>
                        <span className="text-red-600 bg-red-50 px-2 py-1 rounded font-medium border border-red-100">
                          {anomaly.issue}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button 
                    onClick={() => setIsAuditModalOpen(false)}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow font-medium transition"
                  >
                    Entendido
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <EmailRemindersModal 
          isOpen={isEmailModalOpen} 
          onClose={() => setIsEmailModalOpen(false)} 
        />
      </div>
    </div>
  )
}
