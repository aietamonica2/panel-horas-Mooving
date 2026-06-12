import { describe, it, expect } from 'vitest';
import dataRouter from '../routes/data';
import { Hono } from 'hono';

describe('Data Routes', () => {
  it('POST /api/data/records should return 400 if validation fails', async () => {
    const app = new Hono();
    app.route('/api/data', dataRouter);
    
    const res = await app.request('/api/data/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_id: 'user',
        // faltan campos obligatorios como client_name, project_id, etc.
      })
    });
    
    expect(res.status).toBe(400);
  });
});

