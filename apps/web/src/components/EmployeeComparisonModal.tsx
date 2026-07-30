/**
 * Employee Comparison Modal Component (Epic 1 - E1-07)
 * Side-by-side comparison of 2 employees' performance, billability, capacity, and project breakdown
 */

import React, { useState } from 'react'
import { TimeRecord } from '../types'
import { Users, X, ArrowRightLeft, Award } from 'lucide-react'

interface EmployeeComparisonModalProps {
  isOpen: boolean
  onClose: () => void
  records: TimeRecord[]
  employees: { id: string; name: string }[]
}

export const EmployeeComparisonModal: React.FC<EmployeeComparisonModalProps> = ({
  isOpen,
  onClose,
  records,
  employees
}) => {
  const [empId1, setEmpId1] = useState<string>('')
  const [empId2, setEmpId2] = useState<string>('')

  if (!isOpen) return null

  const getEmpStats = (empId: string) => {
    if (!empId) return null

    const empRecords = records.filter(r => r.employee_id === empId || r.employee_name === empId)
    const empName = empRecords[0]?.employee_name || employees.find(e => e.id === empId)?.name || empId
    const totalHours = empRecords.reduce((sum, r) => sum + (r.duration_decimal || 0), 0)
    const billableHours = empRecords
      .filter(r => r.is_billable === 1 || r.is_billable === true || (r.is_billable === undefined && r.work_type === 'project'))
      .reduce((sum, r) => sum + (r.duration_decimal || 0), 0)

    const uniqueDates = new Set(empRecords.map(r => r.date)).size
    const avgDaily = uniqueDates > 0 ? (totalHours / uniqueDates).toFixed(1) : '0.0'
    const billableRate = totalHours > 0 ? ((billableHours / totalHours) * 100).toFixed(0) : '0'

    // Client breakdown
    const clientMap: Record<string, number> = {}
    empRecords.forEach(r => {
      if (r.client_name) {
        clientMap[r.client_name] = (clientMap[r.client_name] || 0) + r.duration_decimal
      }
    })

    const topClient = Object.entries(clientMap).sort((a, b) => b[1] - a[1])[0]

    return {
      name: empName,
      totalHours,
      billableHours,
      billableRate,
      avgDaily,
      recordsCount: empRecords.length,
      topClient: topClient ? `${topClient[0]} (${topClient[1].toFixed(1)}h)` : 'N/A',
      clientBreakdown: Object.entries(clientMap).sort((a, b) => b[1] - a[1]).slice(0, 5)
    }
  }

  const stats1 = getEmpStats(empId1)
  const stats2 = getEmpStats(empId2)

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200">
        <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold">Comparativa Side-by-Side de Empleados</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Empleado A</label>
              <select
                value={empId1}
                onChange={e => setEmpId1(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 font-semibold focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Seleccionar Empleado A --</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Empleado B</label>
              <select
                value={empId2}
                onChange={e => setEmpId2(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 font-semibold focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Seleccionar Empleado B --</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Comparison Table */}
          {stats1 && stats2 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Emp 1 Card */}
              <div className="bg-indigo-50/50 border-2 border-indigo-200 rounded-xl p-5 space-y-4">
                <div className="flex justify-between items-center border-b border-indigo-200 pb-3">
                  <h4 className="text-lg font-bold text-indigo-900">{stats1.name}</h4>
                  {stats1.totalHours >= stats2.totalHours && (
                    <span className="bg-indigo-600 text-white text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                      <Award className="w-3.5 h-3.5" /> Mayor Carga
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-center text-xs">
                  <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-2xs">
                    <span className="text-slate-400 font-medium block">Horas Totales</span>
                    <span className="text-xl font-bold text-indigo-700">{stats1.totalHours.toFixed(1)}h</span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-2xs">
                    <span className="text-slate-400 font-medium block">% Facturable</span>
                    <span className="text-xl font-bold text-emerald-600">{stats1.billableRate}%</span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-2xs">
                    <span className="text-slate-400 font-medium block">Promedio Diario</span>
                    <span className="text-lg font-bold text-slate-800">{stats1.avgDaily}h/día</span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-2xs">
                    <span className="text-slate-400 font-medium block">Cliente Principal</span>
                    <span className="text-xs font-bold text-slate-800 truncate block" title={stats1.topClient}>{stats1.topClient}</span>
                  </div>
                </div>

                <div>
                  <h5 className="text-xs font-bold text-indigo-900 mb-2 uppercase">Desglose Clientes Top</h5>
                  <div className="space-y-1.5 text-xs">
                    {stats1.clientBreakdown.map(([c, h]) => (
                      <div key={c} className="flex justify-between bg-white px-3 py-1.5 rounded border border-indigo-100 font-medium">
                        <span className="text-slate-700 truncate max-w-[180px]">{c}</span>
                        <span className="font-bold text-indigo-600">{h.toFixed(1)}h</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Emp 2 Card */}
              <div className="bg-purple-50/50 border-2 border-purple-200 rounded-xl p-5 space-y-4">
                <div className="flex justify-between items-center border-b border-purple-200 pb-3">
                  <h4 className="text-lg font-bold text-purple-900">{stats2.name}</h4>
                  {stats2.totalHours >= stats1.totalHours && (
                    <span className="bg-purple-600 text-white text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                      <Award className="w-3.5 h-3.5" /> Mayor Carga
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-center text-xs">
                  <div className="bg-white p-3 rounded-lg border border-purple-100 shadow-2xs">
                    <span className="text-slate-400 font-medium block">Horas Totales</span>
                    <span className="text-xl font-bold text-purple-700">{stats2.totalHours.toFixed(1)}h</span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-purple-100 shadow-2xs">
                    <span className="text-slate-400 font-medium block">% Facturable</span>
                    <span className="text-xl font-bold text-emerald-600">{stats2.billableRate}%</span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-purple-100 shadow-2xs">
                    <span className="text-slate-400 font-medium block">Promedio Diario</span>
                    <span className="text-lg font-bold text-slate-800">{stats2.avgDaily}h/día</span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-purple-100 shadow-2xs">
                    <span className="text-slate-400 font-medium block">Cliente Principal</span>
                    <span className="text-xs font-bold text-slate-800 truncate block" title={stats2.topClient}>{stats2.topClient}</span>
                  </div>
                </div>

                <div>
                  <h5 className="text-xs font-bold text-purple-900 mb-2 uppercase">Desglose Clientes Top</h5>
                  <div className="space-y-1.5 text-xs">
                    {stats2.clientBreakdown.map(([c, h]) => (
                      <div key={c} className="flex justify-between bg-white px-3 py-1.5 rounded border border-purple-100 font-medium">
                        <span className="text-slate-700 truncate max-w-[180px]">{c}</span>
                        <span className="font-bold text-purple-600">{h.toFixed(1)}h</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 font-medium text-sm border-2 border-dashed border-slate-200 rounded-xl">
              Selecciona ambos empleados para habilitar la comparativa métrica en tiempo real.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
