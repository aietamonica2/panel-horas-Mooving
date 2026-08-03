import { describe, it, expect, beforeEach } from 'vitest'
import { useDataStore, applyFilters, createInitialFilters, DEFAULT_WORK_TYPES } from './dataStore'
import { FilterState, TimeRecord } from '../types'

const mockRecords: TimeRecord[] = [
  {
    id: '1',
    tenant_id: 'default',
    employee_id: 'emp1',
    employee_name: 'Monica',
    client_id: 'cli1',
    client_name: 'YPF',
    project_id: 'proj1',
    project_name: 'YPF Portal',
    duration_decimal: 8.0,
    duration_hours: 8,
    duration_minutes: 0,
    date: '2026-05-10',
    work_type: 'project',
    description: 'Working on portal',
    created_at: '',
    updated_at: '',
    source: 'clockify'
  },
  {
    id: '2',
    tenant_id: 'default',
    employee_id: 'emp2',
    employee_name: 'Federico',
    client_id: 'cli2',
    client_name: 'Mooving',
    project_id: 'proj2',
    project_name: 'Mooving Dash',
    duration_decimal: 4.0,
    duration_hours: 4,
    duration_minutes: 0,
    date: '2026-06-15',
    work_type: 'project',
    description: 'Working on dashboard',
    created_at: '',
    updated_at: ''
    // sin `source` a propósito: debe tratarse como 'manual'
  },
  {
    id: '3',
    tenant_id: 'default',
    employee_id: 'emp3',
    employee_name: 'Carla',
    client_id: 'cli3',
    client_name: 'Senda',
    project_id: 'proj3',
    project_name: 'Senda Bot',
    duration_decimal: 2.5,
    duration_hours: 2,
    duration_minutes: 30,
    date: '2026-07-20',
    work_type: 'internal',
    description: 'AI logged hours',
    created_at: '',
    updated_at: '',
    source: 'senda_ai'
  }
]

// Baseline sin NINGÚN filtro activo (workTypes: [] ⇒ sin filtro por categoría),
// equivalente al estado que usaban estos tests antes de la consolidación B7.
const emptyFilters = (): FilterState => ({
  dateRangeStart: '',
  dateRangeEnd: '',
  employees: [],
  clients: [],
  projects: [],
  workTypes: [],
  months: [],
  sources: []
})

describe('dataStore Filters', () => {
  beforeEach(() => {
    useDataStore.setState({
      records: mockRecords,
      filters: emptyFilters()
    })
  })

  it('filters records by employee', () => {
    useDataStore.getState().setFilters({ employees: ['emp1'] })
    const filtered = useDataStore.getState().getFilteredRecords()
    expect(filtered).toHaveLength(1)
    expect(filtered[0].employee_id).toBe('emp1')
  })

  it('filters records by client', () => {
    useDataStore.getState().setFilters({ clients: ['cli2'] })
    const filtered = useDataStore.getState().getFilteredRecords()
    expect(filtered).toHaveLength(1)
    expect(filtered[0].client_id).toBe('cli2')
  })

  it('filters records by month', () => {
    useDataStore.getState().setFilters({ months: ['06'] })
    const filtered = useDataStore.getState().getFilteredRecords()
    expect(filtered).toHaveLength(1)
    expect(filtered[0].date).toContain('-06-')
  })

  it('filters records by project', () => {
    useDataStore.getState().setFilters({ projects: ['proj1'] })
    const filtered = useDataStore.getState().getFilteredRecords()
    expect(filtered).toHaveLength(1)
    expect(filtered[0].project_id).toBe('proj1')
  })

  describe('source filter (filters.sources)', () => {
    it('returns all records when no source is selected', () => {
      const filtered = useDataStore.getState().getFilteredRecords()
      expect(filtered).toHaveLength(3)
    })

    it('filters records by a single source', () => {
      useDataStore.getState().setFilters({ sources: ['clockify'] })
      const filtered = useDataStore.getState().getFilteredRecords()
      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe('1')
      expect(filtered[0].source).toBe('clockify')
    })

    it('filters records by multiple sources', () => {
      useDataStore.getState().setFilters({ sources: ['clockify', 'senda_ai'] })
      const filtered = useDataStore.getState().getFilteredRecords()
      expect(filtered).toHaveLength(2)
      expect(filtered.map(r => r.id).sort()).toEqual(['1', '3'])
    })

    it('treats records without source as manual', () => {
      useDataStore.getState().setFilters({ sources: ['manual'] })
      const filtered = useDataStore.getState().getFilteredRecords()
      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe('2')
    })

    it('returns no records for a source with no matches', () => {
      useDataStore.getState().setFilters({ sources: ['zendesk'] })
      const filtered = useDataStore.getState().getFilteredRecords()
      expect(filtered).toHaveLength(0)
    })

    it('combines source filter with other filters', () => {
      useDataStore.getState().setFilters({ employees: ['emp1'] })
      useDataStore.getState().setFilters({ sources: ['clockify'] })
      expect(useDataStore.getState().getFilteredRecords()).toHaveLength(1)

      // emp1 tiene source clockify, así que filtrar emp1 + manual no matchea nada
      useDataStore.getState().setFilters({ sources: ['manual'] })
      expect(useDataStore.getState().getFilteredRecords()).toHaveLength(0)
    })

    it('clearFilters resets the sources filter', () => {
      useDataStore.getState().setFilters({ sources: ['clockify'] })
      expect(useDataStore.getState().getFilteredRecords()).toHaveLength(1)

      useDataStore.getState().clearFilters()
      expect(useDataStore.getState().filters.sources).toEqual([])
      expect(useDataStore.getState().getFilteredRecords()).toHaveLength(3)
    })
  })

  // B7: cobertura del estado consolidado — todos los filtros viven en filters
  describe('consolidated filter state (B7)', () => {
    it('filters records by work type (categorías)', () => {
      useDataStore.getState().setFilters({ workTypes: ['internal'] })
      const filtered = useDataStore.getState().getFilteredRecords()
      expect(filtered).toHaveLength(1)
      expect(filtered[0].work_type).toBe('internal')
    })

    it('empty workTypes means no category filtering (legacy quirk preserved)', () => {
      useDataStore.getState().setFilters({ workTypes: [] })
      expect(useDataStore.getState().getFilteredRecords()).toHaveLength(3)
    })

    it('filters records by date range (start and end inclusive)', () => {
      useDataStore.getState().setFilters({ dateRangeStart: '2026-06-01' })
      expect(useDataStore.getState().getFilteredRecords().map(r => r.id).sort()).toEqual(['2', '3'])

      useDataStore.getState().setFilters({ dateRangeEnd: '2026-06-15' })
      const filtered = useDataStore.getState().getFilteredRecords()
      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe('2')
    })

    it('filters records by full month key YYYY-MM', () => {
      useDataStore.getState().setFilters({ months: ['2026-05'] })
      const filtered = useDataStore.getState().getFilteredRecords()
      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe('1')
    })

    it('setFilters merges partially without clobbering other filters', () => {
      useDataStore.getState().setFilters({ employees: ['emp1', 'emp2'] })
      useDataStore.getState().setFilters({ months: ['2026-05', '2026-06'] })
      const { filters } = useDataStore.getState()
      expect(filters.employees).toEqual(['emp1', 'emp2'])
      expect(filters.months).toEqual(['2026-05', '2026-06'])
      expect(useDataStore.getState().getFilteredRecords().map(r => r.id).sort()).toEqual(['1', '2'])
    })

    it('clearFilters restores the full initial filter state (workTypes back to default)', () => {
      useDataStore.getState().setFilters({
        employees: ['emp1'],
        clients: ['cli1'],
        projects: ['proj1'],
        months: ['2026-05'],
        workTypes: ['internal'],
        sources: ['clockify'],
        dateRangeStart: '2026-01-01',
        dateRangeEnd: '2026-12-31'
      })
      useDataStore.getState().clearFilters()

      const { filters } = useDataStore.getState()
      expect(filters).toEqual(createInitialFilters())
      expect(filters.workTypes).toEqual(DEFAULT_WORK_TYPES)
      // Con el default (todas las categorías seleccionadas) no se excluye ningún registro
      expect(useDataStore.getState().getFilteredRecords()).toHaveLength(3)
    })

    it('default workTypes includes every known category', () => {
      expect(DEFAULT_WORK_TYPES).toEqual(['project', 'internal', 'meeting', 'training', 'other'])
      // createInitialFilters devuelve copias frescas (sin aliasing mutable)
      const a = createInitialFilters()
      const b = createInitialFilters()
      expect(a.workTypes).toEqual(b.workTypes)
      expect(a.workTypes).not.toBe(b.workTypes)
    })

    it('applyFilters is the single shared implementation used by getFilteredRecords', () => {
      const filters: FilterState = { ...emptyFilters(), employees: ['emp3'], sources: ['senda_ai'] }
      // Función pura: mismo resultado con los mismos inputs, sin tocar el store
      const pure = applyFilters(mockRecords, filters)
      expect(pure.map(r => r.id)).toEqual(['3'])

      useDataStore.getState().setFilters({ employees: ['emp3'], sources: ['senda_ai'] })
      expect(useDataStore.getState().getFilteredRecords()).toEqual(pure)
      // No muta el array original
      expect(mockRecords).toHaveLength(3)
    })
  })
})
