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

export const TimeBagSection: React.FC<TimeBagSectionProps> = ({ records }) => {
  // Filter records by work type
  const internalTasks = records.filter(r => r.work_type === 'internal')
  const meetings = records.filter(r => r.work_type === 'meeting')

  // Calculate totals
  const internalHours = internalTasks.reduce((sum, r) => sum + r.duration_hours, 0)
  const meetingHours = meetings.reduce((sum, r) => sum + r.duration_hours, 0)
  const totalBagHours = internalHours + meetingHours

  // Only show section if there's data
  if (internalTasks.length === 0 && meetings.length === 0) {
    return null
  }

  return (
    <div className="mt-12">
      {/* Section Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2" style={{ color: MOOVING_COLORS.primary }}>
          🎒 Bolsa de Horas
        </h2>
        <p className="text-gray-600">
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
              <p className="text-gray-500 text-sm font-medium">Total Bolsa</p>
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
            Proporción de Bolsa de Horas
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
