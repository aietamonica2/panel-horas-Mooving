import React, { useState } from 'react'
import { api } from '../api'

const MOOVING_COLORS = {
  primary: '#1a5f7a',
  secondary: '#f97316',
  lightBg: '#f8fafc',
  border: '#e2e8f0',
}

export const MyTime: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [formData, setFormData] = useState({
    client_name: '',
    project_name: '',
    duration_decimal: 1.0,
    date: new Date().toISOString().split('T')[0],
    work_type: 'project',
    description: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage('Guardando...')
    
    try {
      const userEmail = localStorage.getItem('mooving_user_email') || 'unknown@moovingtech.com'
      const userName = userEmail.split('@')[0]
      const userId = 'emp_' + userName.replace('.', '_')

      const payload = {
        employee_id: userId,
        employee_name: userName,
        client_id: 'cli_' + formData.client_name.toLowerCase().replace(/\s/g, ''),
        client_name: formData.client_name,
        project_id: 'proj_' + formData.project_name.toLowerCase().replace(/\s/g, ''),
        project_name: formData.project_name,
        duration_decimal: Number(formData.duration_decimal),
        date: formData.date,
        work_type: formData.work_type,
        description: formData.description
      }

      const res = await api.addRecord(payload)
      const data = await res.json()
      if (data.success) {
        setMessage('✅ ¡Horas guardadas con éxito!')
        // Reset form partially
        setFormData(prev => ({ ...prev, duration_decimal: 1.0, description: '' }))
      } else {
        setMessage('❌ Error al guardar las horas.')
      }
    } catch (err) {
      setMessage('❌ Error de red.')
    } finally {
      setIsSubmitting(false)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  return (
    <div style={{ backgroundColor: MOOVING_COLORS.lightBg }} className="min-h-screen relative p-8">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold mb-2" style={{ color: MOOVING_COLORS.primary }}>Mi Registro de Horas</h2>
        <p className="text-gray-600 mb-8">Registra tu actividad de forma manual o utilizando el asistente Senda AI en la esquina inferior derecha.</p>
        
        <div className="bg-white rounded-xl shadow-md p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                <input 
                  type="text" 
                  required
                  value={formData.client_name}
                  onChange={e => setFormData(p => ({ ...p, client_name: e.target.value }))}
                  className="w-full border rounded-lg p-2" 
                  placeholder="Ej: Mooving"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Proyecto</label>
                <input 
                  type="text" 
                  required
                  value={formData.project_name}
                  onChange={e => setFormData(p => ({ ...p, project_name: e.target.value }))}
                  className="w-full border rounded-lg p-2" 
                  placeholder="Ej: Senda Core"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                <input 
                  type="date" 
                  required
                  value={formData.date}
                  onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
                  className="w-full border rounded-lg p-2" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duración (horas)</label>
                <input 
                  type="number" 
                  required
                  step="0.5"
                  min="0.5"
                  max="24"
                  value={formData.duration_decimal}
                  onChange={e => setFormData(p => ({ ...p, duration_decimal: Number(e.target.value) }))}
                  className="w-full border rounded-lg p-2" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Tarea</label>
                <select 
                  className="w-full border rounded-lg p-2 bg-white"
                  value={formData.work_type}
                  onChange={e => setFormData(p => ({ ...p, work_type: e.target.value }))}
                >
                  <option value="project">Proyecto (Facturable)</option>
                  <option value="internal">Gestión Interna</option>
                  <option value="meeting">Reunión</option>
                  <option value="training">Capacitación</option>
                  <option value="other">Soporte/Otro</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción / Notas</label>
              <textarea 
                value={formData.description}
                onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                className="w-full border rounded-lg p-2" 
                rows={3}
                placeholder="Describe brevemente las tareas realizadas..."
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <span className="text-sm font-medium text-indigo-600">{message}</span>
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg shadow-sm transition disabled:opacity-50"
              >
                {isSubmitting ? 'Guardando...' : 'Cargar Horas'}
              </button>
            </div>
          </form>
        </div>

        <div className="mt-8 bg-indigo-50 border border-indigo-100 rounded-xl p-6 text-indigo-900">
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
            <span className="text-2xl">🤖</span> Tip: Usa el Asistente Senda
          </h3>
          <p className="text-sm">
            En lugar de llenar el formulario manualmente, abre el chat en la esquina inferior y di: 
            <strong>"Ayer trabajé 4 horas para Camuzzi en la integración web"</strong>. 
            Senda detectará automáticamente el proyecto, el cliente, las horas y la fecha, y lo guardará por ti.
          </p>
        </div>
      </div>
    </div>
  )
}
