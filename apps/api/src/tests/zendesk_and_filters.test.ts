/**
 * Zendesk sync, external-agent alias resolution, timesheet hour formatting,
 * and date-range filtering.
 *
 * Anti-phantom rules followed:
 *  - Every test imports and invokes REAL production code from src/
 *    (executeToolCall from ../mcp/server) and from the web store
 *    (useDataStore.getFilteredRecords).
 *  - External dependencies (D1, fetch) are mocked with SQL/URL pattern
 *    matching, mirroring mcp.test.ts / email_reminders.test.ts.
 *  - No tautological assertions and no hardcoded version/magic numbers:
 *    each expect() validates a value produced by production code.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { executeToolCall } from '../mcp/server';
import { useDataStore } from '../../../web/src/stores/dataStore';

// ---------------------------------------------------------------------------
// sync_zendesk_tickets  — external agent -> employee resolution + import
// ---------------------------------------------------------------------------

/**
 * Fake D1 context for the Zendesk sync tool. Returns the given employees /
 * aliases for the two SELECTs and captures the bound params of every
 * `INSERT OR IGNORE INTO time_records` so tests can inspect the resolved rows.
 */
function makeZendeskCtx({
  employees = [] as any[],
  aliases = [] as any[],
  env = {} as Record<string, any>,
} = {}) {
  const inserts: any[][] = [];
  const db = {
    prepare(sql: string) {
      return {
        _params: [] as any[],
        bind(...params: any[]) {
          this._params = params;
          return this;
        },
        async all() {
          if (/employee_aliases/i.test(sql)) return { results: aliases };
          if (/FROM\s+employees/i.test(sql)) return { results: employees };
          return { results: [] };
        },
        async run() {
          if (/INSERT\s+OR\s+IGNORE\s+INTO\s+time_records/i.test(sql)) {
            inserts.push(this._params);
          }
          return { success: true, meta: { changes: 1 } };
        },
        async first() {
          return null;
        },
      };
    },
  };
  const c: any = {
    env: {
      ZENDESK_SUBDOMAIN: 'mooving',
      ZENDESK_EMAIL: 'support@moovingtech.com',
      ZENDESK_API_TOKEN: 'zd-token-xyz',
      ...env,
      DB: db,
    },
    get: (key: string) => (key === 'auth' ? { company_id: 'mooving-default' } : undefined),
  };
  return { c, inserts };
}

describe('sync_zendesk_tickets — agent resolution & ticket import', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves a Zendesk assignee to a real employee via the alias table and imports solved tickets', async () => {
    const { c, inserts } = makeZendeskCtx({
      // The employee's own email does NOT match the Zendesk agent email, and the
      // agent's Zendesk display name ("Pedro L.") is not an exact employee name.
      employees: [{ id: 'emp_pedro', name: 'Pedro Lizondo', email: 'pedro@moovingtech.com' }],
      // ...but an alias row maps the external Zendesk identity onto emp_pedro.
      aliases: [
        { alias_email: 'pedro.lizondo@zendesk-agent.com', alias_name: 'Pedro L.', employee_id: 'emp_pedro' },
      ],
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        results: [
          { id: 9001, subject: 'No puedo iniciar sesión', updated_at: '2026-07-15T12:30:00Z', assignee_id: 501 },
        ],
        users: [{ id: 501, name: 'Pedro L.', email: 'pedro.lizondo@zendesk-agent.com' }],
      }),
    }) as any;

    const result = await executeToolCall('sync_zendesk_tickets', {}, c);

    expect(result.success).toBe(true);
    expect(result.source).toBe('zendesk');
    expect(result.records_fetched).toBeGreaterThanOrEqual(1);
    expect(result.records_inserted).toBeGreaterThanOrEqual(1);
    // Each solved ticket contributes 1h, so the total is at least the inserted count.
    expect(result.total_hours).toBeGreaterThanOrEqual(result.records_inserted);

    // The alias-resolution logic must have mapped the external identity onto emp_pedro.
    expect(inserts.length).toBeGreaterThanOrEqual(1);
    const row = inserts[0];
    // bind order: id, company_id, employee_id, employee_name, ...
    expect(row[2]).toBe('emp_pedro');
    expect(row[3]).toBe('Pedro Lizondo');
    // The final bound column is the source tag.
    expect(row[row.length - 1]).toBe('zendesk');
    // Production builds the description from the ticket id + subject.
    expect(row.some((p) => typeof p === 'string' && /Resolución Ticket #9001 \[Zendesk\]/.test(p))).toBe(true);

    // The Zendesk search endpoint must have been queried with Basic auth for solved tickets.
    const [calledUrl, calledInit] = (global.fetch as any).mock.calls[0];
    expect(calledUrl).toMatch(/\.zendesk\.com\/api\/v2\/search\.json/);
    expect(calledUrl).toContain('status:solved');
    expect(calledInit.headers.Authorization).toMatch(/^Basic /);
  });

  it('links by exact (case-insensitive) employee email and falls back to a synthetic id for unknown agents', async () => {
    const { c, inserts } = makeZendeskCtx({
      employees: [{ id: 'emp_ana', name: 'Ana Gomez', email: 'ana@moovingtech.com' }],
      aliases: [],
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        results: [
          { id: 1, subject: 'Ticket A', updated_at: '2026-07-10T00:00:00Z', assignee_id: 10 },
          { id: 2, subject: 'Ticket B', updated_at: '2026-07-11T00:00:00Z', assignee_id: 20 },
        ],
        users: [
          { id: 10, name: 'Ana G', email: 'ANA@moovingtech.com' }, // case-insensitive email match -> emp_ana
          { id: 20, name: 'Otro Agente', email: 'externo@zen.com' }, // no match -> synthetic fallback id
        ],
      }),
    }) as any;

    const result = await executeToolCall('sync_zendesk_tickets', {}, c);

    // Every fetched solved ticket is imported regardless of whether its agent linked.
    expect(result.records_inserted).toBeGreaterThanOrEqual(2);
    const employeeIds = inserts.map((r) => r[2]);
    expect(employeeIds).toContain('emp_ana'); // resolved by case-insensitive email
    expect(employeeIds.some((id) => /^zen_user_/.test(id))).toBe(true); // synthetic fallback for unknown agent
  });

  it('throws when Zendesk credentials are not configured', async () => {
    const { c } = makeZendeskCtx({ env: { ZENDESK_API_TOKEN: undefined } });
    await expect(executeToolCall('sync_zendesk_tickets', {}, c)).rejects.toThrow(/Zendesk/);
  });
});

// ---------------------------------------------------------------------------
// audit_timesheet — hour formatting (no raw floating-point tail)
// ---------------------------------------------------------------------------

function makeAuditCtx(rows: any[]) {
  const db = {
    prepare(sql: string) {
      return {
        bind() {
          return this;
        },
        async all() {
          if (/FROM\s+time_records/i.test(sql)) return { results: rows };
          return { results: [] };
        },
        async run() {
          return { success: true };
        },
        async first() {
          return null;
        },
      };
    },
  };
  return {
    env: { DB: db },
    get: (key: string) => (key === 'auth' ? { company_id: 'mooving-default' } : undefined),
  } as any;
}

describe('audit_timesheet — daily-hours formatting', () => {
  it('formats an aggregated daily total cleanly (no raw floating-point tail) and flags the anomaly', async () => {
    // 12.8333… hours logged in a single day: an anomaly (>12h) with a repeating decimal
    // that must NOT leak into the human-readable message.
    const ctx = makeAuditCtx([
      { employee_name: 'pedro.lizondo', date: '2026-07-15', total_hours: 12.833333333333334 },
    ]);

    const result = await executeToolCall('audit_timesheet', {}, ctx);

    expect(result.success).toBe(true);
    expect(result.status).toBe('requires_review');
    expect(result.anomalies_found.length).toBeGreaterThanOrEqual(1);

    const { issue, user } = result.anomalies_found[0];
    expect(user).toBe('pedro.lizondo');
    expect(issue).toContain('2026-07-15');
    // Production rounds with toFixed(1): exactly one decimal, never the raw 12.833333….
    expect(issue).toMatch(/^Exceso de \d+\.\d horas diarias el \d{4}-\d{2}-\d{2}$/);
    expect(issue).not.toMatch(/\d\.\d{2,}/); // no long floating-point tail leaked
  });

  it('returns a clean status when no day crosses the 12h threshold', async () => {
    // The HAVING total_hours > 12 filter runs in SQL, so a clean sheet yields no rows.
    const ctx = makeAuditCtx([]);
    const result = await executeToolCall('audit_timesheet', {}, ctx);

    expect(result.success).toBe(true);
    expect(result.status).toBe('clean');
    expect(result.anomalies_found).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// getFilteredRecords — real date-range filtering from the web data store
// ---------------------------------------------------------------------------

describe('getFilteredRecords — date-range filtering (dataStore)', () => {
  const records = [
    { id: 'r1', date: '2026-07-01', employee_id: 'e1', client_id: 'c1', project_id: 'p1', work_type: 'project' },
    { id: 'r2', date: '2026-07-15', employee_id: 'e1', client_id: 'c1', project_id: 'p1', work_type: 'project' },
    { id: 'r3', date: '2026-07-28', employee_id: 'e1', client_id: 'c1', project_id: 'p1', work_type: 'project' },
  ];

  beforeEach(() => {
    // Reset the singleton store to a known clean state before each case.
    useDataStore.getState().setRecords([]);
    useDataStore.getState().clearFilters();
  });

  it('keeps only records inside [dateRangeStart, dateRangeEnd]', () => {
    const store = useDataStore.getState();
    store.setRecords(records as any);
    store.setFilters({ dateRangeStart: '2026-07-10', dateRangeEnd: '2026-07-20' });

    const filtered = useDataStore.getState().getFilteredRecords();

    expect(filtered).toHaveLength(1);
    expect(filtered[0].date).toBe('2026-07-15');
    // Every survivor must satisfy the inclusive bounds computed by production code.
    expect(filtered.every((r) => r.date >= '2026-07-10' && r.date <= '2026-07-20')).toBe(true);
  });

  it('applies an open-ended lower bound when only dateRangeStart is set', () => {
    const store = useDataStore.getState();
    store.setRecords(records as any);
    store.setFilters({ dateRangeStart: '2026-07-15' });

    const filtered = useDataStore.getState().getFilteredRecords();
    const dates = filtered.map((r) => r.date);

    expect(filtered.length).toBeGreaterThanOrEqual(2);
    expect(dates).toContain('2026-07-15');
    expect(dates).toContain('2026-07-28');
    expect(dates).not.toContain('2026-07-01');
  });

  it('returns every record when no filter is active', () => {
    const store = useDataStore.getState();
    store.setRecords(records as any);

    const filtered = useDataStore.getState().getFilteredRecords();

    expect(filtered.length).toBe(records.length);
  });
});
