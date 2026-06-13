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
    updated_at: ''
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
  }
]

describe('dataStore Filters', () => {
  beforeEach(() => {
    useDataStore.setState({
      records: mockRecords,
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
})
