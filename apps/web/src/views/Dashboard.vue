<template>
  <div class="space-y-8">
    <!-- Filters Section -->
    <section class="card p-6">
      <h2 class="text-lg font-semibold text-slate-900 mb-4">🎛️ Filtros</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">Meses</label>
          <select 
            v-model="selectedMonths" 
            multiple 
            class="w-full border border-slate-300 rounded-lg p-2"
          >
            <option 
              v-for="month in availableMonths" 
              :key="month"
              :value="month"
            >
              {{ getMonthName(month) }}
            </option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">Categorías</label>
          <select 
            v-model="selectedCategories" 
            multiple 
            class="w-full border border-slate-300 rounded-lg p-2"
          >
            <option 
              v-for="cat in availableCategories" 
              :key="cat"
              :value="cat"
            >
              {{ cat }}
            </option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">Usuario</label>
          <select 
            v-model="selectedUser" 
            class="w-full border border-slate-300 rounded-lg p-2"
          >
            <option value="">Todos</option>
            <option 
              v-for="user in availableUsers" 
              :key="user"
              :value="user"
            >
              {{ user }}
            </option>
          </select>
        </div>

        <div class="flex items-end gap-2">
          <button 
            @click="applyFilters" 
            class="btn-primary w-full"
          >
            Aplicar Filtros
          </button>
        </div>
      </div>

      <!-- CSV Upload -->
      <div class="mt-4 pt-4 border-t border-slate-200">
        <label class="block text-sm font-medium text-slate-700 mb-2">
          📤 Cargar CSV
        </label>
        <input 
          type="file" 
          accept=".csv" 
          @change="handleFileUpload"
          class="block w-full text-sm text-slate-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-lg file:border-0
            file:text-sm file:font-semibold
            file:bg-indigo-600 file:text-white
            hover:file:bg-indigo-700"
        />
      </div>
    </section>

    <!-- Status Message -->
    <div 
      v-if="uploadStatus" 
      :class="[
        'card p-4 border-l-4',
        uploadStatus.type === 'success' 
          ? 'border-l-green-500 bg-green-50' 
          : 'border-l-red-500 bg-red-50'
      ]"
    >
      <p :class="uploadStatus.type === 'success' ? 'text-green-700' : 'text-red-700'">
        {{ uploadStatus.message }}
      </p>
    </div>

    <!-- Metrics -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="card p-6">
        <div class="text-sm font-medium text-slate-600">Total Horas</div>
        <div class="text-3xl font-bold text-indigo-600 mt-2">
          {{ metrics.totalHours.toFixed(1) }}h
        </div>
      </div>

      <div class="card p-6">
        <div class="text-sm font-medium text-slate-600">Promedio Diario</div>
        <div class="text-3xl font-bold text-orange-500 mt-2">
          {{ metrics.avgDaily.toFixed(1) }}h
        </div>
      </div>

      <div class="card p-6">
        <div class="text-sm font-medium text-slate-600">Usuarios Activos</div>
        <div class="text-3xl font-bold text-pink-600 mt-2">
          {{ metrics.activeUsers }}
        </div>
      </div>

      <div class="card p-6">
        <div class="text-sm font-medium text-slate-600">Clientes Únicos</div>
        <div class="text-3xl font-bold text-green-600 mt-2">
          {{ metrics.totalClients }}
        </div>
      </div>
    </div>

    <!-- Tables and Charts will go here -->
    <div class="card p-6">
      <h2 class="text-lg font-semibold text-slate-900 mb-4">📊 Data loaded and ready for visualization</h2>
      <p class="text-slate-600">Filtered records: {{ filteredRecords.length }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDataStore } from '@/stores/dataStore'
import { useDataProcessing } from '@/composables/useDataProcessing'
import { MONTH_NAMES } from '@/utils/constants'
import type { TimeRecord } from '@/types'

const store = useDataStore()
const { metrics } = useDataProcessing()

const selectedMonths = ref<string[]>([])
const selectedCategories = ref<string[]>([])
const selectedUser = ref<string>('')
const uploadStatus = ref<{ type: 'success' | 'error'; message: string } | null>(null)

const availableMonths = computed(() => store.availableMonths)
const availableCategories = computed(() => store.availableCategories)
const availableUsers = computed(() => store.availableUsers)
const filteredRecords = computed(() => store.filteredRecords)

const getMonthName = (month: string): string => {
  return MONTH_NAMES[parseInt(month)] || month
}

const applyFilters = () => {
  store.setSelectedMonths(selectedMonths.value)
  store.setSelectedCategories(selectedCategories.value)
  store.setSelectedUser(selectedUser.value)
}

const handleFileUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) return

  try {
    const text = await file.text()
    const lines = text.trim().split('\n')
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))

    const records: TimeRecord[] = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
      const obj: any = {}

      headers.forEach((h, i) => {
        obj[h] = values[i] || ''
      })

      // Convert numeric field
      if (obj['Duración (decimal)']) {
        obj['duracion_decimal'] = parseFloat(obj['Duración (decimal)']) || 0
        delete obj['Duración (decimal)']
      }

      // Normalize field names to camelCase
      return {
        proyecto: obj['Proyecto'] || obj.proyecto,
        cliente: obj['Cliente'] || obj.cliente,
        usuario: obj['Usuario'] || obj.usuario,
        duracion_decimal: obj.duracion_decimal || parseFloat(obj['duracion_decimal']) || 0,
        fecha_inicio: obj['Fecha de inicio'] || obj.fecha_inicio,
        grupo: obj['Grupo'] || obj.grupo,
      } as TimeRecord
    })

    store.loadRecords(records)
    uploadStatus.value = {
      type: 'success',
      message: `✅ Archivo cargado exitosamente: ${records.length} registros`,
    }

    setTimeout(() => {
      uploadStatus.value = null
    }, 5000)

    input.value = ''
  } catch (error) {
    uploadStatus.value = {
      type: 'error',
      message: `❌ Error al procesar archivo: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}
</script>
