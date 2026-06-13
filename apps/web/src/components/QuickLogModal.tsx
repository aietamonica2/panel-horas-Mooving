import React, { useState } from 'react'
import { api } from '../api'
import { useDataStore } from '../stores/dataStore'

interface QuickLogModalProps {
  isOpen: boolean
  onClose: () => void
}

const EMPLOYEES = [
  { id: 'emp_monica', name: 'monica.aieta' },
  { id: 'emp_fede', name: 'federico.gomez' },
  { id: 'emp_santi', name: 'santiago.perez' }
]

const CLIENTS = [
  { id: 'cli_camuzzi', name: 'Camuzzi' },
  { id: 'cli_ypf', name: 'YPF' },
  { id: 'cli_mooving', name: 'Mooving' }
]

const PROJECTS: Record<string, { id: string; name: string }[]> = {
  cli_camuzzi: [{ id: 'proj_cam_web', name: 'Portal Web' }],
  cli_ypf: [{ id: 'proj_ypf_mig', name: 'Migración SAP' }],
  cli_mooving: [{ id: 'proj_moov_core', name: 'Senda Core' }]
}

export const QuickLogModal: React.FC<QuickLogModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'senda'>('manual')
  
  // Manual Form States
  const [manualData, setManualData] = useState({
    employee_id: 'emp_monica',
    client_id: 'cli_mooving',
    project_id: 'proj_moov_core',
    duration: '4.0',
    work_type: 'project',
    date: new Date().toISOString().split('T')[0],
    description: ''
  })

  // Senda AI States
  const [naturalText, setNaturalText] = useState('')
  const [parsedPreview, setParsedPreview] = useState<any | null>(null)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  if (!isOpen) return null

  // Handle nested project options based on selected client
  const availableProjects = PROJECTS[manualData.client_id] || []

  const handleClientChange = (clientId: string) => {
    const defaultProj = PROJECTS[clientId]?.[0]?.id || ''
    setManualData({
      ...manualData,
      client_id: clientId,
      project_id: defaultProj
    })
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccessMsg(null)

    try {
      const selectedEmp = EMPLOYEES.find(e => e.id === manualData.employee_id)
      const selectedCli = CLIENTS.find(c => c.id === manualData.client_id)
      const selectedProj = availableProjects.find(p => p.id === manualData.project_id)
      const dur = parseFloat(manualData.duration)

      const payload = {
        employee_id: manualData.employee_id,
        employee_name: selectedEmp?.name || 'Unknown',
        client_id: manualData.client_id,
        client_name: selectedCli?.name || 'Unknown',
        project_id: manualData.project_id,
        project_name: selectedProj?.name || 'Unknown',
        duration_decimal: isNaN(dur) ? 1.0 : dur,
        date: manualData.date || new Date().toISOString().split('T')[0],
        work_type: manualData.work_type,
        description: manualData.description
      }

      await saveRecord(payload)
    } catch (err) {
      console.error(err)
      setError('Error al conectar con el servidor.')
    } finally {
      setLoading(false)
    }
  }

  const handleSendaParse = async () => {
    if (!naturalText.trim()) return
    setLoading(true)
    setError(null)
    setParsedPreview(null)

    try {
      const res = await api.callMcpTool('parse_natural_language_hours', { text: naturalText })
      const data = await res.json()
      if (data.success && data.result?.parsed) {
        setParsedPreview(data.result.parsed)
      } else {
        setError(data.error || 'Senda AI no pudo procesar la frase.')
      }
    } catch (err) {
      console.error(err)
      setError('Error al procesar la frase.')
    } finally {
      setLoading(false)
    }
  }

  const handleSendaConfirm = async () => {
    if (!parsedPreview) return
    setLoading(true)
    setError(null)
    
    try {
      await saveRecord(parsedPreview)
    } catch (err) {
      console.error(err)
      setError('Error al guardar registro procesado.')
    } finally {
      setLoading(false)
    }
  }

  const saveRecord = async (payload: any) => {
    const res = await api.createRecord(payload)
    const json = await res.json()
    
    if (res.ok && json.success) {
      setSuccessMsg('¡Horas cargadas con éxito!')
      setNaturalText('')
      setParsedPreview(null)
      // Refresh list
      const refreshRes = await api.listRecords()
      if (refreshRes.ok) {
        const refreshJson = await refreshRes.json()
        if (refreshJson.success && refreshJson.data?.records) {
          useDataStore.setState({ records: refreshJson.data.records })
        }
      }
      setTimeout(() => {
        setSuccessMsg(null)
        onClose()
      }, 1500)
    } else {
      setError(json.error || 'Error al guardar el registro.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 to-slate-800 p-4 flex justify-between items-center text-white">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="text-2xl">⏱️</span> Carga Rápida de Horas
          </h2>
          <button onClick={onClose} className="text-gray-300 hover:text-white transition">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => { setActiveTab('manual'); setError(null); }}
            className={`flex-1 py-3 text-sm font-semibold border-b-2 transition ${activeTab === 'manual' ? 'border-[#f97316] text-[#f97316]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            📋 Formulario Amigable
          </button>
          <button
            onClick={() => { setActiveTab('senda'); setError(null); }}
            className={`flex-1 py-3 text-sm font-semibold border-b-2 transition ${activeTab === 'senda' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            🤖 Carga con Senda AI
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-200 text-sm font-medium">
              ⚠️ {error}
            </div>
          )}

          {successMsg && (
            <div className="bg-green-50 text-green-700 p-3 rounded-lg border border-green-200 text-sm font-medium">
              ✅ {successMsg}
            </div>
          )}

          {/* MANUAL FORM TAB */}
          {activeTab === 'manual' && (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Empleado</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg p-2.5 bg-gray-50 text-gray-800 focus:ring-2 focus:ring-orange-500 outline-none"
                    value={manualData.employee_id}
                    onChange={e => setManualData({ ...manualData, employee_id: e.target.value })}
                  >
                    {EMPLOYEES.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Tipo de Tarea</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg p-2.5 bg-gray-50 text-gray-800 focus:ring-2 focus:ring-orange-500 outline-none"
                    value={manualData.work_type}
                    onChange={e => setManualData({ ...manualData, work_type: e.target.value })}
                  >
                    <option value="project">Proyecto / Cliente</option>
                    <option value="internal">Tarea Interna</option>
                    <option value="meeting">Reunión</option>
                    <option value="training">Capacitación</option>
                    <option value="other">Soporte (Zendesk)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Cliente</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg p-2.5 bg-gray-50 text-gray-800 focus:ring-2 focus:ring-orange-500 outline-none"
                    value={manualData.client_id}
                    onChange={e => handleClientChange(e.target.value)}
                  >
                    {CLIENTS.map(cli => (
                      <option key={cli.id} value={cli.id}>{cli.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Proyecto (Anidado)</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg p-2.5 bg-gray-50 text-gray-800 focus:ring-2 focus:ring-orange-500 outline-none"
                    value={manualData.project_id}
                    onChange={e => setManualData({ ...manualData, project_id: e.target.value })}
                  >
                    {availableProjects.map(proj => (
                      <option key={proj.id} value={proj.id}>{proj.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Fecha</label>
                <input
                  type="date"
                  required
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full border border-gray-300 rounded-lg p-2.5 bg-gray-50 text-gray-800 focus:ring-2 focus:ring-orange-500 outline-none"
                  value={manualData.date}
                  onChange={e => setManualData({ ...manualData, date: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Duración (Horas)</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  min="0.5"
                  max="24"
                  placeholder="Ej: 4.5"
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-orange-500 outline-none"
                  value={manualData.duration}
                  onChange={e => setManualData({ ...manualData, duration: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Descripción de la Tarea</label>
                <textarea
                  rows={2}
                  required
                  placeholder="¿Qué estuviste haciendo?"
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-orange-500 outline-none"
                  value={manualData.description}
                  onChange={e => setManualData({ ...manualData, description: e.target.value })}
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-[#f97316] text-white rounded-lg hover:bg-[#ea580c] transition font-bold shadow-md disabled:opacity-70 flex justify-center items-center gap-2"
                >
                  {loading ? 'Guardando...' : 'Cargar Horas'}
                </button>
              </div>
            </form>
          )}

          {/* SENDA AI TAB */}
          {activeTab === 'senda' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-indigo-700 uppercase mb-1">Describe tu actividad</label>
                <textarea
                  rows={3}
                  placeholder="Ej: fede 5.5h en YPF Migración SAP resolviendo bugs de producción"
                  className="w-full border border-indigo-200 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 placeholder-indigo-300"
                  value={naturalText}
                  onChange={e => setNaturalText(e.target.value)}
                />
              </div>

              <button
                type="button"
                onClick={handleSendaParse}
                disabled={loading || !naturalText.trim()}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition font-bold shadow disabled:opacity-60 flex justify-center items-center gap-2"
              >
                {loading ? 'Analizando...' : '🪄 Procesar con Senda AI'}
              </button>

              {/* Preview of Parsed Data */}
              {parsedPreview && (
                <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-4 mt-4 space-y-3">
                  <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Previsualización de Carga</h3>
                  
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-gray-400 block">Empleado</span>
                      <span className="font-semibold text-slate-800">{parsedPreview.employee_name}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Horas</span>
                      <span className="font-semibold text-[#f97316]">{parsedPreview.duration_decimal}h</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Cliente</span>
                      <span className="font-semibold text-slate-800">{parsedPreview.client_name}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Proyecto</span>
                      <span className="font-semibold text-slate-800">{parsedPreview.project_name}</span>
                    </div>
                  </div>
                  
                  <div className="text-xs pt-1 border-t border-indigo-100">
                    <span className="text-gray-400 block">Detalle</span>
                    <p className="italic text-slate-700">{parsedPreview.description}</p>
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setParsedPreview(null)}
                      className="flex-1 py-2 text-xs border border-indigo-200 text-indigo-700 bg-white rounded-lg hover:bg-indigo-50 transition font-medium"
                    >
                      Editar Frase
                    </button>
                    <button
                      type="button"
                      onClick={handleSendaConfirm}
                      disabled={loading}
                      className="flex-1 py-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition font-bold shadow"
                    >
                      {loading ? 'Guardando...' : 'Confirmar Carga'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
