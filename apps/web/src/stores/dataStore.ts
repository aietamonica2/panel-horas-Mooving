import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { TimeRecord, FilteredData } from '@/types'

export const useDataStore = defineStore('data', () => {
  const allRecords = ref<TimeRecord[]>([])
  const selectedMonths = ref<string[]>([])
  const selectedCategories = ref<string[]>([])
  const selectedUser = ref<string>('')

  const availableMonths = computed(() => {
    const months = new Set(allRecords.value.map(r => r.fecha_inicio.split('/')[1]))
    return Array.from(months).sort((a, b) => parseInt(a) - parseInt(b))
  })

  const availableCategories = computed(() => {
    return Array.from(new Set(allRecords.value.map(r => r.cliente))).sort()
  })

  const availableUsers = computed(() => {
    return Array.from(new Set(allRecords.value.map(r => r.usuario))).sort()
  })

  const filteredRecords = computed(() => {
    const months = selectedMonths.value.length > 0 ? selectedMonths.value : availableMonths.value
    const categories = selectedCategories.value.length > 0 ? selectedCategories.value : availableCategories.value

    return allRecords.value.filter(r => {
      const m = r.fecha_inicio.split('/')[1]
      const c = r.cliente
      const u = r.usuario

      if (!months.includes(m)) return false
      if (!categories.includes(c)) return false
      if (selectedUser.value && u !== selectedUser.value) return false

      return true
    })
  })

  const loadRecords = (records: TimeRecord[]) => {
    allRecords.value = records
  }

  const setSelectedMonths = (months: string[]) => {
    selectedMonths.value = months
  }

  const setSelectedCategories = (categories: string[]) => {
    selectedCategories.value = categories
  }

  const setSelectedUser = (user: string) => {
    selectedUser.value = user
  }

  return {
    allRecords,
    filteredRecords,
    selectedMonths,
    selectedCategories,
    selectedUser,
    availableMonths,
    availableCategories,
    availableUsers,
    loadRecords,
    setSelectedMonths,
    setSelectedCategories,
    setSelectedUser,
  }
})
