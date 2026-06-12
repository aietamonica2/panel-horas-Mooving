import { Hono } from 'hono';
import { HonoContext } from '../types';
import { executeToolCall, TOOL_REGISTRY } from '../mcp/server';

const mcpRouter = new Hono<HonoContext>();

// GET /tools - List available tools for the user
mcpRouter.get('/u/:mcp_user_id/tools', async (c) => {
  const db = c.env.DB;
  const mcpUserId = c.req.param('mcp_user_id');
  
  // Verify permissions
  const { results: permissions } = await db.prepare(
    'SELECT c.id, c.name, c.description_es as description FROM mcp_user_permissions p JOIN mcp_tool_catalog c ON p.tool_id = c.id WHERE p.mcp_user_id = ?'
  ).bind(mcpUserId).all();
  
  return c.json({ tools: permissions });
});

// POST /tools/call - Execute a tool
mcpRouter.post('/u/:mcp_user_id/tools/call', async (c) => {
  const db = c.env.DB;
  const mcpUserId = c.req.param('mcp_user_id');
  const body = await c.req.json();
  const { toolName, params } = body;
  
  if (!toolName) {
    return c.json({ error: 'toolName is required' }, 400);
  }
  
  // Optional: Add DB validation here to ensure mcpUserId has permission for toolName
  // For now, we trust the internal mapping if they are authenticated via Senda API keys
  
  try {
    const result = await executeToolCall(toolName, params, c);
    return c.json({ success: true, result });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default mcpRouter;
