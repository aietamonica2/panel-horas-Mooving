import React, { useState } from 'react'
import { api } from '../api'
import { useDataStore } from '../stores/dataStore'

interface QuickLogModalProps {
  isOpen: boolean
  onClose: () => void
}

export const QuickLogModal: React.FC<QuickLogModalProps> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    project_name: '',
    duration: '',
    work_type: 'project',
    description: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      const dur = parseFloat(formData.duration)
      const payload = {
        employee_id: 'emp_monica',
        employee_name: 'monica.aieta',
        client_id: 'cli_mooving',
        client_name: 'Mooving',
        project_id: formData.project_name.toLowerCase().replace(/\s+/g, '-'),
        project_name: formData.project_name,
        duration_decimal: isNaN(dur) ? 1.0 : dur,
        date: new Date().toISOString().split('T')[0],
        work_type: formData.work_type === 'support' ? 'project' : formData.work_type,
        description: formData.description
      }

      const res = await api.createRecord(payload)
      const json = await res.json()
      if (res.ok && json.success) {
        // Refresh store
        const refreshRes = await api.listRecords()
        if (refreshRes.ok) {
          const refreshJson = await refreshRes.json()
          if (refreshJson.success && refreshJson.data?.records) {
            useDataStore.setState({ records: refreshJson.data.records })
          }
        }
        onClose()
      } else {
        setError(json.error || 'Error al registrar horas')
      }
    } catch (err) {
      console.error(err)
      setError('Error de conexión con el servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-blue-900 to-slate-800 p-4 flex justify-between items-center text-white">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="text-yellow-400">⏱️</span> Carga Rápida de Horas
          </h2>
          <button onClick={onClose} className="text-gray-300 hover:text-white transition">
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-200 text-sm font-medium">
              ⚠️ {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Tarea</label>
            <select 
              className="w-full border border-gray-300 rounded-lg p-2 bg-gray-50 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.work_type}
              onChange={e => setFormData({...formData, work_type: e.target.value})}
            >
              <option value="project">Proyecto / Cliente</option>
              <option value="internal">Tarea Interna</option>
              <option value="meeting">Reunión</option>
              <option value="support">Soporte (Zendesk)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Proyecto o Tarea</label>
            <input 
              type="text" 
              required
              placeholder="Ej: Onboarding YPF"
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.project_name}
              onChange={e => setFormData({...formData, project_name: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duración (Horas)</label>
            <input 
              type="number" 
              step="0.5"
              required
              min="0.5"
              placeholder="Ej: 2.5"
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.duration}
              onChange={e => setFormData({...formData, duration: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción corta</label>
            <textarea 
              rows={2}
              placeholder="¿Qué estuviste haciendo?"
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="flex-1 px-4 py-2 bg-[#f97316] text-white rounded-lg hover:bg-[#ea580c] transition font-bold shadow-md disabled:opacity-70 flex justify-center items-center gap-2"
            >
              {loading ? <span className="animate-pulse">Guardando...</span> : 'Registrar Horas'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
