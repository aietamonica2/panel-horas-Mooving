/**
 * Zustand store for global application state
 * Manages time records, employees, clients, and filters
 */

import { create } from 'zustand'
import { AppState, TimeRecord, Employee, Client, FilterState } from '../types'
import { APP_VERSION } from '../version'

const initialState: AppState = {
  records: [],
  employees: [],
  clients: [],
  filters: {
    dateRangeStart: '',
    dateRangeEnd: '',
    employees: [],
    clients: [],
    projects: [],
    workTypes: [],
    months: [],
  },
  selectedSources: [],
  isLoading: false,
  error: null,
  version: APP_VERSION,
}

/**
 * Fuente efectiva de un registro para filtrado.
 * Los registros sin `source` (o con source vacío) se tratan como 'manual'.
 */
export const getRecordSource = (record: TimeRecord): string => record.source || 'manual'

export const useDataStore = create<AppState & {
  setRecords: (records: TimeRecord[]) => void
  setEmployees: (employees: Employee[]) => void
  setClients: (clients: Client[]) => void
  setFilters: (filters: Partial<FilterState>) => void
  setSelectedSources: (sources: string[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearFilters: () => void
  getFilteredRecords: () => TimeRecord[]
}>((set, get) => ({
  ...initialState,

  setRecords: (records) => set({ records }),
  setEmployees: (employees) => set({ employees }),
  setClients: (clients) => set({ clients }),
  
  setFilters: (filters) => set((state) => ({
    filters: { ...state.filters, ...filters }
  })),

  setSelectedSources: (selectedSources) => set({ selectedSources }),

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  clearFilters: () => set({ filters: initialState.filters, selectedSources: [] }),

  getFilteredRecords: () => {
    const state = get()
    let filtered = state.records

    if (state.filters.employees.length > 0) {
      filtered = filtered.filter(r => state.filters.employees.includes(r.employee_id))
    }
    if (state.filters.clients.length > 0) {
      filtered = filtered.filter(r => state.filters.clients.includes(r.client_id))
    }
    if (state.filters.projects.length > 0) {
      filtered = filtered.filter(r => state.filters.projects.includes(r.project_id))
    }
    if (state.filters.months.length > 0) {
      filtered = filtered.filter(r => 
        state.filters.months.includes(r.date.substring(0, 7)) || 
        state.filters.months.includes(r.date.substring(5, 7))
      )
    }
    if (state.filters.workTypes.length > 0) {
      filtered = filtered.filter(r => state.filters.workTypes.includes(r.work_type))
    }
    if (state.selectedSources.length > 0) {
      filtered = filtered.filter(r => state.selectedSources.includes(getRecordSource(r)))
    }
    if (state.filters.dateRangeStart) {
      filtered = filtered.filter(r => r.date >= state.filters.dateRangeStart)
    }
    if (state.filters.dateRangeEnd) {
      filtered = filtered.filter(r => r.date <= state.filters.dateRangeEnd)
    }

    return filtered
  },
}))
