-- ============================================================================
-- MCP Tool Catalog Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS mcp_tool_catalog (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  access_type TEXT CHECK(access_type IN ('read', 'write')) NOT NULL,
  domain TEXT,
  description_es TEXT,
  description_en TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- MCP User Permissions Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS mcp_user_permissions (
  mcp_user_id TEXT NOT NULL,
  tool_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (mcp_user_id, tool_id),
  FOREIGN KEY (tool_id) REFERENCES mcp_tool_catalog(id)
);

CREATE INDEX IF NOT EXISTS idx_mcp_perms_company ON mcp_user_permissions(company_id);
