// Requiere variables de entorno (ver .dev.vars). NO hardcodear secretos.
const API_URL = "https://sendaqa.telar.ai/api";

async function run() {
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: "monica@mooving.ai", password: process.env.SENDA_ADMIN_PASSWORD || "" })
  });
  const setCookie = loginRes.headers.get('set-cookie');
  const cookie = setCookie.split(';')[0];
  const headers = { 'Content-Type': 'application/json', 'Cookie': cookie };

  // 1. Test minimal payload
  const minimal = {
    name: "test_minimal_" + Date.now(),
    description: "test minimal",
    endpoint: "https://example.com",
    method: "POST",
    action_type: "http"
  };
  
  let r = await fetch(`${API_URL}/actions`, { method: 'POST', headers, body: JSON.stringify(minimal) });
  console.log("Minimal:", r.status, await r.text());

  // 2. Try with just name + description + url
  const minimal2 = {
    name: "test_minimal2_" + Date.now(),
    description: "test2",
    url: "https://example.com",
    method: "POST",
    type: "http"
  };
  r = await fetch(`${API_URL}/actions`, { method: 'POST', headers, body: JSON.stringify(minimal2) });
  console.log("Minimal2:", r.status, await r.text());

  // 3. Match exactly an existing clockify action structure (using API KEY route) but also inspect by fetching an existing one from authenticated tenant
  // Try tenant-based API key
  const r3 = await fetch(`${API_URL}/actions`, {
    headers: { 
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiJ9.' + cookie.split('.')[1],
      'Content-Type': 'application/json',
      'Cookie': cookie
    }
  });
  console.log("Actions (cookie) count:", r3.status);
  if (r3.ok) {
    const d = await r3.json();
    console.log(JSON.stringify(d, null, 2));
  }
}

run().catch(console.error);
