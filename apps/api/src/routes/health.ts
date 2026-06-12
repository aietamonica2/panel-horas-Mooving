import { Hono } from 'hono'
import type { CloudflareBindings } from '@/types'

const router = new Hono<{ Bindings: CloudflareBindings }>()

router.get('/', (c) => {
  return c.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    },
  })
})

export default router
