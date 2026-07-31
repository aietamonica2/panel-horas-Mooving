import React, { useEffect, useState } from 'react'
import { api } from '../api'
import { ApprovalQueue } from './ApprovalQueue'
import {
  Briefcase,
  Building2,
  Loader2,
  RefreshCw,
  Inbox,
} from 'lucide-react'

/**
 * CoordinatorView (FEAT-01)
 * ------------------------------------------------------------------
 * Vista "Mi Cartera" para el rol `coordinator`.
 *
 * Al montar llama a la tool MCP `get_coordinator_overview` (que el backend
 * filtra por la cartera del coordinador logueado) y muestra una tarjeta por
 * cada uno de SUS clientes: nombre, horas totales, registros y pendientes de
 * aprobación. Debajo embebe la cola de aprobación reutilizando <ApprovalQueue/>,
 * que ya trae únicamente los pendientes de su cartera porque el backend la
 * acota por rol (get_pending_time_records).
 *
 * Como el contrato exacto del backend todavía no está fijo, la lectura del
 * overview se resuelve de forma tolerante (aliases de claves), igual que en
 * ApprovalQueue, para que la integración funcione en cuanto el backend aterrice.
 */

// Coerción numérica segura (el backend puede devolver number o string).
const num = (v: any): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

// La tool puede devolver la lista de clientes bajo distintas claves; normalizamos.
const extractClients = (result: any): any[] => {
  if (Array.isArray(result)) return result
  return (
    result?.clients ||
    result?.portfolio ||
    result?.cartera ||
    result?.my_clients ||
    result?.clientes ||
    []
  )
}

// Accesores tolerantes por cliente (nombre / horas / registros / pendientes).
const clientName = (c: any): string =>
  String(c?.client_name ?? c?.name ?? c?.cliente ?? c?.client ?? '—')
const clientHours = (c: any): number =>
  num(c?.total_hours ?? c?.hours ?? c?.total_decimal ?? c?.duration_decimal ?? c?.total_hours_decimal)
const clientRecords = (c: any): number =>
  num(c?.records ?? c?.record_count ?? c?.total_records ?? c?.records_count ?? c?.count)
const clientPending = (c: any): number =>
  num(c?.pending ?? c?.pending_count ?? c?.pending_approvals ?? c?.pending_records ?? c?.pending_approval_count)
const clientKey = (c: any, i: number): string =>
  String(c?.id ?? c?.client_id ?? c?.name ?? c?.client_name ?? i)

export const CoordinatorView: React.FC = () => {
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchOverview = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.callMcpTool('get_coordinator_overview', {})
      const data = await res.json()
      if (data.success) {
        setClients(extractClients(data.result))
      } else {
        setError(data.error || 'No se pudo cargar el resumen de tu cartera.')
      }
    } catch (e) {
      console.error('Error fetching coordinator overview:', e)
      setError('Error de red al cargar tu cartera.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOverview()
  }, [])

  // Totales de la cartera (para las insignias del encabezado).
  const totalPending = clients.reduce((acc, c) => acc + clientPending(c), 0)

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-900 overflow-auto">
      {/* Sección: tarjetas de la cartera */}
      <div className="max-w-6xl mx-auto p-8 space-y-6">
        {/* Cabecera */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-mooving/10 text-mooving dark:bg-mooving/20 dark:text-mooving-300 flex items-center justify-center">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                Mi Cartera
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Tus clientes asignados y la cola de aprobación de tu cartera.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!loading && !error && (
              <>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-mooving/10 text-mooving dark:bg-mooving/20 dark:text-mooving-300">
                  {clients.length} cliente{clients.length === 1 ? '' : 's'}
                </span>
                {totalPending > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-mooving-accent/10 text-mooving-accent dark:bg-mooving-accent/20">
                    {totalPending} pendiente{totalPending === 1 ? '' : 's'}
                  </span>
                )}
              </>
            )}
            <button
              onClick={fetchOverview}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="animate-fade-in-down rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/30 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
            ❌ {error}
          </div>
        )}

        {/* Contenido: carga / vacío / grilla de clientes */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <Loader2 className="w-8 h-8 animate-spin mb-3 text-mooving" />
            <p className="text-sm">Cargando tu cartera...</p>
          </div>
        ) : clients.length === 0 && !error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="w-14 h-14 rounded-full bg-mooving/10 dark:bg-mooving/20 text-mooving dark:text-mooving-300 flex items-center justify-center mb-4">
              <Inbox className="w-7 h-7" />
            </div>
            <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">
              Todavía no tenés clientes asignados
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Cuando te asignen clientes a tu cartera, vas a verlos acá.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map((c, i) => {
              const name = clientName(c)
              const hours = clientHours(c)
              const records = clientRecords(c)
              const pending = clientPending(c)
              return (
                <div
                  key={clientKey(c, i)}
                  className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 hover:shadow-md transition"
                >
                  {/* Encabezado de la tarjeta: nombre + insignia de pendientes */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-mooving/10 text-mooving dark:bg-mooving/20 dark:text-mooving-300 flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <h3
                        className="font-semibold text-slate-800 dark:text-slate-100 truncate"
                        title={name}
                      >
                        {name}
                      </h3>
                    </div>
                    {pending > 0 && (
                      <span className="shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-mooving-accent/10 text-mooving-accent dark:bg-mooving-accent/20">
                        {pending} pend.
                      </span>
                    )}
                  </div>

                  {/* Métricas */}
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-xl font-bold text-mooving dark:text-mooving-300">
                        {hours.toFixed(1)}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Horas</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
                        {records}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Registros</p>
                    </div>
                    <div>
                      <p
                        className={`text-xl font-bold ${
                          pending > 0
                            ? 'text-mooving-accent'
                            : 'text-slate-800 dark:text-slate-100'
                        }`}
                      >
                        {pending}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Pendientes</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Cola de aprobación acotada a la cartera del coordinador.
          <ApprovalQueue/> ya trae solo los pendientes de su cartera porque el
          backend filtra get_pending_time_records por rol. Aporta su propio
          encabezado ("Aprobaciones") y padding, por eso se embebe tal cual. */}
      <div className="border-t border-slate-200 dark:border-slate-700">
        <ApprovalQueue />
      </div>
    </div>
  )
}

export default CoordinatorView
