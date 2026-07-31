/**
 * Employee Comparison Modal Component (Epic 1 - E1-07)
 * Side-by-side comparison of 2 employees' hours, work-type mix, active days and billability.
 *
 * FIX ("Comparar empleados no trae datos"):
 *   The imported time records use an email-derived employee_id ("monica.aieta") and a
 *   proper employee_name ("Monica Aieta"), while the employees dropdown came from
 *   get_employees whose ids look like "emp_monica" / "monica-aieta-...". The old code
 *   matched with `r.employee_id === empId || r.employee_name === empId`, so the selected
 *   canonical id never equalled the record's id or name -> every card showed 0h.
 *
 *   The selectable employees are now derived from the records themselves and matched by a
 *   NORMALIZED identity key set (lowercase, accent- and separator-stripped) covering both
 *   employee_id and employee_name, so picking anyone with data always brings their metrics.
 *   Display names are still enriched from the employees prop (get_employees) when they line up.
 */

import React, { useMemo, useState } from 'react'
import { TimeRecord } from '../types'
import { X, ArrowRightLeft, Award, Calendar } from 'lucide-react'

interface EmployeeComparisonModalProps {
  isOpen: boolean
  onClose: () => void
  records: TimeRecord[]
  employees: { id: string; name: string }[]
}

/** Collapse any identity token to a comparable key: lowercase, strip accents, keep [a-z0-9]. */
const normKey = (s?: string | number | null): string =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')

const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const fmtDate = (iso: string): string => {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  const mi = parseInt(m, 10) - 1
  if (!y || isNaN(mi) || mi < 0 || mi > 11) return iso
  return `${parseInt(d, 10)} ${MONTHS_ES[mi]} ${y}`
}

const fmtMonth = (ym: string): string => {
  const [y, m] = ym.split('-')
  const mi = parseInt(m, 10) - 1
  if (isNaN(mi) || mi < 0 || mi > 11) return ym
  return `${MONTHS_ES[mi]} ${y}`
}

interface EmpOption {
  value: string
  label: string
  keys: Set<string>
}

interface EmpStats {
  name: string
  recordsCount: number
  totalHours: number
  billableRate: string
  avgDaily: string
  uniqueDates: number
  byType: { project: number; internal: number; meeting: number; other: number }
  topClient: string
  clientBreakdown: [string, number][]
}

interface CardTheme {
  cardBg: string
  cardBorder: string
  headBorder: string
  heading: string
  num: string
  tile: string
  badge: string
  subhead: string
  barTrack: string
  barFill: string
}

const THEME_A: CardTheme = {
  cardBg: 'bg-mooving-50/60',
  cardBorder: 'border-mooving-200',
  headBorder: 'border-mooving-200',
  heading: 'text-mooving-800',
  num: 'text-mooving-700',
  tile: 'border-mooving-100',
  badge: 'bg-mooving-700',
  subhead: 'text-mooving-800',
  barTrack: 'bg-mooving-100',
  barFill: 'bg-mooving-600',
}

const THEME_B: CardTheme = {
  cardBg: 'bg-orange-50/60',
  cardBorder: 'border-orange-200',
  headBorder: 'border-orange-200',
  heading: 'text-orange-900',
  num: 'text-mooving-accent',
  tile: 'border-orange-100',
  badge: 'bg-mooving-accent',
  subhead: 'text-orange-900',
  barTrack: 'bg-orange-100',
  barFill: 'bg-orange-500',
}

const WORK_TYPES: { key: keyof EmpStats['byType']; label: string }[] = [
  { key: 'project', label: 'Proyecto' },
  { key: 'internal', label: 'Interno' },
  { key: 'meeting', label: 'Reunión' },
  { key: 'other', label: 'Otros' },
]

const EmployeeCard: React.FC<{ stats: EmpStats; theme: CardTheme; isWinner: boolean }> = ({
  stats,
  theme,
  isWinner,
}) => (
  <div className={`${theme.cardBg} border-2 ${theme.cardBorder} rounded-xl p-5 space-y-4`}>
    <div className={`flex justify-between items-center border-b ${theme.headBorder} pb-3`}>
      <div>
        <h4 className={`text-lg font-bold ${theme.heading}`}>{stats.name}</h4>
        <span className="text-[11px] text-slate-400 font-medium">{stats.recordsCount} registros en el período</span>
      </div>
      {isWinner && (
        <span className={`${theme.badge} text-white text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 whitespace-nowrap`}>
          <Award className="w-3.5 h-3.5" /> Mayor Carga
        </span>
      )}
    </div>

    {/* Headline metrics */}
    <div className="grid grid-cols-2 gap-3 text-center text-xs">
      <div className={`bg-white p-3 rounded-lg border ${theme.tile} shadow-sm`}>
        <span className="text-slate-400 font-medium block">Horas Totales</span>
        <span className={`text-xl font-bold ${theme.num}`}>{stats.totalHours.toFixed(1)}h</span>
      </div>
      <div className={`bg-white p-3 rounded-lg border ${theme.tile} shadow-sm`}>
        <span className="text-slate-400 font-medium block">% Facturable</span>
        <span className="text-xl font-bold text-emerald-600">{stats.billableRate}%</span>
      </div>
      <div className={`bg-white p-3 rounded-lg border ${theme.tile} shadow-sm`}>
        <span className="text-slate-400 font-medium block">Días con carga</span>
        <span className="text-lg font-bold text-slate-800">{stats.uniqueDates}</span>
      </div>
      <div className={`bg-white p-3 rounded-lg border ${theme.tile} shadow-sm`}>
        <span className="text-slate-400 font-medium block">Promedio Diario</span>
        <span className="text-lg font-bold text-slate-800">{stats.avgDaily}h/día</span>
      </div>
    </div>

    {/* Work-type breakdown */}
    <div>
      <h5 className={`text-xs font-bold ${theme.subhead} mb-2 uppercase`}>Horas por tipo de trabajo</h5>
      <div className="space-y-1.5">
        {WORK_TYPES.map(({ key, label }) => {
          const h = stats.byType[key]
          const pct = stats.totalHours > 0 ? (h / stats.totalHours) * 100 : 0
          return (
            <div key={key} className={`bg-white px-3 py-1.5 rounded border ${theme.tile}`}>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-slate-600">{label}</span>
                <span className="font-bold text-slate-800">
                  {h.toFixed(1)}h <span className="text-slate-400 font-normal">({pct.toFixed(0)}%)</span>
                </span>
              </div>
              <div className={`h-1.5 rounded-full ${theme.barTrack} overflow-hidden`}>
                <div className={`h-full rounded-full ${theme.barFill}`} style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>

    {/* Top clients */}
    <div>
      <h5 className={`text-xs font-bold ${theme.subhead} mb-2 uppercase`}>Desglose Clientes Top</h5>
      <div className="space-y-1.5 text-xs">
        {stats.clientBreakdown.length > 0 ? (
          stats.clientBreakdown.map(([c, h]) => (
            <div key={c} className={`flex justify-between bg-white px-3 py-1.5 rounded border ${theme.tile} font-medium`}>
              <span className="text-slate-700 truncate max-w-[180px]">{c}</span>
              <span className={`font-bold ${theme.num}`}>{h.toFixed(1)}h</span>
            </div>
          ))
        ) : (
          <div className="text-slate-400 italic px-1">Sin clientes en el período.</div>
        )}
      </div>
    </div>
  </div>
)

export const EmployeeComparisonModal: React.FC<EmployeeComparisonModalProps> = ({
  isOpen,
  onClose,
  records,
  employees,
}) => {
  const [empId1, setEmpId1] = useState<string>('')
  const [empId2, setEmpId2] = useState<string>('')
  // Empty = unbounded -> defaults to the full available range.
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')

  // Available date bounds + distinct months, derived from the records.
  const { minDate, maxDate, months } = useMemo(() => {
    let min = ''
    let max = ''
    const monthSet = new Set<string>()
    for (const r of records) {
      if (!r.date) continue
      if (!min || r.date < min) min = r.date
      if (!max || r.date > max) max = r.date
      monthSet.add(r.date.slice(0, 7))
    }
    return { minDate: min, maxDate: max, months: Array.from(monthSet).sort() }
  }, [records])

  // Selectable employees, derived from the records so a pick always has data. Display
  // names are enriched from the employees prop (get_employees) when identities line up.
  const employeeOptions = useMemo<EmpOption[]>(() => {
    const map = new Map<string, EmpOption>()

    for (const r of records) {
      const idKey = normKey(r.employee_id)
      const nameKey = normKey(r.employee_name)
      const primary = idKey || nameKey
      if (!primary) continue

      let opt = map.get(primary)
      if (!opt) {
        opt = { value: primary, label: (r.employee_name || r.employee_id || 'Sin nombre').trim(), keys: new Set() }
        map.set(primary, opt)
      }
      if (idKey) opt.keys.add(idKey)
      if (nameKey) opt.keys.add(nameKey)
      // Prefer a human-readable name (with a space) as the label.
      if (r.employee_name && (!opt.label || (!/\s/.test(opt.label) && /\s/.test(r.employee_name)))) {
        opt.label = r.employee_name.trim()
      }
    }

    for (const emp of employees || []) {
      const empKeys = [normKey(emp.id), normKey(emp.name)].filter(Boolean)
      if (empKeys.length === 0) continue
      for (const opt of map.values()) {
        if (empKeys.some((k) => opt.keys.has(k))) {
          empKeys.forEach((k) => opt.keys.add(k))
          if (emp.name && /\s/.test(emp.name)) opt.label = emp.name
        }
      }
    }

    let list = Array.from(map.values())

    // Fallback: no records loaded yet -> at least offer the prop list.
    if (list.length === 0 && employees?.length) {
      list = employees
        .filter((e) => e && (e.id || e.name))
        .map((e) => {
          const keys = new Set<string>()
          const idKey = normKey(e.id)
          const nameKey = normKey(e.name)
          if (idKey) keys.add(idKey)
          if (nameKey) keys.add(nameKey)
          return { value: idKey || nameKey, label: e.name || e.id, keys }
        })
    }

    return list.sort((a, b) => a.label.localeCompare(b.label, 'es'))
  }, [records, employees])

  if (!isOpen) return null

  const effFrom = dateFrom || minDate
  const effTo = dateTo || maxDate
  const isAllRange = (dateFrom || minDate) === minDate && (dateTo || maxDate) === maxDate

  const inRange = (d?: string): boolean => {
    if (!d) return true
    if (effFrom && d < effFrom) return false
    if (effTo && d > effTo) return false
    return true
  }

  const periodDays = (() => {
    if (!effFrom || !effTo) return 0
    const a = Date.parse(`${effFrom}T00:00:00Z`)
    const b = Date.parse(`${effTo}T00:00:00Z`)
    if (isNaN(a) || isNaN(b) || b < a) return 0
    return Math.floor((b - a) / 86_400_000) + 1
  })()

  const getEmpStats = (value: string): EmpStats | null => {
    if (!value) return null
    const opt = employeeOptions.find((o) => o.value === value)
    if (!opt) return null

    const empRecords = records.filter((r) => {
      if (!inRange(r.date)) return false
      return opt.keys.has(normKey(r.employee_id)) || opt.keys.has(normKey(r.employee_name))
    })

    const totalHours = empRecords.reduce((sum, r) => sum + (r.duration_decimal || 0), 0)
    const billableHours = empRecords
      .filter(
        (r) =>
          r.is_billable === 1 ||
          r.is_billable === true ||
          (r.is_billable === undefined && r.work_type === 'project')
      )
      .reduce((sum, r) => sum + (r.duration_decimal || 0), 0)

    const byType = { project: 0, internal: 0, meeting: 0, other: 0 }
    empRecords.forEach((r) => {
      const h = r.duration_decimal || 0
      if (r.work_type === 'project') byType.project += h
      else if (r.work_type === 'internal') byType.internal += h
      else if (r.work_type === 'meeting') byType.meeting += h
      else byType.other += h // training / other / anything else
    })

    const uniqueDates = new Set(empRecords.map((r) => r.date)).size
    const avgDaily = uniqueDates > 0 ? (totalHours / uniqueDates).toFixed(1) : '0.0'
    const billableRate = totalHours > 0 ? ((billableHours / totalHours) * 100).toFixed(0) : '0'

    const clientMap: Record<string, number> = {}
    empRecords.forEach((r) => {
      if (r.client_name) clientMap[r.client_name] = (clientMap[r.client_name] || 0) + (r.duration_decimal || 0)
    })
    const sortedClients = Object.entries(clientMap).sort((a, b) => b[1] - a[1])
    const topClient = sortedClients[0]

    return {
      name: opt.label,
      recordsCount: empRecords.length,
      totalHours,
      billableRate,
      avgDaily,
      uniqueDates,
      byType,
      topClient: topClient ? `${topClient[0]} (${topClient[1].toFixed(1)}h)` : 'N/A',
      clientBreakdown: sortedClients.slice(0, 5),
    }
  }

  const stats1 = getEmpStats(empId1)
  const stats2 = getEmpStats(empId2)

  const chipBase = 'text-xs font-semibold px-3 py-1.5 rounded-full border transition whitespace-nowrap'
  const chipActive = 'bg-mooving-700 text-white border-mooving-700'
  const chipIdle = 'bg-white text-mooving-700 border-mooving-200 hover:bg-mooving-50'

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        <div className="px-6 py-4 bg-mooving-700 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-mooving-accent" />
            <h3 className="text-lg font-bold">Comparativa Side-by-Side de Empleados</h3>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Period selector */}
          <div className="bg-mooving-50 p-4 rounded-xl border border-mooving-100 space-y-3">
            <div className="flex items-center gap-2 text-mooving-800">
              <Calendar className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wide">Período a comparar</span>
              <span className="ml-auto text-xs font-semibold text-mooving-700 bg-white px-3 py-1 rounded-full border border-mooving-200">
                {fmtDate(effFrom)} → {fmtDate(effTo)}
                {periodDays > 0 && <span className="text-slate-400 font-normal"> · {periodDays} días</span>}
              </span>
            </div>

            {months.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDateFrom('')
                    setDateTo('')
                  }}
                  className={`${chipBase} ${isAllRange ? chipActive : chipIdle}`}
                >
                  Todo el rango
                </button>
                {months.map((m) => {
                  const active = dateFrom === `${m}-01` && dateTo === `${m}-31`
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setDateFrom(`${m}-01`)
                        setDateTo(`${m}-31`)
                      }}
                      className={`${chipBase} ${active ? chipActive : chipIdle}`}
                    >
                      {fmtMonth(m)}
                    </button>
                  )
                })}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Desde</label>
                <input
                  type="date"
                  value={dateFrom || minDate}
                  min={minDate || undefined}
                  max={maxDate || undefined}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 font-semibold focus:ring-2 focus:ring-mooving-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Hasta</label>
                <input
                  type="date"
                  value={dateTo || maxDate}
                  min={minDate || undefined}
                  max={maxDate || undefined}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 font-semibold focus:ring-2 focus:ring-mooving-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Employee selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Empleado A</label>
              <select
                value={empId1}
                onChange={(e) => setEmpId1(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 font-semibold focus:ring-2 focus:ring-mooving-500 outline-none"
              >
                <option value="">-- Seleccionar Empleado A --</option>
                {employeeOptions.map((e) => (
                  <option key={e.value} value={e.value}>
                    {e.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Empleado B</label>
              <select
                value={empId2}
                onChange={(e) => setEmpId2(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 font-semibold focus:ring-2 focus:ring-orange-500 outline-none"
              >
                <option value="">-- Seleccionar Empleado B --</option>
                {employeeOptions.map((e) => (
                  <option key={e.value} value={e.value}>
                    {e.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Comparison cards */}
          {stats1 && stats2 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <EmployeeCard stats={stats1} theme={THEME_A} isWinner={stats1.totalHours >= stats2.totalHours} />
              <EmployeeCard stats={stats2} theme={THEME_B} isWinner={stats2.totalHours >= stats1.totalHours} />
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 font-medium text-sm border-2 border-dashed border-slate-200 rounded-xl">
              Selecciona ambos empleados para comparar sus métricas en el período elegido.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
