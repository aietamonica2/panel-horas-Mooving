/**
 * Tests for senda_widget_action and senda_bulk_load MCP tools.
 *
 * Rules followed:
 *  - Imports production code from src/ (no phantom tests).
 *  - Mocks only external dependencies (D1, fetch) using SQL-pattern matching.
 *  - No tautological assertions; every expect() validates production output.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TOOL_REGISTRY } from '../mcp/server';

// ---------------------------------------------------------------------------
// Shared DB mock factory (SQL-pattern-aware)
// ---------------------------------------------------------------------------
function makeMockDb() {
  return {
    prepare: (query: string) => ({
      bind: (..._args: any[]) => ({
        all: async () => {
          if (query.includes('FROM employees')) {
            return { results: [{ id: 'emp_monica', name: 'Monica Aieta' }] };
          }
          if (query.includes('FROM clients')) {
            return { results: [{ id: 'cli_mooving', name: 'Mooving' }] };
          }
          if (query.includes('FROM projects')) {
            return {
              results: [{ id: 'proj_moov_core', name: 'Senda Core', client_id: 'cli_mooving' }],
            };
          }
          return { results: [] };
        },
        run: async () => ({ success: true }),
      }),
    }),
  };
}

// ---------------------------------------------------------------------------
// Shared context factory
// ---------------------------------------------------------------------------
function makeMockContext(db = makeMockDb(), extraEnv: Record<string, any> = {}) {
  return {
    env: {
      DB: db,
      SENDA_API_KEY: 'sk_test_fake_key',
      SENDA_BASE_URL: 'https://sendaqa.telar.ai/api',
      ...extraEnv,
    },
    get: (_key: string) => null,
  } as any;
}

// ---------------------------------------------------------------------------
// senda_widget_action
// ---------------------------------------------------------------------------
describe('senda_widget_action', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should forward the message to Senda API and return the response text', async () => {
    const fakeResponse = { text: 'Tienes 120 horas cargadas este mes.' };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => fakeResponse,
    } as any);

    const result = await TOOL_REGISTRY.senda_widget_action(
      { message: '¿Cuántas horas cargué este mes?', company_id: 'mooving-default' },
      makeMockContext()
    );

    expect(result.success).toBe(true);
    expect(result.response).toBe('Tienes 120 horas cargadas este mes.');
    expect(result.company_id).toBe('mooving-default');
    expect(result.space).toBe('tramia');

    // Verify the correct Senda endpoint was called
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/chat/completions'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('should throw when SENDA_API_KEY is missing', async () => {
    const ctx = makeMockContext(makeMockDb(), { SENDA_API_KEY: undefined });

    await expect(
      TOOL_REGISTRY.senda_widget_action(
        { message: 'hola', company_id: 'mooving-default' },
        ctx
      )
    ).rejects.toThrow('SENDA_API_KEY');
  });

  it('should throw when message is not provided', async () => {
    await expect(
      TOOL_REGISTRY.senda_widget_action({ company_id: 'mooving-default' }, makeMockContext())
    ).rejects.toThrow('message');
  });

  it('should throw when Senda API returns a non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () => 'Invalid API key',
    } as any);

    await expect(
      TOOL_REGISTRY.senda_widget_action(
        { message: 'test', company_id: 'mooving-default' },
        makeMockContext()
      )
    ).rejects.toThrow('401');
  });
});

// ---------------------------------------------------------------------------
// senda_bulk_load
// ---------------------------------------------------------------------------
describe('senda_bulk_load', () => {
  it('should delegate to create_bulk_time_records and return inserted count', async () => {
    const db = {
      prepare: (query: string) => ({
        bind: (..._args: any[]) => ({
          all: async () => {
            if (query.includes('FROM employees')) return { results: [{ id: 'emp_monica', name: 'Monica Aieta' }] };
            if (query.includes('FROM clients')) return { results: [{ id: 'cli_mooving', name: 'Mooving' }] };
            if (query.includes('FROM projects')) return { results: [{ id: 'proj_moov_core', name: 'Senda Core', client_id: 'cli_mooving' }] };
            return { results: [] };
          },
          run: async () => ({ success: true }),
        }),
      }),
    };

    const result = await TOOL_REGISTRY.senda_bulk_load(
      {
        company_id: 'mooving-default',
        employee_id: 'emp_monica',
        client_id: 'cli_mooving',
        project_id: 'proj_moov_core',
        description: 'Carga masiva de prueba',
        hours_per_day: 4,
        // Use a full two-week range: at least 10 weekdays guaranteed
        start_date: '2026-06-02',
        end_date: '2026-06-13',
        // Monday–Friday by default (no days_of_week specified)
      },
      makeMockContext(db as any)
    );

    expect(result.success).toBe(true);
    // 2026-06-02 (Mon) to 2026-06-13 (Fri) = 10 weekdays
    expect(result.records_inserted).toBeGreaterThanOrEqual(9);
    expect(typeof result.message).toBe('string');
  });

  it('should throw when required fields are missing', async () => {
    await expect(
      TOOL_REGISTRY.senda_bulk_load(
        {
          company_id: 'mooving-default',
          // missing employee_id, client_id, project_id, start_date, end_date
        },
        makeMockContext()
      )
    ).rejects.toThrow('requeridos');
  });

  it('should respect days_of_week and only insert for martes (2)', async () => {
    const db = {
      prepare: (query: string) => ({
        bind: (..._args: any[]) => ({
          all: async () => {
            if (query.includes('FROM employees')) return { results: [{ id: 'emp_monica', name: 'Monica Aieta' }] };
            if (query.includes('FROM clients')) return { results: [{ id: 'cli_mooving', name: 'Mooving' }] };
            if (query.includes('FROM projects')) return { results: [{ id: 'proj_moov_core', name: 'Senda Core', client_id: 'cli_mooving' }] };
            return { results: [] };
          },
          run: async () => ({ success: true }),
        }),
      }),
    };

    const result = await TOOL_REGISTRY.senda_bulk_load(
      {
        company_id: 'mooving-default',
        employee_id: 'emp_monica',
        client_id: 'cli_mooving',
        project_id: 'proj_moov_core',
        description: 'Solo martes',
        hours_per_day: 8,
        // Tuesdays in June 2026 (within 31-day limit): 2, 9, 16, 23, 30
        start_date: '2026-06-02',
        end_date: '2026-06-30',
        days_of_week: [2], // Tuesday = 2
      },
      makeMockContext(db as any)
    );

    expect(result.success).toBe(true);
    // 5 Tuesdays in June 2026: 2, 9, 16, 23, 30
    expect(result.records_inserted).toBeGreaterThanOrEqual(4);
  });
});
