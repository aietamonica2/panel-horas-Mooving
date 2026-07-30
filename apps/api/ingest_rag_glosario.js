// Ingesta del glosario RAG en Senda QA para el agente de Panel Horas
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API_URL = "https://sendaqa.telar.ai/api";
const GLOSARIO_PATH = join(process.env.USERPROFILE || '', 'Documents', 'Claude', 'Projects', 'Dashboard Horas del equipo', 'RAG_GLOSARIO_PROYECTOS_CLIENTES.md');


async function run() {
  // Login
  console.log("Logging in...");
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: "monica@mooving.ai", password: "Mooving321" })
  });
  
  const setCookie = loginRes.headers.get('set-cookie');
  if (!setCookie) { console.error("No cookie returned, login failed"); return; }
  const cookie = setCookie.split(';')[0];
  console.log("Login OK");

  const headers = { 'Content-Type': 'application/json', 'Cookie': cookie };

  // 1. List agents to find the right one
  console.log("\n--- GET /agents ---");
  const agentsRes = await fetch(`${API_URL}/agents`, { headers });
  const agentsData = await agentsRes.json();
  console.log("Status:", agentsRes.status);
  const agents = Array.isArray(agentsData) ? agentsData : (agentsData.agents || agentsData.data || []);
  console.log("Agents:", agents.map(a => `${a.id} — ${a.name}`).join('\n'));

  // 2. Read the glosario file
  let glosarioContent;
  try {
    glosarioContent = readFileSync(GLOSARIO_PATH, 'utf-8');
    console.log(`\nGlosario loaded: ${glosarioContent.length} chars`);
  } catch (e) {
    console.error("Could not read glosario:", e.message);
    console.log("Trying alternative path...");
    // Try from current dir
    const altPath = join(process.env.USERPROFILE || '', 'Documents', 'Claude', 'Projects', 'Dashboard Horas del equipo', 'RAG_GLOSARIO_PROYECTOS_CLIENTES.md');
    glosarioContent = readFileSync(altPath, 'utf-8');
    console.log(`Glosario loaded from alt path: ${glosarioContent.length} chars`);
  }

  // 3. List knowledge documents
  console.log("\n--- GET /knowledge ---");
  const knRes = await fetch(`${API_URL}/knowledge`, { headers });
  console.log("Status:", knRes.status);
  const knText = await knRes.text();
  console.log("Body (first 300):", knText.substring(0, 300));

  // 4. Ingest knowledge for the first agent (router operaciones)
  const targetAgent = agents.find(a => a.name && (a.name.toLowerCase().includes('router') || a.name.toLowerCase().includes('operaciones') || a.name.toLowerCase().includes('analista')));
  if (!targetAgent && agents.length === 0) {
    console.log("No agents found. Trying to ingest globally...");
  }

  const agentId = targetAgent?.id || agents[0]?.id;
  if (agentId) {
    console.log(`\n--- POST /knowledge/ingest for agent ${agentId} (${targetAgent?.name || agents[0]?.name}) ---`);
    const ingestRes = await fetch(`${API_URL}/knowledge/ingest`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        agent_id: agentId,
        filename: 'RAG_GLOSARIO_PROYECTOS_CLIENTES.md',
        content: glosarioContent,
        content_type: 'text/markdown'
      })
    });
    console.log("Status:", ingestRes.status);
    const ingestText = await ingestRes.text();
    console.log("Body:", ingestText.substring(0, 400));
  } else {
    console.log("No agent ID available.");
  }
}

run().catch(console.error);
