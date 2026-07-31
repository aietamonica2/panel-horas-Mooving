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
  const body = await c.req.json();
  const { toolName, params } = body;

  if (!toolName) {
    return c.json({ error: 'toolName is required' }, 400);
  }

  // SEC-01: the tenant comes from the AUTHENTICATED principal that the auth
  // middleware attached to the context — never from the URL (:mcp_user_id) or the
  // request body, both of which the caller controls. The auth middleware already
  // rejected anonymous callers, so this is a defensive double-check.
  const auth = c.get('auth');
  const companyId = auth?.company_id;
  if (!companyId) {
    return c.json({ success: false, error: 'No autorizado' }, 401);
  }

  // Pin the tenant to the principal so a normal user can't widen their scope by
  // passing a company_id in the body. The Senda service principal is allowed to
  // target a tenant explicitly (matching existing service-account behaviour), so we
  // only override for non-service roles. executeToolCall reads params.company_id
  // (falling back to c.get('auth').company_id) to scope every query downstream.
  const safeParams = { ...(params ?? {}) };
  if (auth.role !== 'service') {
    safeParams.company_id = companyId;
  }

  // TODO(SEC-01, future layer): granular per-tool authorization via
  // mcp_user_permissions — verify this principal is allowed to run `toolName`
  // before executing. NOT enabled yet: the web frontend has no seeded permission
  // rows, so enforcing it now would break legitimate users. Turn on once
  // permissions are provisioned for real users.

  try {
    const result = await executeToolCall(toolName, safeParams, c);
    return c.json({ success: true, result });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default mcpRouter;
