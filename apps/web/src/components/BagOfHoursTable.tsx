/**
 * Bag of Hours Table Component
 * Shows Internal Tasks and Meetings distribution by employee and month
 */

import React from 'react'
import { TimeRecord } from '../types'

interface BagOfHoursTableProps {
  records: TimeRecord[]
  selectedMonth?: string
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

// --- Sub-clasificación de tareas internas ---------------------------------
// Orden de prioridad y de despliegue de las sub-categorías.
const INTERNAL_SUBCATEGORIES = [
  'Ausencias (Vac./Lic.)',
  'Capacitación',
  'Reuniones',
  'Entrevistas',
  'RRHH',
  'Comercial',
  'Investigación',
  'Operaciones',
  'Otras internas',
] as const

const SUBCATEGORY_COLORS: { [k: string]: string } = {
  'Ausencias (Vac./Lic.)': '#ef4444', // rojo
  'Capacitación': '#0ea5e9',          // celeste
  'Reuniones': '#ec4899',             // rosa
  'Entrevistas': '#8b5cf6',           // violeta
  'RRHH': '#f97316',                  // naranja mooving
  'Comercial': '#10b981',             // verde
  'Investigación': '#6366f1',         // índigo
  'Operaciones': '#1a5f7a',           // azul mooving
  'Otras internas': '#64748b',        // gris
}

/** Normaliza texto a minúsculas y sin acentos (case/acento-insensitive). */
function normalizeDesc(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // elimina diacríticos combinantes
}

/** Deriva la sub-categoría de una tarea interna por palabra clave en la descripción. */
function internalSubcategory(record: TimeRecord): string {
  const d = normalizeDesc(record.description)
  if (/vacacion|licencia|franco|ausencia/.test(d)) return 'Ausencias (Vac./Lic.)'
  if (/capacitacion|onboarding|formacion/.test(d)) return 'Capacitación'
  if (/reunion|daily|sync|scrum/.test(d)) return 'Reuniones'
  if (/entrevista/.test(d)) return 'Entrevistas'
  if (/rrhh|recursos humanos/.test(d)) return 'RRHH'
  if (/comercial|venta/.test(d)) return 'Comercial'
  if (/investigacion|research/.test(d)) return 'Investigación'
  if (/operacion/.test(d)) return 'Operaciones'
  return 'Otras internas'
}

/** Agrupa horas y cantidad de registros internos por sub-categoría (orden fijo). */
function summarizeInternalSubcategories(
  internalRecords: TimeRecord[]
): { cat: string; hours: number; count: number }[] {
  const hoursByCat = new Map<string, number>()
  const countByCat = new Map<string, number>()
  internalRecords.forEach(r => {
    const cat = internalSubcategory(r)
    hoursByCat.set(cat, (hoursByCat.get(cat) || 0) + r.duration_decimal)
    countByCat.set(cat, (countByCat.get(cat) || 0) + 1)
  })
  return INTERNAL_SUBCATEGORIES
    .filter(cat => (countByCat.get(cat) || 0) > 0)
    .map(cat => ({ cat, hours: hoursByCat.get(cat) || 0, count: countByCat.get(cat) || 0 }))
}

export const BagOfHoursTable: React.FC<BagOfHoursTableProps> = ({ records, selectedMonth }) => {
  // Filter for internal tasks, meetings, and training (overhead)
  const bagRecords = records.filter(r => r.work_type === 'internal' || r.work_type === 'meeting' || r.work_type === 'training')

  if (bagRecords.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-8 text-center">
        <p className="text-gray-500">No hay tareas internas o reuniones registradas</p>
      </div>
    )
  }

  // Extract unique months from records (YYYY-MM format)
  const uniqueMonths = Array.from(new Set(
    bagRecords.map(r => r.date.substring(0, 7))
  )).sort()

  // Extract unique employees
  const uniqueEmployees = Array.from(new Set(
    bagRecords.map(r => r.employee_name)
  )).sort()

  // Build matrix: employee x month
  const buildMatrix = () => {
    const matrix: { [employee: string]: { [month: string]: number } } = {}

    uniqueEmployees.forEach(emp => {
      matrix[emp] = {}
      uniqueMonths.forEach(month => {
        const hours = bagRecords
          .filter(r => r.employee_name === emp && r.date.substring(0, 7) === month)
          .reduce((sum, r) => sum + r.duration_decimal, 0)
        matrix[emp][month] = hours
      })
    })

    return matrix
  }

  // Separate Internal Tasks and Meetings
  const internalRecords = bagRecords.filter(r => r.work_type === 'internal')
  const meetingRecords = bagRecords.filter(r => r.work_type === 'meeting')

  const buildTypeMatrix = (typeRecords: TimeRecord[]) => {
    const matrix: { [employee: string]: { [month: string]: number } } = {}

    uniqueEmployees.forEach(emp => {
      matrix[emp] = {}
      uniqueMonths.forEach(month => {
        const hours = typeRecords
          .filter(r => r.employee_name === emp && r.date.substring(0, 7) === month)
          .reduce((sum, r) => sum + r.duration_decimal, 0)
        matrix[emp][month] = hours
      })
    })

    return matrix
  }

  const internalMatrix = buildTypeMatrix(internalRecords)
  const meetingMatrix = buildTypeMatrix(meetingRecords)
  const allMatrix = buildMatrix()

  // Desglose de tareas internas por sub-categoría (derivado de la descripción)
  const internalSubcatBreakdown = summarizeInternalSubcategories(internalRecords)
  const internalTotalHours = internalRecords.reduce((sum, r) => sum + r.duration_decimal, 0)

  const monthFormat = (month: string) => {
    const monthNames: { [key: string]: string } = {
      '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
      '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
      '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
    }
    return monthNames[month.substring(5, 7)] || month
  }

  const Table = ({ title, color, matrix }: { title: string; color: string; matrix: { [e: string]: { [m: string]: number } } }) => {
    const totals = { byMonth: {} as { [m: string]: number }, byEmployee: {} as { [e: string]: number } }

    uniqueMonths.forEach(m => {
      totals.byMonth[m] = uniqueEmployees.reduce((sum, e) => sum + (matrix[e]?.[m] || 0), 0)
    })

    uniqueEmployees.forEach(e => {
      totals.byEmployee[e] = uniqueMonths.reduce((sum, m) => sum + (matrix[e]?.[m] || 0), 0)
    })

    const grandTotal = uniqueEmployees.reduce((sum, e) => sum + totals.byEmployee[e], 0)

    return (
      <div className="mb-8">
        <h3 className="text-lg font-bold mb-4" style={{ color }}>
          {title}
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr style={{ background: color, color: 'white' }}>
                <th className="px-4 py-3 text-left font-semibold">Empleado</th>
                {uniqueMonths.map(m => (
                  <th key={m} className="px-3 py-3 text-center font-semibold whitespace-nowrap">
                    {monthFormat(m)}
                  </th>
                ))}
                <th className="px-3 py-3 text-center font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {uniqueEmployees.map(emp => (
                <tr key={emp} className="border-b hover:bg-gray-100 transition">
                  <td className="px-4 py-3 font-medium">{emp}</td>
                  {uniqueMonths.map(m => (
                    <td key={m} className="px-3 py-3 text-center">
                      {matrix[emp]?.[m] > 0 ? `${matrix[emp][m].toFixed(2)}h` : '-'}
                    </td>
                  ))}
                  <td className="px-3 py-3 text-center font-semibold" style={{ color }}>
                    {totals.byEmployee[emp].toFixed(2)}h
                  </td>
                </tr>
              ))}
              <tr style={{ background: `${color}15`, borderTop: `2px solid ${color}` }}>
                <td className="px-4 py-3 font-bold">Total/Mes</td>
                {uniqueMonths.map(m => (
                  <td key={m} className="px-3 py-3 text-center font-bold" style={{ color }}>
                    {totals.byMonth[m].toFixed(2)}h
                  </td>
                ))}
                <td className="px-3 py-3 text-center font-bold text-lg" style={{ color }}>
                  {grandTotal.toFixed(2)}h
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2" style={{ color: MOOVING_COLORS.primary }}>
          ⏰ Distribución de Horas Internas
        </h2>
        <p className="text-gray-600 dark:text-gray-300 text-sm">
          Desglose de horas internas y reuniones por sub-categoría, usuario y mes
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-indigo-50 rounded-lg p-6 border-l-4" style={{ borderColor: MOOVING_COLORS.indigo }}>
          <div className="text-sm text-gray-600 uppercase font-semibold mb-2">⚙️ Tareas Internas</div>
          <div className="text-3xl font-bold" style={{ color: MOOVING_COLORS.indigo }}>
            {internalRecords.reduce((sum, r) => sum + r.duration_decimal, 0).toFixed(2)}h
          </div>
        </div>

        <div className="bg-pink-50 rounded-lg p-6 border-l-4" style={{ borderColor: MOOVING_COLORS.pink }}>
          <div className="text-sm text-gray-600 uppercase font-semibold mb-2">👥 Reuniones de Equipo</div>
          <div className="text-3xl font-bold" style={{ color: MOOVING_COLORS.pink }}>
            {meetingRecords.reduce((sum, r) => sum + r.duration_decimal, 0).toFixed(2)}h
          </div>
        </div>

        <div className="bg-orange-50 rounded-lg p-6 border-l-4" style={{ borderColor: MOOVING_COLORS.secondary }}>
          <div className="text-sm text-gray-600 uppercase font-semibold mb-2">📊 Total Distribución</div>
          <div className="text-3xl font-bold" style={{ color: MOOVING_COLORS.secondary }}>
            {bagRecords.reduce((sum, r) => sum + r.duration_decimal, 0).toFixed(2)}h
          </div>
        </div>
      </div>

      {/* Visual proportion bar */}
      <div className="bg-gray-100 rounded-lg p-6 mb-8">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Proporción Tareas vs Reuniones</h3>
        <div className="flex gap-2 h-10 rounded-full overflow-hidden">
          <div
            className="bg-indigo-500 transition-all"
            style={{
              width: `${(internalRecords.reduce((sum, r) => sum + r.duration_decimal, 0) / bagRecords.reduce((sum, r) => sum + r.duration_decimal, 0) * 100) || 0}%`
            }}
          />
          <div
            className="bg-pink-500 transition-all"
            style={{
              width: `${(meetingRecords.reduce((sum, r) => sum + r.duration_decimal, 0) / bagRecords.reduce((sum, r) => sum + r.duration_decimal, 0) * 100) || 0}%`
            }}
          />
        </div>
        <div className="flex gap-6 mt-3 text-xs">
          <span><span className="inline-block w-3 h-3 bg-indigo-500 rounded mr-1"></span>Tareas Internas</span>
          <span><span className="inline-block w-3 h-3 bg-pink-500 rounded mr-1"></span>Reuniones</span>
        </div>
      </div>

      {/* Desglose de Tareas Internas por Sub-categoría */}
      {internalSubcatBreakdown.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
            Desglose de Tareas Internas por Sub-categoría
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {internalSubcatBreakdown.map(({ cat, hours, count }) => {
              const color = SUBCATEGORY_COLORS[cat] || MOOVING_COLORS.indigo
              const pct = internalTotalHours > 0 ? (hours / internalTotalHours) * 100 : 0
              return (
                <div
                  key={cat}
                  className="rounded-lg p-3 bg-gray-50 dark:bg-slate-700/40"
                  style={{ borderLeft: `4px solid ${color}` }}
                >
                  <div className="text-xs font-medium text-gray-600 dark:text-gray-300 leading-tight min-h-[2.5em]">
                    {cat}
                  </div>
                  <div className="text-xl font-bold mt-1" style={{ color }}>
                    {hours.toFixed(2)}h
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    {pct.toFixed(1)}% · {count} reg.
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tables */}
      <Table
        title="⚙️ TAREAS INTERNAS"
        color={MOOVING_COLORS.indigo}
        matrix={internalMatrix}
      />

      <Table
        title="👥 REUNIONES DE EQUIPO"
        color={MOOVING_COLORS.pink}
        matrix={meetingMatrix}
      />

      {/* Combined Table */}
      <Table
        title="📊 TOTAL DISTRIBUCIÓN DE HORAS"
        color={MOOVING_COLORS.secondary}
        matrix={allMatrix}
      />
    </div>
  )
}
