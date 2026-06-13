import { describe, it, expect } from 'vitest';
import { executeToolCall } from '../mcp/server';
import { HonoContext } from '../types';

describe('MCP Server Tools', () => {
  it('should parse natural language correctly for Federico in YPF', async () => {
    const mockContext = {
      env: { DB: {} },
      get: () => ({ company_id: 'mooving-default' })
    } as unknown as HonoContext;

    const text = 'fede cargo 5h en YPF Migración SAP resolviendo incidentes';
    const result = await executeToolCall('parse_natural_language_hours', { text }, mockContext);

    expect(result.success).toBe(true);
    expect(result.parsed.employee_name).toBe('federico.gomez');
    expect(result.parsed.client_name).toBe('YPF');
    expect(result.parsed.project_name).toBe('Migración SAP');
    expect(result.parsed.duration_decimal).toBe(5);
    expect(result.parsed.work_type).toBe('other');
  });

  it('should parse natural language correctly for Monica in Camuzzi', async () => {
    const mockContext = {
      env: { DB: {} },
      get: () => ({ company_id: 'mooving-default' })
    } as unknown as HonoContext;

    const text = 'reunion con Monica de 2 horas en Camuzzi';
    const result = await executeToolCall('parse_natural_language_hours', { text }, mockContext);

    expect(result.success).toBe(true);
    expect(result.parsed.employee_name).toBe('monica.aieta');
    expect(result.parsed.client_name).toBe('Camuzzi');
    expect(result.parsed.project_name).toBe('Portal Web');
    expect(result.parsed.duration_decimal).toBe(2);
    expect(result.parsed.work_type).toBe('meeting');
  });
});
