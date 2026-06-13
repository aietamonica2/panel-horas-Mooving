/**
 * Filter Panel Component
 * Provides month, client, employee, and project filtering controls with nested/reactive selections
 */

import React, { useMemo } from 'react'
import { TimeRecord } from '../types'
import { MultiSelectDropdown } from './MultiSelectDropdown'

interface FilterPanelProps {
  records: TimeRecord[]
  selectedMonths: string[]
  selectedEmployees: string[]
  selectedClients: string[]
  selectedProjects: string[]
  selectedCategories: string[]
  onMonthsChange: (months: string[]) => void
  onEmployeesChange: (employees: string[]) => void
  onClientsChange: (clients: string[]) => void
  onProjectsChange: (projects: string[]) => void
  onCategoriesChange: (categories: string[]) => void
  onReset: () => void
}

const MONTHS_ES = {
  '01': 'Enero',
  '02': 'Febrero',
  '03': 'Marzo',
  '04': 'Abril',
  '05': 'Mayo',
  '06': 'Junio',
  '07': 'Julio',
  '08': 'Agosto',
  '09': 'Septiembre',
  '10': 'Octubre',
  '11': 'Noviembre',
  '12': 'Diciembre',
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  records,
  selectedMonths,
  selectedEmployees,
  selectedClients,
  selectedProjects,
  selectedCategories,
  onMonthsChange,
  onEmployeesChange,
  onClientsChange,
  onProjectsChange,
  onCategoriesChange,
  onReset,
}) => {
  // Category toggle helper
  const handleCategoryToggle = (category: string) => {
    const updated = selectedCategories.includes(category)
      ? selectedCategories.filter(c => c !== category)
      : [...selectedCategories, category]
    onCategoriesChange(updated)
  }

  // Reactive selection logic for nested selections:
  
  // 1. Available Months: filtered by selected employees, selected clients, and selected projects
  const availableMonthsOptions = useMemo(() => {
    let filtered = records
    if (selectedEmployees.length > 0) {
      filtered = filtered.filter(r => selectedEmployees.includes(r.employee_id))
    }
    if (selectedClients.length > 0) {
      filtered = filtered.filter(r => selectedClients.includes(r.client_id))
    }
    if (selectedProjects.length > 0) {
      filtered = filtered.filter(r => selectedProjects.includes(r.project_id))
    }

    const uniqueMonths = Array.from(new Set(filtered.map(r => r.date.substring(5, 7)))).sort()
    return uniqueMonths.map(month => ({
      id: month,
      name: MONTHS_ES[month as keyof typeof MONTHS_ES] || month
    }))
  }, [records, selectedEmployees, selectedClients, selectedProjects])

  // 2. Available Clients: filtered by selected months, selected employees, and selected projects
  const availableClientsOptions = useMemo(() => {
    let filtered = records
    if (selectedMonths.length > 0) {
      filtered = filtered.filter(r => selectedMonths.includes(r.date.substring(5, 7)))
    }
    if (selectedEmployees.length > 0) {
      filtered = filtered.filter(r => selectedEmployees.includes(r.employee_id))
    }
    if (selectedProjects.length > 0) {
      filtered = filtered.filter(r => selectedProjects.includes(r.project_id))
    }

    const clientMap = new Map<string, string>()
    filtered.forEach(r => {
      if (r.client_id) {
        clientMap.set(r.client_id, r.client_name || r.client_id)
      }
    })
    return Array.from(clientMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [records, selectedMonths, selectedEmployees, selectedProjects])

  // 3. Available Employees: filtered by selected months, selected clients, and selected projects
  const availableEmployeesOptions = useMemo(() => {
    let filtered = records
    if (selectedMonths.length > 0) {
      filtered = filtered.filter(r => selectedMonths.includes(r.date.substring(5, 7)))
    }
    if (selectedClients.length > 0) {
      filtered = filtered.filter(r => selectedClients.includes(r.client_id))
    }
    if (selectedProjects.length > 0) {
      filtered = filtered.filter(r => selectedProjects.includes(r.project_id))
    }

    const employeeMap = new Map<string, string>()
    filtered.forEach(r => {
      if (r.employee_id) {
        employeeMap.set(r.employee_id, r.employee_name || r.employee_id)
      }
    })
    return Array.from(employeeMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [records, selectedMonths, selectedClients, selectedProjects])

  // 4. Available Projects: filtered by selected months, selected employees, and selected clients
  const availableProjectsOptions = useMemo(() => {
    let filtered = records
    if (selectedMonths.length > 0) {
      filtered = filtered.filter(r => selectedMonths.includes(r.date.substring(5, 7)))
    }
    if (selectedEmployees.length > 0) {
      filtered = filtered.filter(r => selectedEmployees.includes(r.employee_id))
    }
    if (selectedClients.length > 0) {
      filtered = filtered.filter(r => selectedClients.includes(r.client_id))
    }

    const projectMap = new Map<string, string>()
    filtered.forEach(r => {
      if (r.project_id) {
        projectMap.set(r.project_id, r.project_name || r.project_id)
      }
    })
    return Array.from(projectMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [records, selectedMonths, selectedEmployees, selectedClients])

  // Unique categories helper (always extracted from full records)
  const categoriesList = useMemo(() => {
    return Array.from(new Set(records.map(r => r.work_type))).filter(Boolean)
  }, [records])

  return (
    <div className="bg-white rounded-xl shadow-md p-6 mb-8" style={{ borderLeft: '4px solid #f97316' }}>
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2" style={{ color: '#1a5f7a' }}>
        🔍 Filtros Anidados Reactivos
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* Month Filter */}
        <MultiSelectDropdown
          label="📅 Meses"
          options={availableMonthsOptions}
          selectedValues={selectedMonths}
          onChange={onMonthsChange}
          placeholder="Todos los meses"
        />

        {/* Client Filter */}
        <MultiSelectDropdown
          label="🏢 Clientes"
          options={availableClientsOptions}
          selectedValues={selectedClients}
          onChange={onClientsChange}
          placeholder="Todos los clientes"
          showSearch
        />

        {/* Employee Filter */}
        <MultiSelectDropdown
          label="👥 Empleados"
          options={availableEmployeesOptions}
          selectedValues={selectedEmployees}
          onChange={onEmployeesChange}
          placeholder="Todos los empleados"
          showSearch
        />

        {/* Project Filter */}
        <MultiSelectDropdown
          label="📂 Proyectos"
          options={availableProjectsOptions}
          selectedValues={selectedProjects}
          onChange={onProjectsChange}
          placeholder="Todos los proyectos"
          showSearch
        />

        {/* Category Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 font-semibold">
            📂 Categorías
          </label>
          <div className="flex flex-wrap gap-1.5">
            {categoriesList.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => handleCategoryToggle(category)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  selectedCategories.includes(category)
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {category === 'project' && '🏢 Proyectos'}
                {category === 'internal' && '⚙️ Internas'}
                {category === 'meeting' && '👥 Reuniones'}
                {category === 'training' && '📚 Formación'}
                {category === 'other' && '🧩 Otras'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Reset Controls footer */}
      {(selectedMonths.length > 0 || selectedEmployees.length > 0 || selectedClients.length > 0 || selectedProjects.length > 0) && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={onReset}
            className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
          >
            🔄 Restablecer Filtros
          </button>
        </div>
      )}
    </div>
  )
}
