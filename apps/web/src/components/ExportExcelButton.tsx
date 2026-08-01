/**
 * Export Excel Button Component (Epic 5 - Exportación a Excel)
 * Generates and downloads the full filtered time records as a native .xlsx
 * workbook (SheetJS). The library is loaded on demand via dynamic import so it
 * ships in its own chunk and never inflates the initial bundle. Text cells are
 * still protected against formula injection (also exploitable in Excel).
 */

import React from 'react'
import { TimeRecord } from '../types'
import { FileSpreadsheet } from 'lucide-react'

interface ExportExcelButtonProps {
  records: TimeRecord[]
  filename?: string
}

/**
 * Neutraliza la inyección de fórmulas: una celda de texto cuyo contenido
 * empieza con `=`, `+`, `-`, `@`, tab o retorno de carro (CR) puede
 * interpretarse como fórmula al abrir/copiar el archivo en Excel o Google
 * Sheets (aplica también a .xlsx, no solo a CSV). Se le antepone una comilla
 * simple (`'`) para forzar que la aplicación la trate como texto plano.
 */
const sanitizeCell = (value: unknown): string => {
  const str = value === null || value === undefined ? '' : String(value)
  return /^[=+\-@\t\r]/.test(str) ? `'${str}` : str
}

/** Anchos de columna (en caracteres) para la hoja "Registros". */
const COLUMN_WIDTHS = [
  { wch: 12 }, // Fecha
  { wch: 22 }, // Empleado
  { wch: 22 }, // Cliente
  { wch: 26 }, // Proyecto
  { wch: 12 }, // Tipo
  { wch: 8 },  // Horas
  { wch: 42 }, // Descripción
  { wch: 10 }, // Fuente
  { wch: 11 }, // Facturable
]

export const ExportExcelButton: React.FC<ExportExcelButtonProps> = ({ records, filename = 'reporte_horas_mooving.xlsx' }) => {
  const handleExport = async () => {
    if (records.length === 0) return

    // Import dinámico: SheetJS queda en un chunk separado que el navegador
    // descarga recién al primer click de exportación.
    const XLSX = await import('xlsx')

    const headers = ['Fecha', 'Empleado', 'Cliente', 'Proyecto', 'Tipo', 'Horas', 'Descripción', 'Fuente', 'Facturable']

    const rows: (string | number)[][] = records.map(r => [
      sanitizeCell(r.date),
      sanitizeCell(r.employee_name || ''),
      sanitizeCell(r.client_name || ''),
      sanitizeCell(r.project_name || ''),
      sanitizeCell(r.work_type),
      // Horas como número real (no string) para que Excel pueda sumar/filtrar
      Math.round((r.duration_decimal || 0) * 100) / 100,
      sanitizeCell(r.description || ''),
      sanitizeCell(r.source || 'manual'),
      (r.is_billable === 1 || r.is_billable === true || (r.is_billable === undefined && r.work_type === 'project')) ? 'Sí' : 'No'
    ])

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
    ws['!cols'] = COLUMN_WIDTHS

    // Formato numérico de dos decimales para la columna Horas (índice 5)
    for (let i = 0; i < rows.length; i++) {
      const cell = ws[XLSX.utils.encode_cell({ r: i + 1, c: 5 })]
      if (cell && cell.t === 'n') cell.z = '0.00'
    }

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Registros')
    XLSX.writeFile(wb, filename)
  }

  return (
    <button
      onClick={handleExport}
      disabled={records.length === 0}
      className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-lg shadow-sm transition text-sm disabled:opacity-50"
      title="Exportar registros del período a Excel (.xlsx)"
    >
      <FileSpreadsheet className="w-4 h-4" />
      <span>Exportar a Excel</span>
    </button>
  )
}
