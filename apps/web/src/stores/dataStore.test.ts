import { describe, it, expect, beforeEach } from 'vitest'
import { useDataStore } from './dataStore'
import { TimeRecord } from '../types'

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

describe('dataStore Filters', () => {
  beforeEach(() => {
    useDataStore.setState({
      records: mockRecords,
      selectedSources: [],
      filters: {
        dateRangeStart: '',
        dateRangeEnd: '',
        employees: [],
        clients: [],
        projects: [],
        workTypes: [],
        months: []
      }
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

  describe('source filter (selectedSources)', () => {
    it('returns all records when no source is selected', () => {
      const filtered = useDataStore.getState().getFilteredRecords()
      expect(filtered).toHaveLength(3)
    })

    it('filters records by a single source', () => {
      useDataStore.getState().setSelectedSources(['clockify'])
      const filtered = useDataStore.getState().getFilteredRecords()
      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe('1')
      expect(filtered[0].source).toBe('clockify')
    })

    it('filters records by multiple sources', () => {
      useDataStore.getState().setSelectedSources(['clockify', 'senda_ai'])
      const filtered = useDataStore.getState().getFilteredRecords()
      expect(filtered).toHaveLength(2)
      expect(filtered.map(r => r.id).sort()).toEqual(['1', '3'])
    })

    it('treats records without source as manual', () => {
      useDataStore.getState().setSelectedSources(['manual'])
      const filtered = useDataStore.getState().getFilteredRecords()
      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe('2')
    })

    it('returns no records for a source with no matches', () => {
      useDataStore.getState().setSelectedSources(['zendesk'])
      const filtered = useDataStore.getState().getFilteredRecords()
      expect(filtered).toHaveLength(0)
    })

    it('combines source filter with other filters', () => {
      useDataStore.getState().setFilters({ employees: ['emp1'] })
      useDataStore.getState().setSelectedSources(['clockify'])
      expect(useDataStore.getState().getFilteredRecords()).toHaveLength(1)

      // emp1 tiene source clockify, así que filtrar emp1 + manual no matchea nada
      useDataStore.getState().setSelectedSources(['manual'])
      expect(useDataStore.getState().getFilteredRecords()).toHaveLength(0)
    })

    it('clearFilters resets selectedSources', () => {
      useDataStore.getState().setSelectedSources(['clockify'])
      expect(useDataStore.getState().getFilteredRecords()).toHaveLength(1)

      useDataStore.getState().clearFilters()
      expect(useDataStore.getState().selectedSources).toEqual([])
      expect(useDataStore.getState().getFilteredRecords()).toHaveLength(3)
    })
  })
})
