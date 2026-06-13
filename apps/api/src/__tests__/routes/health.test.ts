import { describe, it, expect } from 'vitest'
import app from '../../index'

describe('Health Routes', () => {
  it('returns healthy status', async () => {
    const response = await app.request('/api/health')

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data.status).toBe('ok')
  })
})
