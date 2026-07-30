/**
 * Export Excel Button Component (Epic 5 - Exportación a Excel y CSV)
 * Generates and downloads full filtered time records as a clean Excel/CSV file
 */

import React from 'react'
import { TimeRecord } from '../types'
import { FileSpreadsheet, Download } from 'lucide-react'

interface ExportExcelButtonProps {
  records: TimeRecord[]
  filename?: string
}

export const ExportExcelButton: React.FC<ExportExcelButtonProps> = ({ records, filename = 'reporte_horas_mooving.csv' }) => {
  const handleExport = () => {
    if (records.length === 0) return

    // UTF-8 BOM for Excel compatibility with special characters in Spanish
    const BOM = '\uFEFF'
    const headers = ['Fecha', 'Empleado ID', 'Empleado', 'Cliente', 'Proyecto', 'Tipo de Trabajo', 'Horas Decim.', 'Facturable', 'Descripción', 'Fuente']
    
    const rows = records.map(r => [
      r.date,
      `"${r.employee_id || ''}"`,
      `"${(r.employee_name || '').replace(/"/g, '""')}"`,
      `"${(r.client_name || '').replace(/"/g, '""')}"`,
      `"${(r.project_name || '').replace(/"/g, '""')}"`,
      r.work_type,
      (r.duration_decimal || 0).toFixed(2),
      (r.is_billable === 1 || r.is_billable === true || (r.is_billable === undefined && r.work_type === 'project')) ? 'Sí' : 'No',
      `"${(r.description || '').replace(/"/g, '""')}"`,
      r.source || 'manual'
    ])

    const csvContent = BOM + [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={handleExport}
      disabled={records.length === 0}
      className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-lg shadow-sm transition text-sm disabled:opacity-50"
      title="Exportar registros del período a Excel / CSV"
    >
      <FileSpreadsheet className="w-4 h-4" />
      <span>Exportar a Excel (.csv)</span>
    </button>
  )
}
