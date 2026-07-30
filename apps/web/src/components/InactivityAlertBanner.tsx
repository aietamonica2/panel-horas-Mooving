/**
 * Inactivity Alert Banner Component (Epic 1 - Visibilidad del Equipo)
 * Detects active employees with 0 logged hours in current date range and alerts manager
 */

import React from 'react'
import { TimeRecord } from '../types'
import { AlertCircle, UserX, Send } from 'lucide-react'

interface InactivityAlertBannerProps {
  records: TimeRecord[]
  allEmployees?: { id: string; name: string; is_active?: number }[]
  onSendReminder?: (employeeName: string) => void
}

export const InactivityAlertBanner: React.FC<InactivityAlertBannerProps> = ({
  records,
  allEmployees = [],
  onSendReminder
}) => {
  if (records.length === 0 && allEmployees.length === 0) return null

  // Active employees in organization
  const activeEmployeeIds = new Set(allEmployees.filter(e => e.is_active !== 0).map(e => e.id))
  
  // Employees who logged at least 1 hour in current records view
  const loggedEmployeeIds = new Set(records.map(r => r.employee_id))

  // Inactive employees = active employees with 0 records in current view
  const inactiveEmployees = allEmployees.filter(e => e.is_active !== 0 && !loggedEmployeeIds.has(e.id))

  if (inactiveEmployees.length === 0) return null

  return (
    <div className="bg-gradient-to-r from-red-50 to-amber-50 border-l-4 border-red-500 rounded-xl shadow-sm p-4 mb-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-lg text-red-600">
            <UserX className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-red-900 flex items-center gap-2">
              <span>⚠️ Alerta de Inactividad de Carga</span>
              <span className="px-2 py-0.5 bg-red-200 text-red-800 rounded-full text-xs font-semibold">
                {inactiveEmployees.length} {inactiveEmployees.length === 1 ? 'empleado' : 'empleados'}
              </span>
            </h3>
            <p className="text-xs text-red-700 mt-0.5">
              Sin registros cargados en el período seleccionado.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {inactiveEmployees.slice(0, 5).map(emp => (
            <div key={emp.id} className="flex items-center gap-1.5 bg-white border border-red-200 px-3 py-1 rounded-lg text-xs font-semibold text-slate-800 shadow-2xs">
              <span>{emp.name}</span>
              {onSendReminder && (
                <button
                  onClick={() => onSendReminder(emp.name)}
                  className="text-indigo-600 hover:text-indigo-800 p-0.5 rounded transition"
                  title="Enviar recordatorio"
                >
                  <Send className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          {inactiveEmployees.length > 5 && (
            <span className="text-xs font-bold text-red-700">+{inactiveEmployees.length - 5} más</span>
          )}
        </div>
      </div>
    </div>
  )
}
