// Probe Senda QA API endpoints
import { readFileSync } from 'fs';
import { join } from 'path';

const API_URL = "https://sendaqa.telar.ai/api";

async function run() {
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: "monica@mooving.ai", password: "Mooving321" })
  });
  const setCookie = loginRes.headers.get('set-cookie');
  const cookie = setCookie.split(';')[0];
  const headers = { 'Content-Type': 'application/json', 'Cookie': cookie };
  console.log("Login OK\n");

  const AGENT_ID = "1781358000813"; // router_operaciones_mooving
  
  // Try various knowledge endpoints
  const endpoints = [
    [`GET`, `/agents/${AGENT_ID}/knowledge`],
    [`GET`, `/agents/${AGENT_ID}/files`],
    [`GET`, `/files`],
    [`GET`, `/knowledge`],
    [`GET`, `/v1/knowledge`],
    [`GET`, `/agents/${AGENT_ID}`],
  ];

  for (const [method, path] of endpoints) {
    const r = await fetch(`${API_URL}${path}`, { method, headers });
    console.log(`${method} ${path} → ${r.status}`);
    if (r.ok) {
      const t = await r.text();
      console.log("  Body:", t.substring(0, 200));
    }
  }

  // Try to upload a file for the agent
  console.log("\n--- Try uploading file via FormData ---");
  const glosarioContent = readFileSync(
    join(process.env.USERPROFILE || '', 'Documents', 'Claude', 'Projects', 'Dashboard Horas del equipo', 'RAG_GLOSARIO_PROYECTOS_CLIENTES.md'),
    'utf-8'
  );
  
  const formData = new FormData();
  formData.append('file', new Blob([glosarioContent], { type: 'text/markdown' }), 'RAG_GLOSARIO_PROYECTOS_CLIENTES.md');
  formData.append('agent_id', AGENT_ID);
  
  const uploadHeaders = { 'Cookie': cookie }; // no Content-Type, let browser set it for multipart
  
  for (const uploadPath of [`/agents/${AGENT_ID}/files`, `/files`, `/upload`]) {
    const r = await fetch(`${API_URL}${uploadPath}`, {
      method: 'POST',
      headers: uploadHeaders,
      body: formData
    });
    console.log(`POST ${uploadPath} → ${r.status}: ${(await r.text()).substring(0, 150)}`);
    if (r.ok) break;
  }
}

run().catch(console.error);
