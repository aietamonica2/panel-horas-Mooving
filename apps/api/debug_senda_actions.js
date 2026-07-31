// Requiere variables de entorno (ver .dev.vars). NO hardcodear secretos.
// Script de diagnóstico v2: intenta diferentes combinaciones de campos
// para identificar cuál campo hace fallar el INSERT en Senda QA

const API_URL = "https://sendaqa.telar.ai/api";

async function tryBody(headers, body, label) {
  const r = await fetch(`${API_URL}/actions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  const t = await r.text();
  console.log(`\n[${label}] Status: ${r.status} → ${t.substring(0, 200)}`);
  return r.ok;
}

async function run() {
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: "monica@mooving.ai", password: process.env.SENDA_ADMIN_PASSWORD || "" })
  });
  const setCookie = loginRes.headers.get('set-cookie');
  const cookie = setCookie.split(';')[0];
  const headers = { 'Content-Type': 'application/json', 'Cookie': cookie };
  console.log("Login OK\n");

  // Also try checking what a GET on a single action looks like, in case any exist
  const check = await fetch(`${API_URL}/actions?limit=1`, { headers });
  console.log("GET /actions?limit=1 →", await check.text());

  // Try OPTIONS to see allowed methods / schema
  const opts = await fetch(`${API_URL}/actions`, { method: 'OPTIONS', headers });
  console.log("OPTIONS status:", opts.status, "Allow:", opts.headers.get('allow'));

  // Attempt 1: name + description only
  await tryBody(headers, { name: "test_v3_a", description: "minimal" }, "A: name+desc only");

  // Attempt 2: + endpoint + method
  await tryBody(headers, {
    name: "test_v3_b",
    description: "minimal",
    endpoint: "https://example.com",
    method: "POST"
  }, "B: +endpoint+method");

  // Attempt 3: + action_type as 'mcp' 
  await tryBody(headers, {
    name: "test_v3_c",
    description: "minimal",
    endpoint: "https://example.com",
    method: "POST",
    type: "mcp"
  }, "C: action_type=mcp");

  // Attempt 4: include all nullable fields explicitly as empty string not null
  await tryBody(headers, {
    name: "test_v3_d",
    description: "minimal",
    endpoint: "https://example.com",
    method: "POST",
    action_type: "http",
    headers_json: "{}",
    payload_template: "{}",
    api_key: "",
    parameters: "",
    directive: "",
    ui_render_type: "text",
    ui_render_config: "",
    folder: "",
    tags: "",
    technical_docs: "",
    tool_name: "",
    is_active: 1,
    auth_type: "none",
    oauth_config: "",
    mcp_server_url: "",
    mcp_tool_name: "",
    script_code: "",
    response_directive: ""
  }, "D: all fields as empty string");

  // Attempt 5: use 'type' instead of 'action_type'
  await tryBody(headers, {
    name: "test_v3_e",
    description: "minimal",
    endpoint: "https://example.com",
    http_method: "POST",
    type: "http",
    headers_json: "{}",
    payload_template: "{}"
  }, "E: type/http_method variant");
}

run().catch(console.error);
