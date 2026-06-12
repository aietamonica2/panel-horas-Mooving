import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDataStore } from '@/stores/dataStore'
import type { TimeRecord } from '@/types'

describe('useDataStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('loads records correctly', () => {
    const store = useDataStore()
    const mockRecords: TimeRecord[] = [
      {
        proyecto: 'Test',
        cliente: 'Client A',
        usuario: 'User 1',
        duracion_decimal: 8,
        fecha_inicio: '01/06/2026',
        grupo: 'internal',
      },
    ]

    store.loadRecords(mockRecords)
    expect(store.allRecords).toHaveLength(1)
    expect(store.allRecords[0].usuario).toBe('User 1')
  })

  it('filters records by month', () => {
    const store = useDataStore()
    const mockRecords: TimeRecord[] = [
      {
        proyecto: 'Test',
        cliente: 'Client A',
        usuario: 'User 1',
        duracion_decimal: 8,
        fecha_inicio: '01/01/2026',
        grupo: 'internal',
      },
      {
        proyecto: 'Test',
        cliente: 'Client A',
        usuario: 'User 1',
        duracion_decimal: 8,
        fecha_inicio: '01/06/2026',
        grupo: 'internal',
      },
    ]

    store.loadRecords(mockRecords)
    store.setSelectedMonths(['06'])

    expect(store.filteredRecords).toHaveLength(1)
    expect(store.filteredRecords[0].fecha_inicio).toBe('01/06/2026')
  })
})
