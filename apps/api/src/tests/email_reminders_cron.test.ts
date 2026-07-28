import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { handleEmailRemindersCron } from '../cron/email_reminders';
import { Env } from '../types';

// Mock global fetch
const originalFetch = globalThis.fetch;

/**
 * Creates a D1-like mock database that responds to SQL queries
 * using pattern matching. Supports both .prepare(sql).all() and
 * .prepare(sql).bind(...).all()/run() call patterns.
 */
function makeMockDB(overrides: {
  settings?: any[];
  employees?: any[];
  timeRecords?: any[];
} = {}) {
  const settings = overrides.settings ?? [
    {
      company_id: 'mooving-default',
      default_cc: 'Eddie <eddie@moovingtech.com>; Julieta <julieta@moovingtech.com>',
      is_automated: 1,
      from_name: 'Mónica Aieta - Mooving Tech',
    },
  ];

  const employees = overrides.employees ?? [
    { id: 'emp_felipe', name: 'felipe.gutierrez', email: 'felipe.gutierrez@moovingtech.com', is_active: 1 },
    { id: 'emp_lucia', name: 'lucia.manera', email: 'lucia.manera@moovingtech.com', is_active: 1 },
  ];

  const timeRecords = overrides.timeRecords ?? [
    { employee_id: 'emp_felipe', employee_name: 'felipe.gutierrez', total_hours: 64.75 },
    { employee_id: 'emp_lucia', employee_name: 'lucia.manera', total_hours: 136.0 },
  ];

  const resolveQuery = (sql: string) => {
    if (sql.includes('email_reminder_settings')) {
      return { results: settings };
    }
    if (sql.includes('FROM employees')) {
      return { results: employees };
    }
    if (sql.includes('FROM time_records')) {
      return { results: timeRecords };
    }
    return { results: [] };
  };

  const makeStatement = (sql: string) => ({
    bind: (..._args: any[]) => ({
      all: async () => resolveQuery(sql),
      run: async () => ({ success: true, meta: { changes: 0 } }),
    }),
    // Support .prepare(sql).all() without .bind()
    all: async () => resolveQuery(sql),
    run: async () => ({ success: true, meta: { changes: 0 } }),
  });

  return {
    prepare: (sql: string) => makeStatement(sql),
  } as unknown as D1Database;
}

describe('Email Reminders Cron Handler', () => {
  beforeEach(() => {
    // Mock fetch for SendGrid calls
    globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      if (urlStr.includes('api.sendgrid.com')) {
        return new Response(null, { status: 202 });
      }
      return new Response(JSON.stringify({}), { status: 200 });
    }) as any;
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  it('should abort when SENDGRID_API_KEY is not configured', async () => {
    const env: Env = {
      DB: makeMockDB(),
      ENVIRONMENT: 'development',
      SENDGRID_API_KEY: undefined,
      SENDGRID_FROM_EMAIL: 'test@moovingtech.com',
    } as any;

    const consoleSpy = vi.spyOn(console, 'error');
    await handleEmailRemindersCron(env);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('No API key configured'),
    );
    consoleSpy.mockRestore();
  });

  it('should skip when no tenants have automated reminders enabled', async () => {
    const env: Env = {
      DB: makeMockDB({ settings: [] }),
      ENVIRONMENT: 'development',
      SENDGRID_API_KEY: 'SG.test-key',
      SENDGRID_FROM_EMAIL: 'test@moovingtech.com',
    } as any;

    const consoleSpy = vi.spyOn(console, 'log');
    await handleEmailRemindersCron(env);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('No tenants with automated reminders'),
    );
    consoleSpy.mockRestore();
  });

  it('should send emails to all active employees when automation is enabled', async () => {
    const env: Env = {
      DB: makeMockDB(),
      ENVIRONMENT: 'development',
      SENDGRID_API_KEY: 'SG.test-key',
      SENDGRID_FROM_EMAIL: 'test@moovingtech.com',
    } as any;

    await handleEmailRemindersCron(env);

    // Should have called SendGrid twice (once per active employee)
    const fetchCalls = (globalThis.fetch as any).mock.calls.filter(
      (call: any[]) => {
        const url = typeof call[0] === 'string' ? call[0] : call[0]?.toString();
        return url?.includes('api.sendgrid.com');
      },
    );

    expect(fetchCalls.length).toBe(2);

    // Verify the payload structure for the first call
    const firstPayload = JSON.parse(fetchCalls[0][1].body);
    expect(firstPayload.personalizations).toBeDefined();
    expect(firstPayload.personalizations[0].to).toBeDefined();
    expect(firstPayload.from.email).toBe('test@moovingtech.com');
    expect(firstPayload.content[0].type).toBe('text/plain');
  });

  it('should include CC recipients parsed from settings', async () => {
    const env: Env = {
      DB: makeMockDB(),
      ENVIRONMENT: 'development',
      SENDGRID_API_KEY: 'SG.test-key',
      SENDGRID_FROM_EMAIL: 'test@moovingtech.com',
    } as any;

    await handleEmailRemindersCron(env);

    const fetchCalls = (globalThis.fetch as any).mock.calls.filter(
      (call: any[]) => {
        const url = typeof call[0] === 'string' ? call[0] : call[0]?.toString();
        return url?.includes('api.sendgrid.com');
      },
    );

    expect(fetchCalls.length).toBeGreaterThan(0);
    const payload = JSON.parse(fetchCalls[0][1].body);
    expect(payload.personalizations[0].cc).toBeDefined();
    expect(payload.personalizations[0].cc).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ email: 'eddie@moovingtech.com' }),
        expect.objectContaining({ email: 'julieta@moovingtech.com' }),
      ]),
    );
  });

  it('should handle SendGrid errors gracefully and continue', async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      if (urlStr.includes('api.sendgrid.com')) {
        callCount++;
        if (callCount === 1) {
          return new Response('{"errors":[{"message":"Invalid email"}]}', { status: 400 });
        }
        return new Response(null, { status: 202 });
      }
      return new Response(JSON.stringify({}), { status: 200 });
    }) as any;

    const env: Env = {
      DB: makeMockDB(),
      ENVIRONMENT: 'development',
      SENDGRID_API_KEY: 'SG.test-key',
      SENDGRID_FROM_EMAIL: 'test@moovingtech.com',
    } as any;

    const consoleSpy = vi.spyOn(console, 'log');

    // Should not throw
    await handleEmailRemindersCron(env);

    // Should still complete (log success for tenant)
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Sent 1 emails, 1 failed'),
    );
    consoleSpy.mockRestore();
  });
});
