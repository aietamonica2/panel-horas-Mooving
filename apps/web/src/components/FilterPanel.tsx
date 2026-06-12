/**
 * Filter Panel Component
 * Provides month and category filtering controls
 */

import React from 'react'

interface FilterPanelProps {
  selectedMonth: string
  selectedCategories: string[]
  availableMonths: string[]
  categories: string[]
  onMonthChange: (month: string) => void
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
  selectedMonth,
  selectedCategories,
  availableMonths,
  categories,
  onMonthChange,
  onCategoriesChange,
  onReset,
}) => {
  const handleCategoryToggle = (category: string) => {
    const updated = selectedCategories.includes(category)
      ? selectedCategories.filter(c => c !== category)
      : [...selectedCategories, category]
    onCategoriesChange(updated)
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6 mb-8" style={{ borderLeft: '4px solid #f97316' }}>
      <h2 className="text-xl font-semibold mb-6" style={{ color: '#1a5f7a' }}>
        🔍 Filtros
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Month Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📅 Mes
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => onMonthChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los meses</option>
            {availableMonths.map((month) => (
              <option key={month} value={month}>
                {MONTHS_ES[month as keyof typeof MONTHS_ES] || month}
              </option>
            ))}
          </select>
        </div>

        {/* Category Filter */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📂 Categorías
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryToggle(category)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  selectedCategories.includes(category)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {category === 'project' && '🏢 Proyectos'}
                {category === 'internal' && '⚙️ Internas'}
                {category === 'meeting' && '👥 Reuniones'}
              </button>
            ))}
          </div>
        </div>

        {/* Reset Button */}
        <div className="flex items-end">
          <button
            onClick={onReset}
            className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition"
          >
            🔄 Resetear
          </button>
        </div>
      </div>
    </div>
  )
}
