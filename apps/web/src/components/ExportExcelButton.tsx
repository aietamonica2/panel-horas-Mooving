/**
 * Export CSV Button Component (Epic 5 - Exportación a Excel y CSV)
 * Generates and downloads the full filtered time records as a clean CSV file
 * (UTF-8 with BOM, every column quoted and protected against formula injection).
 */

import React from 'react'
import { TimeRecord } from '../types'
import { FileSpreadsheet } from 'lucide-react'

interface ExportExcelButtonProps {
  records: TimeRecord[]
  filename?: string
}

/**
 * Neutraliza la inyección de fórmulas CSV: una celda cuyo texto empieza con
 * `=`, `+`, `-`, `@`, tab o retorno de carro (CR) puede ejecutarse como fórmula
 * al abrir el archivo en Excel / Google Sheets. Se le antepone una comilla
 * simple (`'`) para forzar que la aplicación la trate como texto plano.
 */
const sanitizeCell = (value: unknown): string => {
  const str = value === null || value === undefined ? '' : String(value)
  return /^[=+\-@\t\r]/.test(str) ? `'${str}` : str
}

/**
 * Devuelve un campo CSV seguro y consistente: primero neutraliza fórmulas y
 * luego lo envuelve en comillas dobles, duplicando las comillas internas
 * (`"` -> `""`). Se aplica a TODAS las columnas para un escapado uniforme.
 */
const csvField = (value: unknown): string => `"${sanitizeCell(value).replace(/"/g, '""')}"`

export const ExportExcelButton: React.FC<ExportExcelButtonProps> = ({ records, filename = 'reporte_horas_mooving.csv' }) => {
  const handleExport = () => {
    if (records.length === 0) return

    // UTF-8 BOM for Excel compatibility with special characters in Spanish
    const BOM = '\uFEFF'
    const headers = ['Fecha', 'Empleado ID', 'Empleado', 'Cliente', 'Proyecto', 'Tipo de Trabajo', 'Horas Decim.', 'Facturable', 'Descripción', 'Fuente']

    const rows = records.map(r => [
      r.date,
      r.employee_id || '',
      r.employee_name || '',
      r.client_name || '',
      r.project_name || '',
      r.work_type,
      (r.duration_decimal || 0).toFixed(2),
      (r.is_billable === 1 || r.is_billable === true || (r.is_billable === undefined && r.work_type === 'project')) ? 'Sí' : 'No',
      r.description || '',
      r.source || 'manual'
    ].map(csvField))

    const csvContent = BOM + [headers.map(csvField).join(','), ...rows.map(row => row.join(','))].join('\n')
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
      title="Exportar registros del período a CSV"
    >
      <FileSpreadsheet className="w-4 h-4" />
      <span>Exportar a CSV</span>
    </button>
  )
}
