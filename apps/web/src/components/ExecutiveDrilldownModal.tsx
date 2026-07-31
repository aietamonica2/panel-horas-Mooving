/**
 * Executive Drilldown Modal Component (Epic 3 - E3-06)
 * Enables C-Level users to click any executive KPI card and view the underlying detailed breakdown
 */

import React from 'react'
import { TimeRecord } from '../types'
import { X, Search, ShieldCheck, PieChart, FileText } from 'lucide-react'

interface ExecutiveDrilldownModalProps {
  isOpen: boolean
  onClose: () => void
  type: 'billable' | 'overhead' | 'risk' | null
  records: TimeRecord[]
}

// FEAT-04: acceso defensivo a amount_usd (persistido por otra tarea) sin
// depender de que el campo esté declarado en la interfaz TimeRecord.
type BillingFields = { rate_usd?: number; amount_usd?: number }

const getAmountUsd = (r: TimeRecord): number => {
  const v = (r as TimeRecord & BillingFields).amount_usd
  return typeof v === 'number' && isFinite(v) ? v : 0
}

const fmtUsd = (n: number, decimals = 0): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number.isFinite(n) ? n : 0)

export const ExecutiveDrilldownModal: React.FC<ExecutiveDrilldownModalProps> = ({
  isOpen,
  onClose,
  type,
  records
}) => {
  if (!isOpen || !type) return null

  let title = ''
  let description = ''
  let filteredRecords: TimeRecord[] = []

  const totalHours = records.reduce((acc, r) => acc + (r.duration_decimal || 0), 0)

  if (type === 'billable') {
    title = '🟢 Desglose de Horas Facturables (Proyectos)'
    description = 'Listado detallado de todas las horas asociadas a proyectos o marcadas como facturables en la DB.'
    filteredRecords = records.filter(r => r.is_billable === 1 || r.is_billable === true || (r.is_billable === undefined && r.work_type === 'project'))
  } else if (type === 'overhead') {
    title = '🔴 Desglose de Carga de Overhead (No Facturables)'
    description = 'Reuniones internas, tareas administrativas y capacitaciones que representan costo indirecto.'
    filteredRecords = records.filter(r => !(r.is_billable === 1 || r.is_billable === true || (r.is_billable === undefined && r.work_type === 'project')))
  } else if (type === 'risk') {
    // Find top client
    const clientMap: Record<string, number> = {}
    records.forEach(r => {
      if (r.client_name) clientMap[r.client_name] = (clientMap[r.client_name] || 0) + r.duration_decimal
    })
    const topClientName = Object.entries(clientMap).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
    title = `🟡 Concentración de Riesgo — Cliente: ${topClientName}`
    description = `Todas las horas dedicadas al cliente de mayor consumo para evaluar dependencia operativa.`
    filteredRecords = records.filter(r => r.client_name === topClientName)
  }

  const subsetTotal = filteredRecords.reduce((acc, r) => acc + (r.duration_decimal || 0), 0)
  const subsetRatio = totalHours > 0 ? ((subsetTotal / totalHours) * 100).toFixed(1) : '0'

  // FEAT-04: monto USD real del subconjunto. Si ningún registro trae amount_usd,
  // hasBillingData=false y la vista omite las cifras en vez de inventarlas.
  const subsetUsd = filteredRecords.reduce((acc, r) => acc + getAmountUsd(r), 0)
  const hasBillingData = filteredRecords.some(r => getAmountUsd(r) > 0)
  const subsetUsdPerHour = subsetTotal > 0 ? subsetUsd / subsetTotal : 0

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200">
        <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">{title}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{description}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Header Summary */}
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex flex-wrap gap-2 justify-between items-center text-xs font-semibold text-slate-700">
          <span>Total Registros: {filteredRecords.length}</span>
          <div className="flex items-center gap-4">
            {hasBillingData ? (
              <span className="text-sm font-bold text-emerald-700">
                Facturación: {fmtUsd(subsetUsd)} <span className="text-slate-400 font-medium">({fmtUsd(subsetUsdPerHour, 2)}/h)</span>
              </span>
            ) : (
              <span className="text-[11px] font-medium text-amber-600 italic">Sin datos de facturación USD</span>
            )}
            <span className="text-sm font-bold text-indigo-700">Total Horas: {subsetTotal.toFixed(1)}h ({subsetRatio}% del total global)</span>
          </div>
        </div>

        {/* Records Table */}
        <div className="flex-1 overflow-y-auto p-6">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 font-bold uppercase">
                <th className="py-2.5 px-3">Fecha</th>
                <th className="py-2.5 px-3">Empleado</th>
                <th className="py-2.5 px-3">Cliente</th>
                <th className="py-2.5 px-3">Proyecto</th>
                <th className="py-2.5 px-3 text-center">Tipo</th>
                <th className="py-2.5 px-3 text-right">Horas</th>
                {hasBillingData && <th className="py-2.5 px-3 text-right">USD</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.slice(0, 100).map((r, i) => (
                <tr key={i} className="hover:bg-slate-50 transition">
                  <td className="py-2 px-3 font-mono text-slate-600">{r.date}</td>
                  <td className="py-2 px-3 font-medium text-slate-800">{r.employee_name}</td>
                  <td className="py-2 px-3 text-slate-600">{r.client_name}</td>
                  <td className="py-2 px-3 text-slate-500">{r.project_name}</td>
                  <td className="py-2 px-3 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                      {r.work_type}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-indigo-600">
                    {r.duration_decimal.toFixed(2)}h
                  </td>
                  {hasBillingData && (
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">
                      {getAmountUsd(r) > 0 ? fmtUsd(getAmountUsd(r)) : '—'}
                    </td>
                  )}
                </tr>
              ))}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={hasBillingData ? 7 : 6} className="py-8 text-center text-slate-400 italic">
                    Sin registros para esta métrica.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-right">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition"
          >
            Cerrar Ventana
          </button>
        </div>
      </div>
    </div>
  )
}
