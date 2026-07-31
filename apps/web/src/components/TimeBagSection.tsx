/**
 * Time Bag Section Component
 * Displays internal tasks and team meetings hours
 */

import React from 'react'
import { TimeRecord } from '../types'
import { InternalTasksTable } from './InternalTasksTable'
import { MeetingsTable } from './MeetingsTable'

interface TimeBagSectionProps {
  records: TimeRecord[]
}

const MOOVING_COLORS = {
  primary: '#1a5f7a',
  secondary: '#f97316',
  success: '#10b981',
  info: '#0ea5e9',
  danger: '#ef4444',
  lightBg: '#f8fafc',
  border: '#e2e8f0',
  internalColor: '#6366f1',  // Indigo for internal tasks
  meetingColor: '#ec4899',   // Pink for meetings
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

export const TimeBagSection: React.FC<TimeBagSectionProps> = ({ records }) => {
  // Filter records by work type
  const internalTasks = records.filter(r => r.work_type === 'internal')
  const meetings = records.filter(r => r.work_type === 'meeting')

  // Calculate totals
  const internalHours = internalTasks.reduce((sum, r) => sum + r.duration_decimal, 0)
  const meetingHours = meetings.reduce((sum, r) => sum + r.duration_decimal, 0)
  const totalBagHours = internalHours + meetingHours

  // Desglose de tareas internas por sub-categoría (derivado de la descripción)
  const internalBreakdown = summarizeInternalSubcategories(internalTasks)

  // Only show section if there's data
  if (internalTasks.length === 0 && meetings.length === 0) {
    return null
  }

  return (
    <div className="mt-12">
      {/* Section Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2" style={{ color: MOOVING_COLORS.primary }}>
          🎒 Distribución de Horas Internas
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Tareas internas y reuniones de equipo de tu organización
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Internal Tasks Card */}
        <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition" style={{ borderLeft: `4px solid ${MOOVING_COLORS.internalColor}` }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Tareas Internas</p>
              <p className="text-4xl font-bold mt-2" style={{ color: MOOVING_COLORS.internalColor }}>
                {internalHours.toFixed(1)}h
              </p>
            </div>
            <div className="text-5xl">⚙️</div>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            {internalTasks.length} registros
          </p>
        </div>

        {/* Meetings Card */}
        <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition" style={{ borderLeft: `4px solid ${MOOVING_COLORS.meetingColor}` }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Reuniones de Equipo</p>
              <p className="text-4xl font-bold mt-2" style={{ color: MOOVING_COLORS.meetingColor }}>
                {meetingHours.toFixed(1)}h
              </p>
            </div>
            <div className="text-5xl">👥</div>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            {meetings.length} registros
          </p>
        </div>

        {/* Total Bag Hours Card */}
        <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition" style={{ borderLeft: `4px solid ${MOOVING_COLORS.secondary}` }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Total Distribución</p>
              <p className="text-4xl font-bold mt-2" style={{ color: MOOVING_COLORS.secondary }}>
                {totalBagHours.toFixed(1)}h
              </p>
            </div>
            <div className="text-5xl">📊</div>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            {internalTasks.length + meetings.length} registros
          </p>
        </div>
      </div>

      {/* Desglose de Tareas Internas por Sub-categoría */}
      {internalBreakdown.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 mb-8">
          <h3 className="text-lg font-semibold mb-1" style={{ color: MOOVING_COLORS.primary }}>
            🗂️ Desglose de Tareas Internas por Sub-categoría
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Clasificación automática de {internalTasks.length} registros internos según su descripción
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {internalBreakdown.map(({ cat, hours, count }) => {
              const color = SUBCATEGORY_COLORS[cat] || MOOVING_COLORS.internalColor
              const pct = internalHours > 0 ? (hours / internalHours) * 100 : 0
              return (
                <div
                  key={cat}
                  className="rounded-lg p-4 bg-gray-50 dark:bg-slate-700/40"
                  style={{ borderLeft: `4px solid ${color}` }}
                >
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 leading-tight min-h-[2.5em]">
                    {cat}
                  </p>
                  <p className="text-2xl font-bold mt-1" style={{ color }}>
                    {hours.toFixed(1)}h
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-400 mt-1">
                    {pct.toFixed(1)}% · {count} reg.
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Internal Tasks Table */}
      {internalTasks.length > 0 && (
        <div className="mb-8">
          <InternalTasksTable records={internalTasks} />
        </div>
      )}

      {/* Meetings Table */}
      {meetings.length > 0 && (
        <div className="mb-8">
          <MeetingsTable records={meetings} />
        </div>
      )}

      {/* Distribution Bar */}
      {totalBagHours > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: MOOVING_COLORS.primary }}>
            Proporción de Horas Internas
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex-1 flex gap-2 bg-gray-200 rounded-full h-8 overflow-hidden">
              {/* Internal Tasks Bar */}
              <div
                style={{
                  width: `${(internalHours / totalBagHours) * 100}%`,
                  backgroundColor: MOOVING_COLORS.internalColor,
                  height: '100%',
                  transition: 'width 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  overflow: 'hidden',
                }}
              >
                {(internalHours / totalBagHours) * 100 > 15 && '⚙️'}
              </div>
              {/* Meetings Bar */}
              <div
                style={{
                  width: `${(meetingHours / totalBagHours) * 100}%`,
                  backgroundColor: MOOVING_COLORS.meetingColor,
                  height: '100%',
                  transition: 'width 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  overflow: 'hidden',
                }}
              >
                {(meetingHours / totalBagHours) * 100 > 15 && '👥'}
              </div>
            </div>
            <div className="w-40 text-right">
              <p className="text-sm font-medium text-gray-700">
                ⚙️ {((internalHours / totalBagHours) * 100).toFixed(1)}% | 👥 {((meetingHours / totalBagHours) * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
