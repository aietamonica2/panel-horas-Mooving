const API_BASE = import.meta.env.VITE_API_URL || 'https://panel-horas-api.aietamonica.workers.dev'

const getHeaders = () => {
  const token = localStorage.getItem('mooving_auth') || ''
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  }
}

export const api = {
  health: () => fetch(`${API_BASE}/api/health`, {
    headers: getHeaders()
  }),
  listRecords: () => fetch(`${API_BASE}/api/data/records`, {
    headers: getHeaders()
  }),
  uploadCSV: (payload: any) => fetch(`${API_BASE}/api/data/upload`, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: getHeaders()
  })
}
