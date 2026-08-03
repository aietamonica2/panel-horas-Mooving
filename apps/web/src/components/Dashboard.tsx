/**
 * Main Dashboard Component - Mooving Style
 * Professional operations dashboard with modern design
 */

import React, { useState, useMemo } from 'react'
import { Copy } from 'lucide-react'
import { useDataStore } from '../stores/dataStore'
import { TimeRecord } from '../types'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'
import { APP_VERSION, RELEASE_DATE } from '../version'
import { FilterPanel } from './FilterPanel'
import { DistributionTable } from './DistributionTable'
import { AvailabilityMetrics } from './AvailabilityMetrics'
import { TimeBagSection } from './TimeBagSection'
import { EmployeeWorkloadBreakdown } from './EmployeeWorkloadBreakdown'
import { ClientMonthlyDistribution } from './ClientMonthlyDistribution'
import { EmployeeAvailability } from './EmployeeAvailability'
import { AnalyticsCharts } from './AnalyticsCharts'
import { ClientRankingMoM } from './ClientRankingMoM'
import { QuickLogModal } from './QuickLogModal'
import { EditRecordModal } from './EditRecordModal'
import { EmailRemindersModal } from './EmailRemindersModal'
import { ClientContractsSection } from './ClientContractsSection'
import { ExportExcelButton } from './ExportExcelButton'
import { InactivityAlertBanner } from './InactivityAlertBanner'
import { EmployeeComparisonModal } from './EmployeeComparisonModal'
import { ExecutiveDrilldownModal } from './ExecutiveDrilldownModal'
import { api } from '../api'
import { parseCsv, mapTogglRows } from '../utils/csvImport'

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

// FEAT-04: campos de facturación USD persistidos por otra tarea. Se leen de
// forma defensiva (cast local) para no depender de cambios en types/ y para
// que tsc no falle si el campo aún no está declarado en la interfaz global.
type BillingFields = { rate_usd?: number; amount_usd?: number }

const getAmountUsd = (r: TimeRecord): number => {
  const v = (r as TimeRecord & BillingFields).amount_usd
  return typeof v === 'number' && isFinite(v) ? v : 0
}

// Regla de facturabilidad existente, centralizada para reutilizar en las
// derivaciones sin cambiar la semántica original.
const isBillableRecord = (r: TimeRecord): boolean =>
  r.is_billable === 1 || r.is_billable === true || r.work_type === 'project'

const fmtUsd = (n: number, decimals = 0): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number.isFinite(n) ? n : 0)

const toNum = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

// FEAT-04b: métricas ejecutivas REALES calculadas server-side con el valor hora
// por empleado (employees.hourly_rate_usd, default 45). get_executive_metrics
// agrega el ingreso ESTIMADO (= horas × tarifa) por cliente/empleado. No son
// importes facturados reales, por eso la UI lo rotula "Estimado según valor hora".
type ExecutiveMetrics = {
  total_revenue_usd?: number
  billable_hours?: number
  nonbillable_hours?: number
  revenue_by_client?: unknown
  revenue_by_employee?: unknown
  billable_rate_pct?: number
}

type RevenueRow = { name: string; usd: number; hours: number; perHour: number }

// Normaliza revenue_by_client / revenue_by_employee de forma defensiva porque el
// contrato exacto lo define el backend (otra tarea). Acepta un array de objetos
// ([{ name|client_name|employee_name, usd|revenue|.., hours|total_hours }]) o un
// mapa ({ "Nombre": 1234 } | { "Nombre": { usd, hours } }) y devuelve filas
// normalizadas ordenadas por ingreso desc.
const normalizeRevenue = (input: unknown): RevenueRow[] => {
  const rows: RevenueRow[] = []
  const add = (name: string, usd: number, hours: number, perHour?: number) => {
    const nm = (name || '').trim()
    if (!nm) return
    const h = hours > 0 ? hours : 0
    rows.push({
      name: nm,
      usd,
      hours: h,
      perHour: perHour !== undefined && Number.isFinite(perHour) ? perHour : h > 0 ? usd / h : 0,
    })
  }
  if (Array.isArray(input)) {
    for (const item of input) {
      if (!item || typeof item !== 'object') continue
      const o = item as Record<string, unknown>
      const name = String(o.name ?? o.client_name ?? o.employee_name ?? o.client ?? o.employee ?? o.label ?? '')
      const usd = toNum(o.usd ?? o.revenue_usd ?? o.revenue ?? o.total_usd ?? o.amount_usd ?? o.amount)
      const hours = toNum(o.hours ?? o.total_hours ?? o.billable_hours)
      const perHourRaw = o.per_hour ?? o.perHour ?? o.revenue_per_hour ?? o.hourly_rate_usd
      add(name, usd, hours, perHourRaw !== undefined ? toNum(perHourRaw) : undefined)
    }
  } else if (input && typeof input === 'object') {
    for (const [name, val] of Object.entries(input as Record<string, unknown>)) {
      if (val && typeof val === 'object') {
        const o = val as Record<string, unknown>
        const usd = toNum(o.usd ?? o.revenue_usd ?? o.revenue ?? o.total_usd ?? o.amount)
        const hours = toNum(o.hours ?? o.total_hours)
        const perHourRaw = o.per_hour ?? o.perHour ?? o.revenue_per_hour
        add(name, usd, hours, perHourRaw !== undefined ? toNum(perHourRaw) : undefined)
      } else {
        add(name, toNum(val), 0)
      }
    }
  }
  return rows.sort((a, b) => b.usd - a.usd)
}

export const Dashboard: React.FC = () => {
  // B7: los filtros viven SOLO en el store (única fuente de verdad). El Dashboard
  // no mantiene useState espejo ni useEffect de sincronización: lee `filters` y
  // los componentes de filtrado (FilterPanel) mutan el store directamente.
  const { records, filters, getFilteredRecords } = useDataStore()
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [isQuickLogOpen, setIsQuickLogOpen] = useState(false)
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
  const [aiMessage, setAiMessage] = useState<string | null>(null)
  const [auditResults, setAuditResults] = useState<{ status: string; anomalies_found: { issue: string; user: string }[] } | null>(null)
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<any | null>(null)
  // A4: modo del modal de registro — 'edit' (PUT) o 'duplicate' (POST de un registro nuevo)
  const [recordModalMode, setRecordModalMode] = useState<'edit' | 'duplicate'>('edit')
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false)
  const [isCompareModalOpen, setIsCompareModalOpen] = useState<boolean>(false)
  const [executiveDrilldownType, setExecutiveDrilldownType] = useState<'billable' | 'overhead' | 'risk' | null>(null)
  const [employeeCapacities, setEmployeeCapacities] = useState<Record<string, number>>({})
  // FEAT-04b: métricas ejecutivas reales (get_executive_metrics), sólo admin.
  // execMetrics=null => aún sin cargar; execMetricsError => la tool falló.
  const [execMetrics, setExecMetrics] = useState<ExecutiveMetrics | null>(null)
  const [execMetricsError, setExecMetricsError] = useState<boolean>(false)
  const isAdmin = (localStorage.getItem('mooving_user_role') || 'employee') === 'admin'
  const pageSize = 15

  // ARCH-04 + B7: memoizar el resultado de filtrado por rendimiento, pero SIN
  // duplicar lógica: el memo invoca getFilteredRecords() del store, que a su vez
  // delega en applyFilters() (única implementación del filtrado). Recomputamos
  // solo cuando cambian records o filters, evitando arrays nuevos en cada render.
  const filteredRecords = useMemo(
    () => getFilteredRecords(),
    [records, filters, getFilteredRecords]
  )

  // Senda AI action handler via MCP
  const handleSendaAction = async (action: string, recipients?: string[]) => {
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
      // NUEVO-3: enviar los destinatarios REALES que reporta el banner
      // (empleado puntual o lista completa de inactivos), no una lista fija.
      params = recipients && recipients.length > 0 ? { recipients } : {}
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

  const [allEmployeesList, setAllEmployeesList] = useState<{ id: string; name: string; is_active?: number }[]>([])

  const fetchRecords = async () => {
    try {
      const res = await api.listRecords()
      if (res.ok) {
        const json = await res.json()
        if (json.success && json.data?.records) {
          useDataStore.setState({ records: json.data.records })
        }
      }
      const empRes = await api.callMcpTool('get_employees', {})
      const empJson = await empRes.json()
      if (empJson.success && empJson.result?.employees) {
        setAllEmployeesList(empJson.result.employees)
        const caps: Record<string, number> = {}
        empJson.result.employees.forEach((e: any) => {
          caps[e.id] = e.daily_hours_expected !== undefined ? Number(e.daily_hours_expected) : 8.0
        })
        setEmployeeCapacities(caps)
      }
    } catch (err) {
      console.error('Error fetching records:', err)
    }
  }

  // Load records on mount
  React.useEffect(() => {
    fetchRecords()
  }, [])

  // FEAT-04b: al montar y SÓLO para admin, traer las métricas ejecutivas reales
  // (ingreso estimado según el valor hora por empleado). Si la tool falla o no hay
  // tarifas cargadas (revenue 0), la UI cae a un fallback honesto en vez de vacío.
  React.useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    const loadExecutiveMetrics = async () => {
      try {
        const res = await api.callMcpTool('get_executive_metrics', {})
        const json = await res.json()
        if (cancelled) return
        if (json?.success && json.result) {
          setExecMetrics(json.result as ExecutiveMetrics)
          setExecMetricsError(false)
        } else {
          setExecMetrics(null)
          setExecMetricsError(true)
        }
      } catch (err) {
        if (cancelled) return
        console.error('Error fetching executive metrics:', err)
        setExecMetrics(null)
        setExecMetricsError(true)
      }
    }
    loadExecutiveMetrics()
    return () => {
      cancelled = true
    }
  }, [isAdmin])

  // NUEVO-11: Dark mode funcional con Tailwind darkMode:'class'.
  // Togglea la clase `dark` en el root del documento para que las variantes
  // `dark:` apliquen globalmente. Limpia al desmontar para no filtrar el modo
  // oscuro a otras vistas (p.ej. el login).
  React.useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.classList.toggle('dark', isDarkMode)
    return () => {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  // B7: los filtros ya viven solo en el store, así que acá no hay nada que
  // sincronizar. Único efecto derivado: al cambiar CUALQUIER filtro (meses,
  // empleados, clientes, proyectos, categorías, fuentes o rango de fechas) se
  // resetea la paginación de la tabla. `filters` cambia de identidad en cada
  // setFilters/clearFilters, por lo que basta con observarlo.
  React.useEffect(() => {
    setCurrentPage(1)
  }, [filters])

  // ARCH-04: KPIs agregados memoizados (una sola pasada por deps estables).
  const { totalHours, avgHours, uniqueEmployees, uniqueClients } = useMemo(() => {
    const totalHours = filteredRecords.reduce((sum, r) => sum + (r.duration_decimal || 0), 0)
    const uniqueDatesCount = new Set(filteredRecords.map(r => r.date)).size
    const avgHours = uniqueDatesCount > 0 ? (totalHours / uniqueDatesCount).toFixed(2) : '0.00'
    const uniqueEmployees = new Set(filteredRecords.map(r => r.employee_id)).size
    const uniqueClients = new Set(filteredRecords.map(r => r.client_id)).size
    return { totalHours, avgHours, uniqueEmployees, uniqueClients }
  }, [filteredRecords])

  // Etiqueta corta para una clave de mes YYYY-MM → "Jul 2026".
  const fmtMonthKey = (key: string): string => {
    const abbr = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    const [yy, mm] = (key || '').split('-')
    const idx = parseInt(mm, 10) - 1
    return idx >= 0 && idx < 12 ? `${abbr[idx]} ${yy}` : key
  }

  // E1-03: Comparativa mes vs mes anterior (Δ% de horas del equipo). Agrupa los
  // registros filtrados por mes (YYYY-MM) y compara los dos meses más recientes
  // con datos. Devuelve null si hay menos de dos meses en el período filtrado.
  const monthOverMonth = useMemo(() => {
    const byMonth = new Map<string, number>()
    for (const r of filteredRecords) {
      const m = (r.date || '').slice(0, 7)
      if (m.length === 7) byMonth.set(m, (byMonth.get(m) || 0) + (r.duration_decimal || 0))
    }
    const months = Array.from(byMonth.keys()).sort()
    if (months.length < 2) return null
    const curKey = months[months.length - 1]
    const prevKey = months[months.length - 2]
    const cur = byMonth.get(curKey) || 0
    const prev = byMonth.get(prevKey) || 0
    const deltaPct = prev > 0 ? ((cur - prev) / prev) * 100 : null
    return { curKey, prevKey, cur, prev, deltaPct }
  }, [filteredRecords])

  // E0-07 / E3-02: Forecast de cierre del mes en curso. Proyecta el total de
  // horas al cierre = registradas en el mes + (capacidad diaria del equipo ×
  // días hábiles restantes, hoy incluido) y lo compara contra la capacidad
  // esperada del mes completo. Usa la capacidad real por empleado (Epic 0) y
  // sólo cae a 8h/empleado si aún no se cargaron las capacidades.
  const forecast = useMemo(() => {
    const now = new Date()
    const y = now.getFullYear()
    const mo = now.getMonth() // 0-based
    const today = now.getDate()
    const monthKey = `${y}-${String(mo + 1).padStart(2, '0')}`

    const countBiz = (from: number, to: number) => {
      let n = 0
      for (let d = from; d <= to; d++) {
        const wd = new Date(y, mo, d).getDay() // 0 domingo, 6 sábado
        if (wd !== 0 && wd !== 6) n++
      }
      return n
    }
    const daysInMonth = new Date(y, mo + 1, 0).getDate()
    const totalBiz = countBiz(1, daysInMonth)
    const remainingBiz = countBiz(today, daysInMonth) // incluye hoy
    // N6: días hábiles TRANSCURRIDOS del mes (hoy incluido) para la card de
    // Capacidad del Equipo: esperado a la fecha vs registrado del mes.
    const elapsedBiz = countBiz(1, today)

    // U5: el forecast es una métrica de EQUIPO, así que usa `records` sin filtrar
    // tanto en el numerador (horas del mes) como en el denominador (capacidad del
    // equipo). Antes el numerador respetaba los filtros y el denominador no, así que
    // al filtrar por 1 persona proyectaba cientos de horas contra la capacidad de
    // todo el equipo. Ahora el forecast se mantiene estable ante los filtros de tabla.
    const monthRecords = records.filter(r => (r.date || '').slice(0, 7) === monthKey)
    const registered = monthRecords.reduce((s, r) => s + (r.duration_decimal || 0), 0)

    const activeEmps = allEmployeesList.filter(e => e.is_active !== 0)
    let teamDaily = activeEmps.reduce((s, e) => s + (employeeCapacities[e.id] ?? 8), 0)
    if (teamDaily <= 0) {
      const uniq = new Set(monthRecords.map(r => r.employee_id)).size
      teamDaily = (uniq || new Set(records.map(r => r.employee_id)).size) * 8
    }

    const forecastTotal = registered + teamDaily * remainingBiz
    const expectedFull = teamDaily * totalBiz
    const pctOfExpected = expectedFull > 0 ? (forecastTotal / expectedFull) * 100 : null

    // N6: Capacidad del Equipo a la fecha (mes en curso). Misma base de EQUIPO
    // que el forecast (`records` sin filtrar + capacidad diaria de activos):
    // esperado a la fecha = Σ daily_hours_expected × días hábiles transcurridos.
    const expectedToDate = teamDaily * elapsedBiz
    const capacityDelta = registered - expectedToDate
    const capacityPct = expectedToDate > 0 ? (registered / expectedToDate) * 100 : null

    return {
      monthKey,
      registered,
      forecastTotal,
      expectedFull,
      remainingBiz,
      totalBiz,
      teamDaily,
      pctOfExpected,
      elapsedBiz,
      expectedToDate,
      capacityDelta,
      capacityPct,
      hasData: monthRecords.length > 0,
    }
  }, [records, allEmployeesList, employeeCapacities])

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setAiMessage('🤖 Senda QA Agent: Analizando y auditando el archivo CSV subido...')

    try {
      const text = await file.text()

      // Robust RFC-4180 parse + header-name based mapping (Toggl/Clockify export).
      // Invalid rows are rejected (never fabricated with 1.0 / hoy()).
      const rows = parseCsv(text)
      const { records: recordsToUpload, rejected } = mapTogglRows(rows)

      if (recordsToUpload.length === 0) {
        setAiMessage(
          rejected.length > 0
            ? `❌ No se importó ninguna fila: ${rejected.length} fila(s) rechazada(s) por fecha/duración inválida.`
            : '❌ Error: El archivo CSV no contiene filas válidas para importar.'
        )
        return
      }

      const res = await api.uploadCSV({ records: recordsToUpload })
      const json = await res.json()
      if (res.ok && json.success) {
        const uploaded = json.data?.uploaded ?? recordsToUpload.length
        const base = `✅ Senda QA Agent: Se subieron y guardaron ${uploaded} registros.`
        setAiMessage(
          rejected.length > 0
            ? `${base} ⚠️ ${rejected.length} fila(s) se rechazaron por fecha o duración inválida.`
            : base
        )
        await fetchRecords()
      } else {
        setAiMessage(`❌ Error al subir: ${json.error || 'Error de validación'}`)
      }
    } catch (err) {
      setAiMessage(`❌ Error de conexión: ${err instanceof Error ? err.message : 'Error'}`)
    } finally {
      // Allow re-uploading the same file by clearing the input value.
      e.target.value = ''
      setTimeout(() => setAiMessage(null), 6000)
    }
  }

  // Chart data - Distribution by employee (ARCH-04: memoizado)
  const employeeData = useMemo(
    () =>
      Array.from(
        filteredRecords.reduce((acc, r) => {
          const key = r.employee_name
          const existing = acc.get(key) || { name: key, horas: 0 }
          existing.horas += r.duration_decimal
          acc.set(key, existing)
          return acc
        }, new Map()).values()
      )
        .sort((a, b) => b.horas - a.horas)
        .slice(0, 8),
    [filteredRecords]
  )

  // Chart data - Distribution by client (ARCH-04: memoizado)
  const clientData = useMemo(
    () =>
      Array.from(
        filteredRecords.reduce((acc, r) => {
          const key = r.client_name
          const existing = acc.get(key) || { name: key, value: 0 }
          existing.value += r.duration_decimal
          acc.set(key, existing)
          return acc
        }, new Map()).values()
      )
        .sort((a, b) => b.value - a.value)
        .slice(0, 6),
    [filteredRecords]
  )

  // ARCH-04 + FEAT-04: métricas ejecutivas memoizadas. Una sola pasada calcula
  // horas facturables/overhead y los montos USD reales (amount_usd). Si ningún
  // registro trae amount_usd > 0, hasBillingData=false y la UI cae al proxy
  // porcentual rotulado como "estimado" en vez de inventar cifras.
  const billing = useMemo(() => {
    let billableHours = 0
    let totalUsd = 0
    let billableUsd = 0
    let nonBillableUsd = 0
    let anyAmount = false
    const clientUsd: Record<string, { usd: number; hours: number }> = {}

    for (const r of filteredRecords) {
      const hrs = r.duration_decimal || 0
      const amt = getAmountUsd(r)
      if (amt > 0) anyAmount = true
      totalUsd += amt
      if (isBillableRecord(r)) {
        billableHours += hrs
        billableUsd += amt
      } else {
        nonBillableUsd += amt
      }
      if (r.client_name) {
        const c = clientUsd[r.client_name] || { usd: 0, hours: 0 }
        c.usd += amt
        c.hours += hrs
        clientUsd[r.client_name] = c
      }
    }

    const revenuePerClient = Object.entries(clientUsd)
      .map(([name, v]) => ({ name, usd: v.usd, hours: v.hours, perHour: v.hours > 0 ? v.usd / v.hours : 0 }))
      .sort((a, b) => b.usd - a.usd)

    const billableRatio = totalHours > 0 ? (billableHours / totalHours) * 100 : 0
    const overheadRatio = totalHours > 0 ? 100 - billableRatio : 0

    return {
      hasBillingData: anyAmount,
      billableHours,
      billableRatio,
      overheadRatio,
      totalUsd,
      billableUsd,
      nonBillableUsd,
      clientUsd,
      revenuePerClient,
    }
  }, [filteredRecords, totalHours])

  // ARCH-04: cliente de mayor consumo memoizado. clientData ya viene ordenado
  // desc por horas, así que el tope es el primer elemento (sin re-sort en render).
  const topRiskClient = useMemo(() => {
    const top = clientData[0]
    if (!top) return null
    const usdInfo = billing.clientUsd[top.name]
    return {
      name: top.name,
      hours: top.value,
      ratio: totalHours > 0 ? (top.value / totalHours) * 100 : 0,
      usd: usdInfo?.usd ?? 0,
      perHour: usdInfo && usdInfo.hours > 0 ? usdInfo.usd / usdInfo.hours : 0,
    }
  }, [clientData, billing, totalHours])

  // FEAT-04b: view-model de las métricas ejecutivas reales. hasRevenue=false
  // cuando el server devuelve 0 (sin tarifas) o cuando execMetrics no cargó: en
  // ese caso la UI muestra el fallback honesto. Los % proxies (billing) son
  // independientes de esto y se muestran SIEMPRE.
  const executive = useMemo(() => {
    const m = execMetrics
    const totalRevenue = toNum(m?.total_revenue_usd)
    const billableHours = toNum(m?.billable_hours)
    const nonBillableHours = toNum(m?.nonbillable_hours)
    const byClient = normalizeRevenue(m?.revenue_by_client)
    const byEmployee = normalizeRevenue(m?.revenue_by_employee)
    const byClientMap: Record<string, RevenueRow> = {}
    for (const r of byClient) byClientMap[r.name] = r
    const overallPerHour = billableHours > 0 ? totalRevenue / billableHours : 0
    return {
      hasRevenue: totalRevenue > 0,
      totalRevenue,
      billableHours,
      nonBillableHours,
      overallPerHour,
      byClient,
      byEmployee,
      byClientMap,
    }
  }, [execMetrics])

  // Ingreso estimado del cliente más concentrado (para enriquecer la tarjeta de
  // riesgo, que sigue mostrando el % de horas aunque no haya ingreso).
  const topRiskRevenue = topRiskClient ? executive.byClientMap[topRiskClient.name] : undefined

  return (
    <div className="min-h-screen relative transition-colors bg-slate-50 dark:bg-slate-900 text-gray-900 dark:text-gray-100">
      {/* Toast Notification para Senda AI */}
      {aiMessage && (
        <div className="fixed top-6 right-6 z-50 bg-indigo-900 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 transition-all animate-fade-in-down border border-indigo-400">
          <span className="text-sm font-medium">{aiMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-[#1a5f7a] dark:bg-slate-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold">Panel de Operaciones</h1>
              <p className="text-blue-100 mt-1">Mooving • Análisis de Horas y Capacidad</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsCompareModalOpen(true)}
                className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold backdrop-blur-sm border border-white/20 transition flex items-center gap-1.5"
              >
                <span>🔄</span> Comparar Empleados
              </button>
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold backdrop-blur-sm border border-white/20 transition flex items-center gap-1.5"
              >
                <span>{isDarkMode ? '☀️ Modo Claro' : '🌙 Modo Oscuro'}</span>
              </button>
              <div className="text-right">
                <p className="text-blue-100 font-bold">{APP_VERSION}</p>
                <p className="text-xs text-blue-200">{RELEASE_DATE}</p>
              </div>
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
            <ExportExcelButton records={filteredRecords} />
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

        {/* B7: FilterPanel consume el store directamente (cero props espejo) */}
        {records.length > 0 && <FilterPanel />}

        {/* Inactivity Alert Banner (Epic 1) */}
        <InactivityAlertBanner
          records={filteredRecords}
          allEmployees={allEmployeesList}
          onSendReminder={(recipientIds) => handleSendaAction('Envío de Alertas Inactividad', recipientIds)}
        />

        {/* KPIs Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Hours */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 hover:shadow-lg transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-300 text-sm font-medium">Total Horas</p>
                <p className="text-4xl font-bold mt-2" style={{ color: MOOVING_COLORS.primary }}>
                  {totalHours.toFixed(1)}
                </p>
              </div>
              <div className="text-4xl">⏱️</div>
            </div>
            <p className="text-xs text-gray-400 mt-4">de {filteredRecords.length} registros</p>
            {monthOverMonth && monthOverMonth.deltaPct !== null && (
              <p
                className={`text-xs mt-1 font-semibold ${monthOverMonth.deltaPct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
                title={`${fmtMonthKey(monthOverMonth.curKey)}: ${monthOverMonth.cur.toFixed(1)}h · ${fmtMonthKey(monthOverMonth.prevKey)}: ${monthOverMonth.prev.toFixed(1)}h`}
              >
                {monthOverMonth.deltaPct >= 0 ? '▲' : '▼'} {Math.abs(monthOverMonth.deltaPct).toFixed(1)}% vs {fmtMonthKey(monthOverMonth.prevKey)}
              </p>
            )}
          </div>

          {/* Daily Average */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 hover:shadow-lg transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-300 text-sm font-medium">Promedio Diario</p>
                <p className="text-4xl font-bold mt-2" style={{ color: MOOVING_COLORS.secondary }}>
                  {avgHours}h
                </p>
              </div>
              <div className="text-4xl">📊</div>
            </div>
            <p className="text-xs text-gray-400 mt-4">por día registrado</p>
          </div>

          {/* Employees */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 hover:shadow-lg transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-300 text-sm font-medium">Empleados</p>
                <p className="text-4xl font-bold mt-2" style={{ color: MOOVING_COLORS.success }}>
                  {uniqueEmployees}
                </p>
              </div>
              <div className="text-4xl">👥</div>
            </div>
            <p className="text-xs text-gray-400 mt-4">activos en período</p>
          </div>

          {/* Clients */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 hover:shadow-lg transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-300 text-sm font-medium">Clientes</p>
                <p className="text-4xl font-bold mt-2" style={{ color: MOOVING_COLORS.info }}>
                  {uniqueClients}
                </p>
              </div>
              <div className="text-4xl">🏢</div>
            </div>
            <p className="text-xs text-gray-400 mt-4">en cartera</p>
          </div>

          {/* N6: Capacidad del Equipo — mes en curso, métrica de EQUIPO (records
              sin filtrar, igual que el forecast): registradas vs esperadas a la
              fecha (Σ daily_hours_expected × días hábiles transcurridos). */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 hover:shadow-lg transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-300 text-sm font-medium">Capacidad del Equipo</p>
                <p
                  className={`text-4xl font-bold mt-2 ${
                    forecast.capacityPct === null
                      ? 'text-gray-400 dark:text-gray-500'
                      : forecast.capacityPct >= 90
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : forecast.capacityPct >= 70
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-red-600 dark:text-red-400'
                  }`}
                  title={`Horas registradas del mes vs esperadas a la fecha (${forecast.elapsedBiz} días hábiles transcurridos, hoy incluido)`}
                >
                  {forecast.capacityPct !== null ? `${forecast.capacityPct.toFixed(0)}%` : '—'}
                </p>
              </div>
              <div className="text-4xl">🎯</div>
            </div>
            <p className="text-xs text-gray-400 mt-4">
              {forecast.registered.toFixed(1)}h registradas vs {forecast.expectedToDate.toFixed(1)}h esperadas · {fmtMonthKey(forecast.monthKey)}
            </p>
            {forecast.expectedToDate > 0 && (
              <p
                className={`text-xs mt-1 font-semibold ${
                  forecast.capacityDelta >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                Δ {forecast.capacityDelta >= 0 ? '+' : ''}{forecast.capacityDelta.toFixed(1)}h · {forecast.elapsedBiz} días hábiles transcurridos
              </p>
            )}
          </div>
        </div>

        {/* Forecast de cierre de mes (E0-07 / E3-02) */}
        {forecast.hasData && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 mb-8 border-l-4" style={{ borderColor: '#6366f1' }}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  🔮 Proyección de cierre — {fmtMonthKey(forecast.monthKey)}
                </p>
                <p className="text-4xl font-bold mt-2" style={{ color: MOOVING_COLORS.primary }}>
                  {forecast.forecastTotal.toFixed(0)}h
                  <span className="text-base font-normal text-gray-400"> proyectadas</span>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {forecast.registered.toFixed(0)}h ya registradas + {(forecast.teamDaily * forecast.remainingBiz).toFixed(0)}h estimadas
                  {' '}({forecast.remainingBiz} {forecast.remainingBiz === 1 ? 'día hábil restante' : 'días hábiles restantes'}, hoy incluido)
                </p>
              </div>
              <div className="md:text-right">
                <p className="text-sm text-gray-500 dark:text-gray-300">Capacidad esperada del mes</p>
                <p className="text-2xl font-bold" style={{ color: MOOVING_COLORS.secondary }}>{forecast.expectedFull.toFixed(0)}h</p>
                {forecast.pctOfExpected !== null && (
                  <span
                    className={`inline-block mt-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                      forecast.pctOfExpected >= 90
                        ? 'bg-emerald-100 text-emerald-800'
                        : forecast.pctOfExpected >= 70
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {forecast.pctOfExpected.toFixed(0)}% de la capacidad esperada
                  </span>
                )}
              </div>
            </div>
            {forecast.expectedFull > 0 && (
              <div className="mt-4 h-2 w-full bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, (forecast.forecastTotal / forecast.expectedFull) * 100)}%`,
                    backgroundColor: '#6366f1',
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Executive Insights (C-Level) */}
        {filteredRecords.length > 0 && (
          <div className="bg-gradient-to-r from-gray-900 to-slate-800 rounded-xl shadow-xl p-6 mb-8 text-white">
            <div className="flex items-start justify-between mb-6 border-b border-gray-700 pb-4">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <span className="text-yellow-400">👑</span> Métricas Ejecutivas (C-Level)
                </h2>
                <p className="text-xs text-gray-400 mt-1">Estimado según valor hora del equipo</p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="text-xs bg-amber-900/50 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-full uppercase tracking-widest"
                  title="Facturación estimada a partir del valor hora por empleado (hourly_rate_usd), no de importes facturados reales"
                >
                  Estimado · valor hora
                </span>
                <span className="text-xs bg-gray-700 px-3 py-1 rounded-full uppercase tracking-widest text-gray-300">Confidencial</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Facturabilidad */}
              <div 
                onClick={() => setExecutiveDrilldownType('billable')}
                className="bg-white/10 p-4 rounded-lg backdrop-blur-sm border border-white/5 cursor-pointer hover:bg-white/15 transition group"
                title="Click para ver desglose detallado de horas facturables"
              >
                <div className="flex justify-between items-center mb-1">
                  <p className="text-sm text-gray-400 font-medium uppercase tracking-wider">Índice de Facturabilidad</p>
                  <span className="text-xs text-indigo-300 opacity-0 group-hover:opacity-100 transition font-semibold">Ver detalle 🔍</span>
                </div>
                <div className="flex items-end gap-3">
                  <p className="text-3xl font-bold text-green-400">
                    {billing.billableRatio.toFixed(1)}%
                  </p>
                  {executive.hasRevenue && (
                    <p className="text-base font-semibold text-green-300 mb-1">{fmtUsd(executive.totalRevenue)}</p>
                  )}
                </div>
                {executive.hasRevenue ? (
                  <p className="text-xs text-gray-400 mt-2">Ingreso estimado {fmtUsd(executive.totalRevenue)} · {executive.billableHours.toFixed(1)}h facturables (valor hora del equipo)</p>
                ) : (
                  <p className="text-xs text-gray-400 mt-2">Objetivo saludable: &gt; 75% · % calculado por tipo de tarea (is_billable)</p>
                )}
              </div>

              {/* Fuga de Capital / Overhead */}
              <div 
                onClick={() => setExecutiveDrilldownType('overhead')}
                className="bg-white/10 p-4 rounded-lg backdrop-blur-sm border border-white/5 cursor-pointer hover:bg-white/15 transition group"
                title="Click para ver desglose detallado de horas no facturables"
              >
                <div className="flex justify-between items-center mb-1">
                  <p className="text-sm text-gray-400 font-medium uppercase tracking-wider">Carga de Overhead</p>
                  <span className="text-xs text-indigo-300 opacity-0 group-hover:opacity-100 transition font-semibold">Ver detalle 🔍</span>
                </div>
                <div className="flex items-end gap-3">
                  <p className="text-3xl font-bold text-red-400">
                    {billing.overheadRatio.toFixed(1)}%
                  </p>
                  {executive.hasRevenue && executive.nonBillableHours > 0 && (
                    <p className="text-base font-semibold text-red-300 mb-1">{executive.nonBillableHours.toFixed(1)}h</p>
                  )}
                </div>
                {executive.hasRevenue ? (
                  <p className="text-xs text-gray-400 mt-2">{executive.nonBillableHours.toFixed(1)}h no facturables (reuniones / tareas internas) · sin ingreso asociado</p>
                ) : (
                  <p className="text-xs text-gray-400 mt-2">Tiempo en reuniones internas / tareas no facturables · % por tipo de tarea</p>
                )}
              </div>

              {/* Cliente Riesgoso / Vampiro */}
              <div 
                onClick={() => setExecutiveDrilldownType('risk')}
                className="bg-white/10 p-4 rounded-lg backdrop-blur-sm border border-white/5 cursor-pointer hover:bg-white/15 transition group"
                title="Click para ver desglose detallado de horas del cliente concentrado"
              >
                <div className="flex justify-between items-center mb-1">
                  <p className="text-sm text-gray-400 font-medium uppercase tracking-wider">Concentración de Riesgo</p>
                  <span className="text-xs text-indigo-300 opacity-0 group-hover:opacity-100 transition font-semibold">Ver detalle 🔍</span>
                </div>
                <div className="flex items-end gap-3">
                  <p className="text-xl font-bold text-yellow-400 truncate">
                    {topRiskClient?.name || 'N/A'}
                  </p>
                  {executive.hasRevenue && topRiskRevenue && (
                    <p className="text-sm font-semibold text-yellow-200 mb-0.5">{fmtUsd(topRiskRevenue.usd)}</p>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Consume el {topRiskClient ? topRiskClient.ratio.toFixed(1) : '0.0'}% del tiempo total
                  {executive.hasRevenue && topRiskRevenue && topRiskRevenue.perHour > 0 &&
                    ` · ${fmtUsd(topRiskRevenue.perHour, 2)}/h estimado`}
                </p>
              </div>
            </div>

            {/* FEAT-04b: Facturación ESTIMADA según el valor hora por empleado
                (get_executive_metrics). Fallback honesto si la tool falla o no hay
                tarifas cargadas (revenue 0). Los % proxies de arriba se muestran
                SIEMPRE, sean cuales sean el estado o el resultado de esta sección. */}
            <div className="mt-6 border-t border-gray-700 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                  <span>💵</span> Facturación estimada (USD)
                </h3>
                <span className="text-[10px] text-amber-300 uppercase tracking-wider font-semibold">Estimado · valor hora del equipo</span>
              </div>

              {isAdmin && !execMetrics && !execMetricsError ? (
                <div className="bg-white/5 p-4 rounded-lg border border-white/5 text-sm text-gray-400 animate-pulse">
                  Calculando facturación estimada según el valor hora del equipo…
                </div>
              ) : executive.hasRevenue ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Facturación Total Estimada</p>
                      <p className="text-2xl font-bold text-emerald-300 mt-1">{fmtUsd(executive.totalRevenue)}</p>
                      <p className="text-[11px] text-gray-500 mt-1">Horas × valor hora por empleado</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Horas Facturables / No Facturables</p>
                      <p className="text-2xl font-bold text-green-300 mt-1">
                        {executive.billableHours.toFixed(1)}h
                        <span className="text-gray-500 text-lg font-normal"> / </span>
                        <span className="text-red-300">{executive.nonBillableHours.toFixed(1)}h</span>
                      </p>
                      <p className="text-[11px] text-gray-500 mt-1">Facturables vs. no facturables</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Ingreso por Hora</p>
                      <p className="text-2xl font-bold text-emerald-300 mt-1">{executive.overallPerHour > 0 ? `${fmtUsd(executive.overallPerHour, 2)}/h` : 'N/A'}</p>
                      <p className="text-[11px] text-gray-500 mt-1">Sobre horas facturables</p>
                    </div>
                  </div>

                  {executive.byClient.some(c => c.usd > 0) && (
                    <div className="mt-4">
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2">Top clientes por ingreso (estimado)</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {executive.byClient.filter(c => c.usd > 0).slice(0, 6).map(c => (
                          <div key={c.name} className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-lg border border-white/5 text-xs">
                            <span className="text-gray-300 truncate max-w-[55%]" title={c.name}>{c.name}</span>
                            <span className="text-right">
                              <span className="font-bold text-emerald-300">{fmtUsd(c.usd)}</span>
                              {c.perHour > 0 && <span className="text-gray-500 block text-[10px]">{fmtUsd(c.perHour, 2)}/h · {c.hours.toFixed(1)}h</span>}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {executive.byEmployee.some(e => e.usd > 0) && (
                    <div className="mt-4">
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2">Ingreso por empleado (estimado)</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {executive.byEmployee.filter(e => e.usd > 0).slice(0, 6).map(e => (
                          <div key={e.name} className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-lg border border-white/5 text-xs">
                            <span className="text-gray-300 truncate max-w-[55%]" title={e.name}>{e.name}</span>
                            <span className="text-right">
                              <span className="font-bold text-emerald-300">{fmtUsd(e.usd)}</span>
                              {e.perHour > 0 && <span className="text-gray-500 block text-[10px]">{fmtUsd(e.perHour, 2)}/h · {e.hours.toFixed(1)}h</span>}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-amber-900/20 border border-amber-500/30 p-4 rounded-lg">
                  <p className="text-sm text-amber-200 font-medium flex items-center gap-2">
                    <span>⚠️</span> Cargá el valor hora del equipo para ver la facturación estimada
                  </p>
                  <p className="text-xs text-amber-300/70 mt-1">
                    {execMetricsError
                      ? 'No se pudieron obtener las métricas ejecutivas. Los indicadores porcentuales de arriba siguen disponibles.'
                      : 'Aún no hay tarifas (valor hora) cargadas por empleado. Los indicadores porcentuales de arriba se calculan por tipo de tarea y siguen visibles.'}
                  </p>
                </div>
              )}
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
          <AvailabilityMetrics records={filteredRecords} employeeCapacities={employeeCapacities} />
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
            <EmployeeWorkloadBreakdown records={filteredRecords} employeeCapacities={employeeCapacities} />
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

        {/* Client Contracts & Retainers (Epic 4) */}
        {records.length > 0 && (
          <div className="mt-8">
            <ClientContractsSection records={filteredRecords} />
          </div>
        )}

        {/* Analytics Charts - NEW in Phase 2 */}
        {records.length > 0 && (
          <div className="mt-8">
            <AnalyticsCharts records={filteredRecords} />
          </div>
        )}

        {/* N1: Ranking de clientes MoM — métrica de equipo del mes corriente,
            alimentado con `records` SIN filtrar (no depende de los filtros). */}
        {records.length > 0 && (
          <div className="mt-8">
            <ClientRankingMoM records={records} />
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
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => { setRecordModalMode('edit'); setEditingRecord(record) }}
                            className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-md text-xs font-medium transition"
                          >
                            ✏️ Editar
                          </button>
                          {/* A4: duplicar registro — misma visibilidad que Editar (sin gating por rol) */}
                          <button
                            onClick={() => { setRecordModalMode('duplicate'); setEditingRecord(record) }}
                            title="Duplicar registro"
                            className="text-sky-600 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 px-3 py-1 rounded-md text-xs font-medium transition inline-flex items-center gap-1"
                          >
                            <Copy size={12} /> Duplicar
                          </button>
                        </div>
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

        <EmployeeComparisonModal
          isOpen={isCompareModalOpen}
          onClose={() => setIsCompareModalOpen(false)}
          records={filteredRecords}
          employees={allEmployeesList}
        />

        <ExecutiveDrilldownModal
          isOpen={!!executiveDrilldownType}
          onClose={() => setExecutiveDrilldownType(null)}
          type={executiveDrilldownType}
          records={filteredRecords}
        />

        <EditRecordModal
          isOpen={!!editingRecord}
          onClose={() => setEditingRecord(null)}
          record={editingRecord}
          mode={recordModalMode}
          onSuccess={() => {
            fetchRecords()
            setAiMessage(
              recordModalMode === 'duplicate'
                ? '✅ Registro duplicado correctamente'
                : '✅ Registro actualizado correctamente'
            )
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
