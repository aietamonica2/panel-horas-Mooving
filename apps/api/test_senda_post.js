
// Requiere variables de entorno (ver .dev.vars). NO hardcodear secretos.
const API_KEY = process.env.SENDA_MCP_TOKEN || "";
const BASE_URL = "https://sendaqa.telar.ai/api/v1";

async function run() {
  const payload = {
    name: "test_action_api",
    description: "test",
    http_method: "POST",
    url: "https://panel-horas-api.aietamonica.workers.dev/api/protected/mcp/v1/tools/call",
    parameters: [
      {
        "key": "payload",
        "value": "{}"
      }
    ],
    headers: [
      { "key": "Content-Type", "value": "application/json" }
    ],
    is_active: 1
  };

  const res = await fetch(`${BASE_URL}/actions`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  
  console.log("POST status:", res.status);
  console.log(await res.text());
}

run().catch(console.error);
