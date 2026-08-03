/**
 * Zustand store for global application state
 * Manages time records, employees, clients, and filters
 *
 * B7: el estado de TODOS los filtros (meses, empleados, clientes, proyectos,
 * categorías, fuentes y rango de fechas) vive únicamente acá, en `filters`.
 * El Dashboard y el FilterPanel consumen y mutan este estado directo del store,
 * sin useState espejo ni useEffect de sincronización.
 */

import { create } from 'zustand'
import { AppState, TimeRecord, Employee, Client, FilterState } from '../types'
import { APP_VERSION } from '../version'

/**
 * B7: las categorías (work_type) arrancan TODAS seleccionadas — es la semántica
 * histórica de los chips del FilterPanel (deseleccionar un chip excluye esa
 * categoría). `clearFilters()` también restaura este default.
 * Nota: `workTypes: []` significa "sin filtro por categoría" (se muestran todos).
 */
export const DEFAULT_WORK_TYPES: string[] = ['project', 'internal', 'meeting', 'training', 'other']

export const createInitialFilters = (): FilterState => ({
  dateRangeStart: '',
  dateRangeEnd: '',
  employees: [],
  clients: [],
  projects: [],
  workTypes: [...DEFAULT_WORK_TYPES],
  months: [],
  sources: [],
})

const initialState: AppState = {
  records: [],
  employees: [],
  clients: [],
  filters: createInitialFilters(),
  isLoading: false,
  error: null,
  version: APP_VERSION,
}

/**
 * Fuente efectiva de un registro para filtrado.
 * Los registros sin `source` (o con source vacío) se tratan como 'manual'.
 */
export const getRecordSource = (record: TimeRecord): string => record.source || 'manual'

/**
 * B7: ÚNICA implementación del filtrado de registros. Función pura para que
 * tanto `getFilteredRecords()` del store como cualquier memo de componente
 * (p.ej. el useMemo del Dashboard) compartan exactamente la misma lógica.
 */
export const applyFilters = (records: TimeRecord[], filters: FilterState): TimeRecord[] => {
  let filtered = records

  if (filters.employees.length > 0) {
    filtered = filtered.filter(r => filters.employees.includes(r.employee_id))
  }
  if (filters.clients.length > 0) {
    filtered = filtered.filter(r => filters.clients.includes(r.client_id))
  }
  if (filters.projects.length > 0) {
    filtered = filtered.filter(r => filters.projects.includes(r.project_id))
  }
  if (filters.months.length > 0) {
    // Acepta claves 'YYYY-MM' (FilterPanel) y 'MM' (legado)
    filtered = filtered.filter(r =>
      filters.months.includes(r.date.substring(0, 7)) ||
      filters.months.includes(r.date.substring(5, 7))
    )
  }
  if (filters.workTypes.length > 0) {
    filtered = filtered.filter(r => filters.workTypes.includes(r.work_type))
  }
  if (filters.sources.length > 0) {
    filtered = filtered.filter(r => filters.sources.includes(getRecordSource(r)))
  }
  if (filters.dateRangeStart) {
    filtered = filtered.filter(r => r.date >= filters.dateRangeStart)
  }
  if (filters.dateRangeEnd) {
    filtered = filtered.filter(r => r.date <= filters.dateRangeEnd)
  }

  return filtered
}

export const useDataStore = create<AppState & {
  setRecords: (records: TimeRecord[]) => void
  setEmployees: (employees: Employee[]) => void
  setClients: (clients: Client[]) => void
  /** Setter único de filtros: merge parcial sobre `filters` (no pisa el resto). */
  setFilters: (filters: Partial<FilterState>) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  /** Restaura TODOS los filtros al estado inicial (workTypes vuelve al default all-selected). */
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

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  clearFilters: () => set({ filters: createInitialFilters() }),

  getFilteredRecords: () => applyFilters(get().records, get().filters),
}))
