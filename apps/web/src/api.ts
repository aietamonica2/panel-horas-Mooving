const API_BASE = import.meta.env.VITE_API_URL || 'https://panel-horas-api.aietamonica.workers.dev'

export const api = {
  health: () => fetch(`${API_BASE}/api/health`),
  listRecords: () => fetch(`${API_BASE}/api/data/records`),
  uploadCSV: (payload: any) => fetch(`${API_BASE}/api/data/upload`, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' }
  })
}
