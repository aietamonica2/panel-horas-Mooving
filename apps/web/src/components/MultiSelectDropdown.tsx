import React, { useState, useRef, useEffect } from 'react'

interface Option {
  id: string
  name: string
}

interface MultiSelectDropdownProps {
  label: string
  options: Option[]
  selectedValues: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  showSearch?: boolean
}

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  label,
  options,
  selectedValues,
  onChange,
  placeholder = 'Seleccionar...',
  showSearch = false,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredOptions = options.filter(option =>
    option.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleToggleOption = (value: string) => {
    const updated = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value]
    onChange(updated)
  }

  const handleSelectAll = () => {
    onChange(options.map(o => o.id))
  }

  const handleClearAll = () => {
    onChange([])
  }

  const getDisplayText = () => {
    if (selectedValues.length === 0) return placeholder
    if (selectedValues.length === options.length) return 'Todos'
    if (selectedValues.length <= 2) {
      return options
        .filter(o => selectedValues.includes(o.id))
        .map(o => o.name)
        .join(', ')
    }
    return `${selectedValues.length} seleccionados`
  }

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-sm font-medium text-gray-700 mb-2 font-semibold">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 flex justify-between items-center text-sm text-gray-700 hover:bg-gray-50 transition"
      >
        <span className="truncate">{getDisplayText()}</span>
        <span className="text-gray-400 text-xs ml-2">▼</span>
      </button>

      {isOpen && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto p-2">
          {showSearch && (
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar..."
              className="w-full border border-gray-300 rounded-md px-2 py-1 mb-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-gray-50 text-gray-800"
            />
          )}
          
          <div className="flex justify-between border-b border-gray-100 pb-2 mb-2 text-xs font-semibold text-indigo-700 px-1">
            <button type="button" onClick={handleSelectAll} className="hover:underline">Todos</button>
            <button type="button" onClick={handleClearAll} className="hover:underline">Limpiar</button>
          </div>

          <div className="space-y-1">
            {filteredOptions.length === 0 ? (
              <div className="text-gray-400 text-xs text-center py-2">Sin opciones</div>
            ) : (
              filteredOptions.map(option => {
                const isChecked = selectedValues.includes(option.id)
                return (
                  <label
                    key={option.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 cursor-pointer text-xs transition text-gray-700 font-medium"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleOption(option.id)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="truncate">{option.name}</span>
                  </label>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
