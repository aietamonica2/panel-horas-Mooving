/**
 * Inactivity Alert Banner Component (Epic 1 - Visibilidad del Equipo)
 * Detects active employees with 0 logged hours in current date range and alerts manager
 */

import React, { useState } from 'react'
import { api } from '../api'
import { TimeRecord } from '../types'
import { AlertCircle, UserX, Send, Eye, X, Loader2, Mail, CalendarClock } from 'lucide-react'

interface InactivityAlertBannerProps {
  records: TimeRecord[]
  allEmployees?: { id: string; name: string; is_active?: number }[]
  // NUEVO-3: propaga los identificadores REALES de los inactivos a alertar
  // (un empleado puntual o la lista completa), nunca una lista fija.
  onSendReminder?: (recipientIds: string[]) => void
}

export const InactivityAlertBanner: React.FC<InactivityAlertBannerProps> = ({
  records,
  allEmployees = [],
  onSendReminder
}) => {
  // --- Vista previa de la alerta (Preview): trae inactivos + email SIN enviar ---
  // Umbral en días; default 3 = mismo default que send_inactivity_alerts en el backend.
  const [days, setDays] = useState(3)
  const [showPreview, setShowPreview] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const [previewData, setPreviewData] = useState<any>(null)

  const handlePreview = async (targetDays: number = days) => {
    setShowPreview(true)
    setPreviewLoading(true)
    setPreviewError('')
    try {
      const res = await api.callMcpTool('get_inactivity_preview', { days: targetDays })
      const json = await res.json()
      if (!res.ok || json.success === false) {
        throw new Error(json.error || 'No se pudo generar la vista previa.')
      }
      setPreviewData(json.result ?? json)
    } catch (err: any) {
      console.error(err)
      setPreviewError(err.message || 'Error al generar la vista previa de la alerta.')
    } finally {
      setPreviewLoading(false)
    }
  }

  // Normalización defensiva: el shape del backend puede variar según el origen.
  const preview = previewData || {}
  const previewInactive: any[] = preview.inactive_employees || preview.inactives || preview.employees || []
  const previewEmail = preview.email || preview.draft || preview.preview || {}
  const previewSubject = previewEmail.subject || preview.subject || preview.email_subject || ''
  const previewBody = previewEmail.body || preview.body || preview.email_body || ''
  const previewIds: string[] = previewInactive.map(e => e.employee_id || e.id).filter(Boolean)

  const daysSince = (dateStr?: string | null): number | null => {
    if (!dateStr) return null
    const t = new Date(`${dateStr}T00:00:00Z`).getTime()
    if (isNaN(t)) return null
    return Math.max(0, Math.floor((Date.now() - t) / 86400000))
  }

  // Reutiliza el MISMO camino de envío real existente (onSendReminder -> send_inactivity_alerts).
  const handleSendFromPreview = () => {
    if (!onSendReminder || previewIds.length === 0) return
    onSendReminder(previewIds)
    setShowPreview(false)
  }

  // Employees who logged at least 1 hour in current records view
  const loggedEmployeeIds = new Set(records.map(r => r.employee_id))

  // Inactive employees = active employees with 0 records in current view
  const inactiveEmployees = allEmployees.filter(e => e.is_active !== 0 && !loggedEmployeeIds.has(e.id))

  if (records.length === 0 && allEmployees.length === 0) return null
  if (inactiveEmployees.length === 0) return null

  return (
    <>
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
          <button
            onClick={() => handlePreview()}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-white shadow-sm transition hover:opacity-90"
            style={{ backgroundColor: '#1a5f7a' }}
            title="Revisar la lista y el email que se enviaría, sin enviar nada"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Ver qué se enviará</span>
          </button>
          {inactiveEmployees.slice(0, 5).map(emp => (
            <div key={emp.id} className="flex items-center gap-1.5 bg-white border border-red-200 px-3 py-1 rounded-lg text-xs font-semibold text-slate-800 shadow-sm">
              <span>{emp.name}</span>
              {onSendReminder && (
                <button
                  onClick={() => onSendReminder([emp.id])}
                  className="text-indigo-600 hover:text-indigo-800 p-0.5 rounded transition"
                  title={`Enviar recordatorio a ${emp.name}`}
                >
                  <Send className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          {inactiveEmployees.length > 5 && (
            <span className="text-xs font-bold text-red-700">+{inactiveEmployees.length - 5} más</span>
          )}
          {onSendReminder && inactiveEmployees.length > 1 && (
            <button
              onClick={() => onSendReminder(inactiveEmployees.map(e => e.id))}
              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-xs font-semibold shadow-sm transition"
              title="Enviar recordatorio a todos los inactivos"
            >
              <Send className="w-3 h-3" />
              <span>Alertar a todos</span>
            </button>
          )}
        </div>
      </div>
    </div>

    {showPreview && (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700">
          {/* Header */}
          <div className="px-6 py-4 flex justify-between items-center text-white" style={{ background: 'linear-gradient(90deg, #1a5f7a, #114257)' }}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/15 rounded-lg">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold">Vista previa: Alerta de inactividad</h2>
                <p className="text-xs text-white/80 mt-0.5">Esto es lo que se enviaría. No se envía nada hasta que confirmes.</p>
              </div>
            </div>
            <button
              onClick={() => setShowPreview(false)}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Controls: umbral de días */}
          <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
              <CalendarClock className="w-4 h-4" style={{ color: '#1a5f7a' }} />
              <span>Umbral de inactividad</span>
              <input
                type="number"
                min="1"
                value={days}
                onChange={e => setDays(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded-md text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1a5f7a]"
              />
              <span>días</span>
            </label>
            <button
              onClick={() => handlePreview()}
              disabled={previewLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm transition disabled:opacity-50 hover:opacity-90"
              style={{ backgroundColor: '#f97316' }}
            >
              {previewLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
              Actualizar vista previa
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {previewLoading && (
              <div className="py-12 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mb-3" style={{ color: '#1a5f7a' }} />
                <p className="text-sm font-medium">Generando vista previa...</p>
              </div>
            )}

            {!previewLoading && previewError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                {previewError}
              </div>
            )}

            {!previewLoading && !previewError && (
              <>
                {/* Empleados inactivos */}
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2">
                    <UserX className="w-4 h-4 text-red-500" />
                    Empleados inactivos
                    <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
                      {previewInactive.length}
                    </span>
                  </h3>
                  {previewInactive.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                      No se detectaron empleados inactivos en los últimos {preview.days_threshold ?? days} días.
                    </p>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 text-xs border-b border-slate-200 dark:border-slate-700">
                            <th className="py-2 px-3 font-medium">Nombre</th>
                            <th className="py-2 px-3 font-medium">Email</th>
                            <th className="py-2 px-3 font-medium">Días inactivo</th>
                            <th className="py-2 px-3 font-medium">Última carga</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                          {previewInactive.map((e, idx) => {
                            const last = e.last_record_date || e.last_date || e.last_log || e.last_load || null
                            const di = e.days_inactive ?? e.inactive_days ?? daysSince(last)
                            return (
                              <tr key={e.employee_id || e.id || idx} className="text-slate-700 dark:text-slate-200">
                                <td className="py-2 px-3 font-medium">{e.name || e.employee_name || '—'}</td>
                                <td className="py-2 px-3 font-mono text-xs text-slate-500 dark:text-slate-400">{e.email || '—'}</td>
                                <td className="py-2 px-3">
                                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                                    {di != null ? `${di} días` : 'Sin registros'}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-slate-500 dark:text-slate-400">{last || 'Nunca cargó'}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Email que se enviaría */}
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2">
                    <Mail className="w-4 h-4" style={{ color: '#1a5f7a' }} />
                    Email que se enviaría
                  </h3>
                  {(previewSubject || previewBody) ? (
                    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                      <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700 text-xs">
                        <span className="text-slate-400">Asunto:</span>{' '}
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{previewSubject || '(sin asunto)'}</span>
                      </div>
                      <pre className="p-4 text-xs font-mono text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-words bg-white dark:bg-slate-800">{previewBody || '(sin cuerpo)'}</pre>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                      El backend no devolvió el contenido del email para esta vista previa.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-700 flex flex-wrap justify-end items-center gap-3">
            <button
              onClick={() => setShowPreview(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            >
              Cerrar
            </button>
            {onSendReminder && previewIds.length > 0 && (
              <button
                onClick={handleSendFromPreview}
                disabled={previewLoading}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white rounded-lg shadow-sm transition disabled:opacity-50 hover:opacity-90"
                style={{ backgroundColor: '#f97316' }}
                title="Envía la alerta real a los inactivos listados (usa el envío existente)"
              >
                <Send className="w-4 h-4" />
                Enviar a estos {previewIds.length}
              </button>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  )
}
