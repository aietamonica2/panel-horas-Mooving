import { describe, it, expect } from 'vitest';
import { executeToolCall } from '../mcp/server';
import { HonoContext } from '../types';

describe('Email Reminders MCP Tools', () => {
  const mockEmployees = [
    { id: 'emp_felipe', name: 'felipe.gutierrez', email: 'felipe.gutierrez@moovingtech.com', is_active: 1 },
    { id: 'emp_lucia', name: 'lucia.manera', email: 'lucia.manera@moovingtech.com', is_active: 1 },
    { id: 'emp_augusto', name: 'Augusto Morelli', email: 'augusto.morelli@moovingtech.com', is_active: 1 },
    { id: 'emp_inactive', name: 'Ex Empleado', email: 'ex@moovingtech.com', is_active: 0 },
  ];

  const mockTimeRecords = [
    { employee_id: 'emp_felipe', employee_name: 'felipe.gutierrez', total_hours: 64.75 },
    { employee_id: 'emp_lucia', employee_name: 'lucia.manera', total_hours: 136.0 },
  ];

  const makeMockContext = () => {
    return {
      env: {
        DB: {
          prepare: (sql: string) => {
            return {
              bind: (...args: any[]) => {
                return {
                  first: async () => {
                    if (sql.includes('email_reminder_settings')) {
                      return { default_cc: 'eddie@moovingtech.com; julieta@moovingtech.com' };
                    }
                    return null;
                  },
                  all: async () => {
                    if (sql.includes('FROM employees')) {
                      if (sql.includes('AND is_active = 1')) {
                        return { results: mockEmployees.filter(e => e.is_active === 1) };
                      }
                      return { results: mockEmployees };
                    }
                    if (sql.includes('FROM time_records')) {
                      return { results: mockTimeRecords };
                    }
                    return { results: [] };
                  },
                  run: async () => {
                    return { success: true };
                  }
                };
              }
            };
          }
        }
      },
      get: () => ({ company_id: 'mooving-default' })
    } as unknown as HonoContext;
  };

  it('should generate personalized drafts with Spanish hour formatting and excludes inactive employees by default', async () => {
    const ctx = makeMockContext();
    const result = await executeToolCall('get_email_reminder_drafts', { month: '2026-07' }, ctx);

    expect(result.month).toBe('2026-07');
    expect(result.drafts).toHaveLength(3); // Only 3 active employees

    // Felipe (64.75 hours)
    const felipeDraft = result.drafts.find((d: any) => d.employee_name.includes('Felipe'));
    expect(felipeDraft).toBeDefined();
    expect(felipeDraft.hours_formatted).toBe('64,75');
    expect(felipeDraft.body).toContain('Tenemos registradas 64,75 horas');

    // Augusto (0 hours)
    const augustoDraft = result.drafts.find((d: any) => d.employee_name.includes('Augusto'));
    expect(augustoDraft).toBeDefined();
    expect(augustoDraft.hours_formatted).toBe('0,00');
    expect(augustoDraft.body).toContain('No tenemos horas registradas');

    // Ex Empleado should NOT be in default drafts
    const inactiveDraft = result.drafts.find((d: any) => d.employee_name.includes('Ex'));
    expect(inactiveDraft).toBeUndefined();
  });

  it('should include inactive employees when include_inactive flag is true', async () => {
    const ctx = makeMockContext();
    const result = await executeToolCall('get_email_reminder_drafts', { month: '2026-07', include_inactive: true }, ctx);

    expect(result.drafts).toHaveLength(4);
    const inactiveDraft = result.drafts.find((d: any) => d.employee_name.includes('Ex'));
    expect(inactiveDraft).toBeDefined();
    expect(inactiveDraft.is_active).toBe(false);
  });

  it('should send email reminders and record configuration schedule', async () => {
    const ctx = makeMockContext();

    const sendResult = await executeToolCall('send_email_reminders', { recipients: ['emp_felipe', 'emp_lucia'] }, ctx);
    expect(sendResult.success).toBe(true);
    expect(sendResult.sent_count).toBe(2);

    const configResult = await executeToolCall('configure_email_reminder_schedule', {
      default_cc: 'test@moovingtech.com',
      is_automated: true,
      cron_schedule: '0 9 27 * *'
    }, ctx);
    expect(configResult.success).toBe(true);
    expect(configResult.is_automated).toBe(true);
  });
});
