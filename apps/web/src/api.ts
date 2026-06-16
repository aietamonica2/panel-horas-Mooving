const API_BASE = import.meta.env.VITE_API_URL || 'https://panel-horas-api.aietamonica.workers.dev'

const getHeaders = () => {
  const token = localStorage.getItem('mooving_auth') || ''
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  }
}

const customFetch = async (url: string, options: RequestInit = {}) => {
  const res = await fetch(url, options)
  if (res.status === 401) {
    localStorage.removeItem('mooving_auth')
    localStorage.removeItem('mooving_user_email')
    localStorage.removeItem('mooving_user_name')
    localStorage.removeItem('mooving_user_role')
    window.location.reload()
  }
  return res
}

export const api = {
  login: (payload: any) => fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' }
  }),
  me: () => customFetch(`${API_BASE}/api/auth/me`, {
    headers: getHeaders()
  }),
  health: () => customFetch(`${API_BASE}/api/health`, {
    headers: getHeaders()
  }),
  listRecords: () => customFetch(`${API_BASE}/api/data/records`, {
    headers: getHeaders()
  }),
  uploadCSV: (payload: any) => customFetch(`${API_BASE}/api/data/upload`, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: getHeaders()
  }),
  createRecord: (payload: any) => customFetch(`${API_BASE}/api/data/records`, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: getHeaders()
  }),
  callMcpTool: (toolName: string, params: any) => customFetch(`${API_BASE}/api/mcp/u/default-user/tools/call`, {
    method: 'POST',
    body: JSON.stringify({ toolName, params }),
    headers: getHeaders()
  }),
  updateRecord: (id: string, payload: any) => customFetch(`${API_BASE}/api/data/records/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
    headers: getHeaders()
  }),
  deleteRecord: (id: string) => customFetch(`${API_BASE}/api/data/records/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  })
}
