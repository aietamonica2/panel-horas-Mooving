/**
 * Client Contracts Section Component (Epic 4 - Retainer & Bag of Hours Tracking)
 * Displays contracted hours vs consumed hours per client with progress bars and alerts
 */

import React, { useState, useEffect } from 'react'
import { TimeRecord } from '../types'
import { api } from '../api'
import { Briefcase, AlertTriangle, CheckCircle2, Edit3, ShieldAlert } from 'lucide-react'

interface ClientContractsSectionProps {
  records: TimeRecord[]
  selectedMonth?: string
}

const MOOVING_COLORS = {
  primary: '#1a5f7a',
  secondary: '#f97316',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  border: '#e2e8f0',
}

export const ClientContractsSection: React.FC<ClientContractsSectionProps> = ({ records }) => {
  const [contractsMap, setContractsMap] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [editingClient, setEditingClient] = useState<{ id: string; name: string; hours: number } | null>(null)
  const [inputHours, setInputHours] = useState<string>('')
  const [showOnlyConfigured, setShowOnlyConfigured] = useState<boolean>(true)
  const [isExpanded, setIsExpanded] = useState<boolean>(true)

  const fetchContracts = async () => {
    setLoading(true)
    try {
      const res = await api.callMcpTool('get_client_contracts', {})
      const data = await res.json()
      if (data.success && data.result?.contracts) {
        const map: Record<string, number> = {}
        data.result.contracts.forEach((c: any) => {
          map[c.client_id] = Number(c.contracted_hours || 0)
        })
        setContractsMap(map)
      }
    } catch (err) {
      console.error('Error fetching contracts:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContracts()
  }, [])

  // Aggregate project hours by client
  const clientData = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; consumed: number }>()

    records.forEach(r => {
      if (r.client_id && r.work_type === 'project') {
        const existing = map.get(r.client_id) || {
          id: r.client_id,
          name: r.client_name || r.client_id,
          consumed: 0
        }
        existing.consumed += r.duration_decimal
        map.set(r.client_id, existing)
      }
    })

    return Array.from(map.values()).sort((a, b) => b.consumed - a.consumed)
  }, [records])

  const handleSaveContract = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingClient) return

    const hours = parseFloat(inputHours)
    if (isNaN(hours) || hours < 0) return

    try {
      const currentMonth = new Date().toISOString().slice(0, 7)
      const res = await api.callMcpTool('set_client_contract', {
        client_id: editingClient.id,
        month: currentMonth,
        contracted_hours: hours
      })
      const data = await res.json()
      if (data.success) {
        setContractsMap(prev => ({ ...prev, [editingClient.id]: hours }))
        setEditingClient(null)
      }
    } catch (err) {
      console.error('Error setting contract:', err)
    }
  }

  if (clientData.length === 0) {
    return null
  }

  const configuredClientsCount = clientData.filter(c => (contractsMap[c.id] || 0) > 0).length

  const displayClients = showOnlyConfigured && configuredClientsCount > 0
    ? clientData.filter(c => (contractsMap[c.id] || 0) > 0)
    : clientData

  const highRiskClients = clientData.filter(c => {
    const contracted = contractsMap[c.id] || 0
    return contracted > 0 && (c.consumed / contracted) >= 0.8
  })

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border-t-4 border-amber-500">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)} style={{ color: MOOVING_COLORS.primary }}>
            <Briefcase className="w-6 h-6 text-amber-500" />
            Contratos y Bolsas de Horas por Cliente <span className="text-xs text-slate-400 font-normal">(Opcional)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Módulo opcional: Seguimiento de abonos/bolsas de horas contratadas ({configuredClientsCount} clientes configurados).
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {configuredClientsCount > 0 && (
            <label className="flex items-center gap-1.5 text-xs text-slate-600 font-medium cursor-pointer bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <input
                type="checkbox"
                checked={showOnlyConfigured}
                onChange={e => setShowOnlyConfigured(e.target.checked)}
                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
              />
              Solo con contrato activo ({configuredClientsCount})
            </label>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition"
          >
            {isExpanded ? '▼ Ocultar' : '▲ Mostrar'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-6">
          {configuredClientsCount === 0 && (
            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-amber-800 flex items-center justify-between">
              <span>💡 La mayoría de los clientes no usan bolsa de horas. Podés definir una bolsa contratada a cualquier cliente cuando lo requiera.</span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider">
              <th className="py-3 px-4">Cliente</th>
              <th className="py-3 px-4 text-center">Horas Contratadas</th>
              <th className="py-3 px-4 text-center">Horas Consumidas</th>
              <th className="py-3 px-4 text-center">Ejecución (%)</th>
              <th className="py-3 px-4 text-center">Estado</th>
              <th className="py-3 px-4 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayClients.map(client => {
              const contracted = contractsMap[client.id] || 0
              const percentage = contracted > 0 ? (client.consumed / contracted) * 100 : 0

              let badgeBg = 'bg-slate-100 text-slate-600 border-slate-200'
              let badgeText = 'Sin Contrato'
              let barColor = 'bg-slate-300'

              if (contracted > 0) {
                if (percentage >= 95) {
                  badgeBg = 'bg-red-100 text-red-800 border-red-300'
                  badgeText = '🔴 Excedido (>95%)'
                  barColor = 'bg-red-500'
                } else if (percentage >= 80) {
                  badgeBg = 'bg-amber-100 text-amber-800 border-amber-300'
                  badgeText = '🟡 Alerta (80-95%)'
                  barColor = 'bg-amber-500'
                } else {
                  badgeBg = 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  badgeText = '🟢 Saludable (<80%)'
                  barColor = 'bg-emerald-500'
                }
              }

              return (
                <tr key={client.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-semibold text-slate-800">{client.name}</td>
                  <td className="py-3 px-4 text-center font-mono">
                    {contracted > 0 ? `${contracted}h` : <span className="text-slate-400 font-sans italic text-xs">No fijada</span>}
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-indigo-700 font-mono">
                    {client.consumed.toFixed(1)}h
                  </td>
                  <td className="py-3 px-4 text-center min-w-[140px]">
                    {contracted > 0 ? (
                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span>{percentage.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${barColor}`}
                            style={{ width: `${Math.min(100, percentage)}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 font-mono">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${badgeBg}`}>
                      {badgeText}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => {
                        setEditingClient({ id: client.id, name: client.name, hours: contracted })
                        setInputHours(contracted > 0 ? String(contracted) : '80')
                      }}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 rounded-md transition font-medium border border-slate-200"
                    >
                      <Edit3 className="w-3 h-3" />
                      Fijar Bolsa
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )}

      {/* Modal para editar horas contratadas */}
      {editingClient && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-2">
              Fijar Bolsa Contratada
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Cliente: <span className="font-semibold text-slate-700">{editingClient.name}</span>
            </p>
            <form onSubmit={handleSaveContract} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Horas Contratadas (Mensual)
                </label>
                <input
                  type="number"
                  min="0"
                  step="5"
                  required
                  value={inputHours}
                  onChange={e => setInputHours(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  placeholder="Ej: 80"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingClient(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow transition"
                >
                  Guardar Bolsa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
