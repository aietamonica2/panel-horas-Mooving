import React, { useState, useEffect } from 'react'
import { api } from '../api'
import { ConfirmModal } from './ConfirmModal'

interface EditRecordModalProps {
  isOpen: boolean
  onClose: () => void
  record: any | null
  onSuccess: () => void
}

export const EditRecordModal: React.FC<EditRecordModalProps> = ({ isOpen, onClose, record, onSuccess }) => {
  const [formData, setFormData] = useState({
    employee_id: '',
    employee_name: '',
    client_name: '',
    project_name: '',
    duration_decimal: 1.0,
    date: '',
    work_type: 'project',
    description: ''
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (record) {
      setFormData({
        employee_id: record.employee_id,
        employee_name: record.employee_name,
        client_name: record.client_name,
        project_name: record.project_name,
        duration_decimal: record.duration_decimal,
        date: record.date,
        work_type: record.work_type,
        description: record.description || ''
      })
    }
  }, [record])

  // Return condicional DESPUÉS de declarar todos los hooks (Reglas de Hooks).
  if (!isOpen || !record) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')
    try {
      const payload = {
        ...formData,
        client_id: 'cli_' + formData.client_name.toLowerCase().replace(/\s/g, ''),
        project_id: 'proj_' + formData.project_name.toLowerCase().replace(/\s/g, ''),
      }
      const res = await api.updateRecord(record.id, payload)
      const data = await res.json()
      if (data.success) {
        onSuccess()
        onClose()
      } else {
        setError(data.error || 'Error al actualizar el registro')
      }
    } catch (err) {
      setError('Error de conexión con el servidor')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    setShowDeleteConfirm(false)
    setIsSubmitting(true)
    setError('')
    try {
      const res = await api.deleteRecord(record.id)
      const data = await res.json()
      if (data.success) {
        onSuccess()
        onClose()
      } else {
        setError(data.error || 'Error al eliminar el registro')
      }
    } catch (err) {
      setError('Error de conexión con el servidor')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-up">
        <div className="bg-indigo-900 p-4 flex justify-between items-center text-white">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="text-2xl">✏️</span> Editar Registro de Horas
          </h2>
          <button onClick={onClose} className="text-indigo-200 hover:text-white transition text-xl font-bold">
            ×
          </button>
        </div>
        
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Empleado</label>
              <input 
                type="text" 
                required
                value={formData.employee_name}
                onChange={e => setFormData(p => ({ ...p, employee_name: e.target.value }))}
                className="w-full border rounded-lg p-2 bg-gray-50" 
              />
            </div>
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
              <input 
                type="text" 
                required
                value={formData.client_name}
                onChange={e => setFormData(p => ({ ...p, client_name: e.target.value }))}
                className="w-full border rounded-lg p-2" 
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
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duración (horas)</label>
              <input 
                type="number" 
                required
                step="0.1"
                min="0.1"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea 
              value={formData.description}
              onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
              className="w-full border rounded-lg p-2" 
              rows={2}
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="pt-4 mt-6 border-t flex justify-between items-center">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-lg font-medium transition disabled:opacity-50"
            >
              🗑️ Eliminar
            </button>
            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg shadow-sm font-medium transition disabled:opacity-50"
              >
                {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <ConfirmModal
      isOpen={showDeleteConfirm}
      title="Eliminar registro"
      message={`¿Seguro que querés eliminar el registro de ${record.employee_name} del ${record.date}? Esta acción no se puede deshacer.`}
      confirmLabel="Eliminar"
      cancelLabel="Cancelar"
      variant="danger"
      onConfirm={handleDelete}
      onCancel={() => setShowDeleteConfirm(false)}
    />
    </>
  )
}
