import { computed } from 'vue'
import { useDataStore } from '@/stores/dataStore'
import { HOURS_PER_DAY, WORKING_DAYS_BY_MONTH, INTERNAL_TASKS_KEYWORDS, MEETING_KEYWORDS } from '@/utils/constants'
import type { DashboardMetrics, UserWorkload, AvailabilityRecord } from '@/types'

export const useDataProcessing = () => {
  const store = useDataStore()

  const metrics = computed((): DashboardMetrics => {
    const records = store.filteredRecords
    const totalHours = records.reduce((sum, r) => sum + r.duracion_decimal, 0)
    const uniqueDates = new Set(records.map(r => r.fecha_inicio))
    const avgDaily = uniqueDates.size > 0 ? totalHours / uniqueDates.size : 0
    const activeUsers = new Set(records.map(r => r.usuario)).size
    const totalClients = new Set(records.map(r => r.cliente)).size

    return { totalHours, avgDaily, activeUsers, totalClients }
  })

  const userWorkloads = computed((): UserWorkload[] => {
    const workloads = new Map<string, { total: number; byClient: Record<string, number> }>()

    store.filteredRecords.forEach(r => {
      if (!workloads.has(r.usuario)) {
        workloads.set(r.usuario, { total: 0, byClient: {} })
      }
      const data = workloads.get(r.usuario)!
      data.total += r.duracion_decimal
      data.byClient[r.cliente] = (data.byClient[r.cliente] || 0) + r.duracion_decimal
    })

    return Array.from(workloads.entries())
      .map(([usuario, data]) => ({
        usuario,
        totalHoras: data.total,
        distribucion: data.byClient,
      }))
      .sort((a, b) => b.totalHoras - a.totalHoras)
  })

  const availabilityByMonth = computed((): AvailabilityRecord[] => {
    const monthData = new Map<string, Record<string, number>>()

    store.filteredRecords.forEach(r => {
      const m = r.fecha_inicio.split('/')[1]
      const u = r.usuario
      const key = `${u}|${m}`

      if (!monthData.has(key)) {
        monthData.set(key, { registered: 0 })
      }
      monthData.get(key)!['registered'] += r.duracion_decimal
    })

    const result: AvailabilityRecord[] = []
    const users = new Set(store.filteredRecords.map(r => r.usuario))
    const months = new Set(store.filteredRecords.map(r => r.fecha_inicio.split('/')[1]))

    users.forEach(usuario => {
      months.forEach(mes => {
        const numMes = parseInt(mes)
        const horasEsperadas = (WORKING_DAYS_BY_MONTH[numMes as keyof typeof WORKING_DAYS_BY_MONTH] || 0) * HOURS_PER_DAY
        const key = `${usuario}|${mes}`
        const horasRegistradas = monthData.get(key)?.['registered'] || 0
        const tiempoLibre = Math.max(0, horasEsperadas - horasRegistradas)

        result.push({ usuario, mes, horasEsperadas, horasRegistradas, tiempoLibre })
      })
    })

    return result
  })

  const bagOfHours = computed(() => {
    const data = new Map<string, Record<string, { internal: number; meetings: number }>>()

    store.filteredRecords.forEach(r => {
      const key = `${r.usuario}|${r.fecha_inicio.split('/')[1]}`
      if (!data.has(key)) {
        data.set(key, { internal: 0, meetings: 0 })
      }

      const isInternal = INTERNAL_TASKS_KEYWORDS.some(kw => r.proyecto.includes(kw))
      const isMeeting = MEETING_KEYWORDS.some(kw => r.proyecto.includes(kw))

      if (isInternal) {
        data.get(key)!['internal'] += r.duracion_decimal
      } else if (isMeeting) {
        data.get(key)!['meetings'] += r.duracion_decimal
      }
    })

    return data
  })

  return {
    metrics,
    userWorkloads,
    availabilityByMonth,
    bagOfHours,
  }
}
