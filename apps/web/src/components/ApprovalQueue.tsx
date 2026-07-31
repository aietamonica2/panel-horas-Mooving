import React, { useEffect, useState } from 'react'
import { api } from '../api'
import {
  ClipboardCheck,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Inbox,
} from 'lucide-react'

/**
 * ApprovalQueue (FEAT-02)
 * ------------------------------------------------------------------
 * Vista de administración donde un admin revisa las horas cargadas que
 * están PENDIENTES de aprobación y las aprueba o rechaza.
 *
 * Backend (tarea en paralelo) expone via MCP:
 *   - get_pending_time_records  -> { success, result: { records: [...] } }
 *   - approve_time_record       -> { success }
 *   - reject_time_record        -> { success }  (recibe un motivo)
 *
 * Se invocan con el helper existente `api.callMcpTool(toolName, params)`.
 * Como el contrato exacto del backend aún no está fijo, la lectura de la
 * lista y los nombres de parámetros se resuelven de forma defensiva
 * (aliases) para que la integración funcione en cuanto el backend aterrice.
 */

// Etiquetas de tipo de trabajo, coherentes con MyTime.tsx
const WORK_TYPE_LABELS: Record<string, string> = {
  project: '📁 Proyecto',
  meeting: '💬 Reunión',
  internal: '⚙️ Interno',
  training: '🎓 Capacitación',
  other: '📌 Otro',
}

// El backend todavía no fija el nombre del id; lo resolvemos de forma tolerante.
const getRecordId = (r: any): string =>
  String(r?.id ?? r?.record_id ?? r?._id ?? '')

// La tool puede devolver la lista bajo distintas claves; normalizamos.
const extractRecords = (result: any): any[] => {
  if (Array.isArray(result)) return result
  return (
    result?.records ||
    result?.pending_records ||
    result?.pending ||
    result?.time_records ||
    []
  )
}

export const ApprovalQueue: React.FC = () => {
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')

  // Id del registro sobre el que se está ejecutando una acción (aprobar/rechazar)
  const [actingId, setActingId] = useState<string | null>(null)
  // Id del registro cuyo input de motivo de rechazo está abierto (input inline)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const fetchPending = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.callMcpTool('get_pending_time_records', {})
      const data = await res.json()
      if (data.success) {
        setRecords(extractRecords(data.result))
      } else {
        setError(data.error || 'No se pudieron cargar las horas pendientes.')
      }
    } catch (e) {
      console.error('Error fetching pending records:', e)
      setError('Error de red al cargar las horas pendientes.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPending()
  }, [])

  const flash = (msg: string) => {
    setFeedback(msg)
    setTimeout(() => setFeedback(''), 3000)
  }

  const handleApprove = async (r: any) => {
    const id = getRecordId(r)
    setActingId(id)
    setError('')
    try {
      const res = await api.callMcpTool('approve_time_record', { record_id: id, id })
      const data = await res.json()
      if (data.success) {
        flash('✅ Registro aprobado.')
        await fetchPending()
      } else {
        setError(data.error || 'No se pudo aprobar el registro.')
      }
    } catch (e) {
      console.error('Error approving record:', e)
      setError('Error de red al aprobar el registro.')
    } finally {
      setActingId(null)
    }
  }

  const openReject = (r: any) => {
    setError('')
    setRejectingId(getRecordId(r))
    setRejectReason('')
  }

  const cancelReject = () => {
    setRejectingId(null)
    setRejectReason('')
  }

  const confirmReject = async (r: any) => {
    const id = getRecordId(r)
    const reason = rejectReason.trim()
    setActingId(id)
    setError('')
    try {
      const res = await api.callMcpTool('reject_time_record', {
        record_id: id,
        id,
        reason,
        rejection_reason: reason,
      })
      const data = await res.json()
      if (data.success) {
        flash('🚫 Registro rechazado.')
        cancelReject()
        await fetchPending()
      } else {
        setError(data.error || 'No se pudo rechazar el registro.')
      }
    } catch (e) {
      console.error('Error rejecting record:', e)
      setError('Error de red al rechazar el registro.')
    } finally {
      setActingId(null)
    }
  }

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-900 overflow-auto p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Cabecera */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-mooving/10 text-mooving dark:bg-mooving/20 dark:text-mooving-300 flex items-center justify-center">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                Aprobaciones
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Revisá las horas pendientes y aprobá o rechazá cada registro.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!loading && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-mooving-accent/10 text-mooving-accent dark:bg-mooving-accent/20">
                {records.length} pendiente{records.length === 1 ? '' : 's'}
              </span>
            )}
            <button
              onClick={fetchPending}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          </div>
        </div>

        {/* Feedback de acción */}
        {feedback && (
          <div className="animate-fade-in-down rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/30 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">
            {feedback}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="animate-fade-in-down rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/30 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
            ❌ {error}
          </div>
        )}

        {/* Contenido */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mb-3 text-mooving" />
              <p className="text-sm">Cargando horas pendientes...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-500 flex items-center justify-center mb-4">
                <Inbox className="w-7 h-7" />
              </div>
              <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">
                No hay horas pendientes de aprobación 🎉
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Todo al día. Cuando alguien cargue horas, aparecerán acá.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-4 font-semibold">Fecha</th>
                    <th className="py-3 px-4 font-semibold">Empleado</th>
                    <th className="py-3 px-4 font-semibold">Cliente / Proyecto</th>
                    <th className="py-3 px-4 font-semibold text-right">Horas</th>
                    <th className="py-3 px-4 font-semibold">Tipo</th>
                    <th className="py-3 px-4 font-semibold hidden lg:table-cell">Descripción</th>
                    <th className="py-3 px-4 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                  {records.map((r, i) => {
                    const id = getRecordId(r)
                    const isActing = actingId === id
                    const isRejecting = rejectingId === id
                    const wt = r.work_type || 'project'
                    return (
                      <React.Fragment key={id || i}>
                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                          <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-900 dark:text-slate-100">
                            {r.date || '-'}
                          </td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-200">
                            {r.employee_name || '-'}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-800 dark:text-slate-100">
                              {r.client_name || '-'}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {r.project_name || '-'}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-mooving dark:text-mooving-300 whitespace-nowrap">
                            {Number(r.duration_decimal ?? r.duration_hours ?? 0).toFixed(2)}h
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                            {WORK_TYPE_LABELS[wt] || wt}
                          </td>
                          <td
                            className="py-3 px-4 text-slate-500 dark:text-slate-400 max-w-xs truncate hidden lg:table-cell"
                            title={r.description || ''}
                          >
                            {r.description || '-'}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleApprove(r)}
                                disabled={isActing || isRejecting}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isActing && !isRejecting ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="w-4 h-4" />
                                )}
                                Aprobar
                              </button>
                              <button
                                onClick={() => openReject(r)}
                                disabled={isActing || isRejecting}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <XCircle className="w-4 h-4" />
                                Rechazar
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Fila inline para capturar el motivo de rechazo */}
                        {isRejecting && (
                          <tr className="bg-red-50/60 dark:bg-red-900/20">
                            <td colSpan={7} className="px-4 py-4">
                              <div className="animate-fade-in-down flex flex-col sm:flex-row sm:items-end gap-3">
                                <div className="flex-1">
                                  <label
                                    htmlFor={`reject-reason-${id}`}
                                    className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1"
                                  >
                                    Motivo del rechazo
                                  </label>
                                  <input
                                    id={`reject-reason-${id}`}
                                    type="text"
                                    autoFocus
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && rejectReason.trim()) confirmReject(r)
                                      if (e.key === 'Escape') cancelReject()
                                    }}
                                    placeholder="Ej: Cliente/proyecto incorrecto, horas duplicadas..."
                                    className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                  />
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    onClick={() => confirmReject(r)}
                                    disabled={isActing || !rejectReason.trim()}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {isActing ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <XCircle className="w-4 h-4" />
                                    )}
                                    Confirmar rechazo
                                  </button>
                                  <button
                                    onClick={cancelReject}
                                    disabled={isActing}
                                    className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition disabled:opacity-50"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ApprovalQueue
