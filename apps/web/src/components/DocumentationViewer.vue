<template>
  <div class="fixed bottom-4 right-4 z-50">
    <!-- Floating Button -->
    <button
      @click="isOpen = !isOpen"
      class="w-14 h-14 bg-gradient-to-r from-indigo-600 to-pink-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center hover:scale-110"
      title="Documentación"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="w-7 h-7"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 6.253v13m0-13C6.5 6.253 2 10.998 2 17s4.5 10.747 10 10.747c5.5 0 10-4.998 10-10.747S17.5 6.253 12 6.253z"
        />
      </svg>
    </button>

    <!-- Panel Lateral -->
    <transition
      enter-active-class="transition-all duration-300"
      enter-from-class="opacity-0 translate-x-96"
      enter-to-class="opacity-100 translate-x-0"
      leave-active-class="transition-all duration-300"
      leave-from-class="opacity-100 translate-x-0"
      leave-to-class="opacity-0 translate-x-96"
    >
      <div
        v-if="isOpen"
        class="fixed bottom-0 right-0 w-96 h-screen bg-white shadow-2xl border-l border-slate-200 flex flex-col"
      >
        <!-- Header -->
        <div class="bg-gradient-to-r from-indigo-600 to-pink-600 text-white p-6 flex justify-between items-center">
          <h2 class="text-xl font-bold">📚 Documentación</h2>
          <button
            @click="isOpen = false"
            class="text-white hover:bg-white/20 p-2 rounded-lg transition"
          >
            ✕
          </button>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-6 space-y-4">
          <!-- Version Info -->
          <div class="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <p class="text-sm font-semibold text-indigo-900">Versión</p>
            <p class="text-lg font-bold text-indigo-600">{{ version }}</p>
            <p class="text-xs text-indigo-700 mt-1">{{ releaseDate }}</p>
          </div>

          <!-- Quick Links -->
          <div>
            <h3 class="font-semibold text-slate-900 mb-3">Acceso Rápido</h3>
            <div class="space-y-2">
              <a
                v-for="link in quickLinks"
                :key="link.id"
                :href="link.href"
                target="_blank"
                rel="noopener noreferrer"
                class="block p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition text-sm font-medium text-indigo-600"
              >
                {{ link.title }}
              </a>
            </div>
          </div>

          <!-- Documentation Sections -->
          <div>
            <h3 class="font-semibold text-slate-900 mb-3">Documentación</h3>
            <div class="space-y-2">
              <button
                v-for="doc in documentation"
                :key="doc.id"
                @click="openDoc(doc)"
                class="w-full text-left p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition text-sm font-medium text-slate-700"
              >
                {{ doc.title }}
              </button>
            </div>
          </div>

          <!-- Version History -->
          <div>
            <h3 class="font-semibold text-slate-900 mb-3">Historial de Versiones</h3>
            <div class="space-y-2">
              <div
                v-for="v in versions"
                :key="v.version"
                class="p-2 bg-slate-50 rounded border border-slate-200"
              >
                <p class="font-semibold text-slate-900">{{ v.version }}</p>
                <p class="text-xs text-slate-600">{{ v.date }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="border-t border-slate-200 p-4 bg-slate-50">
          <p class="text-xs text-slate-600 text-center">
            <a href="https://github.com/aietamonica2/panel-horas-Mooving" target="_blank" class="text-indigo-600 hover:underline">
              Ver en GitHub
            </a>
          </p>
        </div>
      </div>
    </transition>

    <!-- Modal para mostrar documentación -->
    <Teleport to="body" v-if="selectedDoc">
      <div
        @click="selectedDoc = null"
        class="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4"
      >
        <div
          @click.stop
          class="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-96 overflow-y-auto"
        >
          <div class="bg-gradient-to-r from-indigo-600 to-pink-600 text-white p-6 sticky top-0">
            <div class="flex justify-between items-center">
              <h3 class="text-xl font-bold">{{ selectedDoc.title }}</h3>
              <button
                @click="selectedDoc = null"
                class="text-white hover:bg-white/20 p-2 rounded-lg transition"
              >
                ✕
              </button>
            </div>
          </div>
          <div class="p-6 prose prose-sm max-w-none">
            <p>{{ selectedDoc.description }}</p>
            <a
              :href="selectedDoc.link"
              target="_blank"
              rel="noopener noreferrer"
              class="text-indigo-600 hover:underline font-semibold"
            >
              Abrir documentación completa →
            </a>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const isOpen = ref(false)
const selectedDoc = ref<any>(null)

const version = '1.0.0'
const releaseDate = '12 de Junio de 2026'

const quickLinks = [
  {
    id: 'github',
    title: '🔗 GitHub Repository',
    href: 'https://github.com/aietamonica2/panel-horas-Mooving',
  },
  {
    id: 'docs',
    title: '📖 Documentación Completa',
    href: 'https://github.com/aietamonica2/panel-horas-Mooving/tree/main/documentation',
  },
  {
    id: 'quickstart',
    title: '⚡ Quick Start Guide',
    href: 'https://github.com/aietamonica2/panel-horas-Mooving/blob/main/QUICK_START.md',
  },
]

const documentation = [
  {
    id: 'architecture',
    title: '🏗️ Arquitectura',
    description: 'Descripción de la estructura del monorepo, frontend, backend y convenciones de código.',
    link: 'https://github.com/aietamonica2/panel-horas-Mooving/blob/main/documentation/versions/v1.0.0/architecture.md',
  },
  {
    id: 'development',
    title: '🛠️ Guía de Desarrollo',
    description: 'Instrucciones para setup local, desarrollo, testing y despliegue.',
    link: 'https://github.com/aietamonica2/panel-horas-Mooving/blob/main/README.md',
  },
  {
    id: 'database',
    title: '💾 Base de Datos',
    description: 'Schema de Cloudflare D1, migraciones e índices.',
    link: 'https://github.com/aietamonica2/panel-horas-Mooving/blob/main/documentation/database/schema.sql',
  },
  {
    id: 'release',
    title: '🎉 Notas de Lanzamiento',
    description: 'Cambios principales, nuevas features y mejoras en v1.0.0.',
    link: 'https://github.com/aietamonica2/panel-horas-Mooving/blob/main/documentation/versions/v1.0.0/release-notes.md',
  },
]

const versions = [
  {
    version: 'v1.0.0',
    date: '12 de Junio de 2026 - Lanzamiento inicial',
  },
]

const openDoc = (doc: any) => {
  selectedDoc.value = doc
}
</script>
