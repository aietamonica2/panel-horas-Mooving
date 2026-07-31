// Requiere variables de entorno (ver .dev.vars). NO hardcodear secretos.
const API_URL = "https://sendaqa.telar.ai/api";
const MCP_ENDPOINT = "https://panel-horas-api.aietamonica.workers.dev/api/protected/mcp/v1/tools/call";
const MCP_TOKEN = process.env.SENDA_MCP_TOKEN || "";

// All tools to sync — each maps to a single toolName call
const ACTIONS = [
  {
    name: "get_clients",
    description: "Lista todos los clientes. Úsala cuando el usuario pregunte por clientes, quiera saber con quién trabajan o necesite un ID de cliente para otra acción.",
    payload_template: JSON.stringify({ toolName: "get_clients", params: { company_id: "mooving-default" } }, null, 2)
  },
  {
    name: "create_client",
    description: "Crea un nuevo cliente. Úsala cuando el usuario quiera agregar un cliente.",
    payload_template: JSON.stringify({ toolName: "create_client", params: { name: "{{name}}", company_id: "mooving-default" } }, null, 2)
  },
  {
    name: "update_client",
    description: "Actualiza un cliente existente por su ID.",
    payload_template: JSON.stringify({ toolName: "update_client", params: { id: "{{id}}", name: "{{name}}" } }, null, 2)
  },
  {
    name: "delete_client",
    description: "Elimina un cliente por su ID.",
    payload_template: JSON.stringify({ toolName: "delete_client", params: { id: "{{id}}" } }, null, 2)
  },
  {
    name: "get_projects",
    description: "Lista todos los proyectos. Úsala cuando el usuario pregunte por proyectos, quiera ver los proyectos de un cliente o necesite un ID de proyecto.",
    payload_template: JSON.stringify({ toolName: "get_projects", params: { company_id: "mooving-default" } }, null, 2)
  },
  {
    name: "create_project",
    description: "Crea un nuevo proyecto. Úsala cuando el usuario quiera agregar un proyecto a un cliente.",
    payload_template: JSON.stringify({ toolName: "create_project", params: { client_id: "{{client_id}}", name: "{{name}}", company_id: "mooving-default" } }, null, 2)
  },
  {
    name: "update_project",
    description: "Actualiza un proyecto existente por su ID.",
    payload_template: JSON.stringify({ toolName: "update_project", params: { id: "{{id}}", client_id: "{{client_id}}", name: "{{name}}" } }, null, 2)
  },
  {
    name: "delete_project",
    description: "Elimina un proyecto por su ID.",
    payload_template: JSON.stringify({ toolName: "delete_project", params: { id: "{{id}}" } }, null, 2)
  },
  {
    name: "get_employees",
    description: "Lista todos los empleados. Úsala cuando el usuario pregunte por el equipo o necesite un ID de empleado.",
    payload_template: JSON.stringify({ toolName: "get_employees", params: { company_id: "mooving-default" } }, null, 2)
  },
  {
    name: "create_employee",
    description: "Crea un nuevo empleado.",
    payload_template: JSON.stringify({ toolName: "create_employee", params: { name: "{{name}}", email: "{{email}}", company_id: "mooving-default" } }, null, 2)
  },
  {
    name: "update_employee",
    description: "Actualiza un empleado existente por su ID.",
    payload_template: JSON.stringify({ toolName: "update_employee", params: { id: "{{id}}", name: "{{name}}", email: "{{email}}" } }, null, 2)
  },
  {
    name: "delete_employee",
    description: "Elimina un empleado por su ID.",
    payload_template: JSON.stringify({ toolName: "delete_employee", params: { id: "{{id}}" } }, null, 2)
  },
  {
    name: "get_categories",
    description: "Lista todas las categorías de trabajo disponibles.",
    payload_template: JSON.stringify({ toolName: "get_categories", params: { company_id: "mooving-default" } }, null, 2)
  },
  {
    name: "create_category",
    description: "Crea una nueva categoría de trabajo.",
    payload_template: JSON.stringify({ toolName: "create_category", params: { name: "{{name}}", company_id: "mooving-default" } }, null, 2)
  },
  {
    name: "update_category",
    description: "Actualiza una categoría de trabajo.",
    payload_template: JSON.stringify({ toolName: "update_category", params: { id: "{{id}}", name: "{{name}}" } }, null, 2)
  },
  {
    name: "delete_category",
    description: "Elimina una categoría de trabajo.",
    payload_template: JSON.stringify({ toolName: "delete_category", params: { id: "{{id}}" } }, null, 2)
  },
  {
    name: "get_time_records",
    description: "Lista registros de horas. Úsala cuando el usuario quiera ver sus horas cargadas, verificar registros o revisar lo que cargó en un mes.",
    payload_template: JSON.stringify({ toolName: "get_time_records", params: { company_id: "mooving-default", month: "{{month}}", employee_id: "{{employee_id}}" } }, null, 2)
  },
  {
    name: "create_time_record_v2",
    description: "Carga un único registro de tiempo para un empleado. Úsala cuando el usuario quiera registrar horas trabajadas para un día específico.",
    payload_template: JSON.stringify({ toolName: "create_time_record", params: { employee_id: "{{employee_id}}", client_id: "{{client_id}}", project_id: "{{project_id}}", duration_decimal: "{{duration_decimal}}", date: "{{date}}", work_type: "{{work_type}}", description: "{{description}}", company_id: "mooving-default" } }, null, 2)
  },
  {
    name: "create_bulk_time_records",
    description: "Carga múltiples registros de horas de forma masiva. SIEMPRE úsala cuando el usuario pida cargar horas para varios días, todos los martes, hasta fin de mes, de forma recurrente o en un rango de fechas.",
    payload_template: JSON.stringify({ toolName: "create_bulk_time_records", params: { employee_id: "{{employee_id}}", client_id: "{{client_id}}", project_id: "{{project_id}}", duration_decimal: "{{duration_decimal}}", start_date: "{{start_date}}", end_date: "{{end_date}}", days_of_week: "{{days_of_week}}", work_type: "{{work_type}}", description: "{{description}}", company_id: "mooving-default" } }, null, 2)
  },
  {
    name: "get_availability_metrics",
    description: "Obtiene métricas de disponibilidad del equipo: horas disponibles, cargadas y porcentaje de ocupación.",
    payload_template: JSON.stringify({ toolName: "get_availability_metrics", params: { company_id: "mooving-default", month: "{{month}}" } }, null, 2)
  },
  {
    name: "get_employee_insights",
    description: "Obtiene el resumen de horas y desempeño de un empleado específico.",
    payload_template: JSON.stringify({ toolName: "get_employee_insights", params: { company_id: "mooving-default", employee_id: "{{employee_id}}", month: "{{month}}" } }, null, 2)
  },
  {
    name: "audit_timesheet",
    description: "Audita la hoja de horas y detecta empleados con horas faltantes o inconsistencias.",
    payload_template: JSON.stringify({ toolName: "audit_timesheet", params: { company_id: "mooving-default", month: "{{month}}" } }, null, 2)
  },
  {
    name: "parse_natural_language_hours",
    description: "Procesa texto en lenguaje natural (como 'cargué 4 horas en Decathlon') y devuelve datos estructurados para confirmar antes de cargar. Úsala como paso previo antes de create_time_record.",
    payload_template: JSON.stringify({ toolName: "parse_natural_language_hours", params: { text: "{{text}}", company_id: "mooving-default" } }, null, 2)
  },
  {
    name: "senda_widget_action",
    description: "Reenvía un mensaje en lenguaje natural a la API de Senda AI y retorna la respuesta. Úsala cuando el usuario haga preguntas conversacionales o consultas que requieran contexto de IA.",
    payload_template: JSON.stringify({ toolName: "senda_widget_action", params: { message: "{{message}}", company_id: "mooving-default", space: "tramia" } }, null, 2)
  },
  {
    name: "senda_bulk_load",
    description: "Carga masiva de horas para un rango de fechas. SIEMPRE úsala cuando el usuario pida cargar horas de forma masiva para múltiples días con un rango de fechas, especificando empleado, cliente, proyecto y horas diarias.",
    payload_template: JSON.stringify({ toolName: "senda_bulk_load", params: { company_id: "mooving-default", employee_id: "{{employee_id}}", client_id: "{{client_id}}", project_id: "{{project_id}}", description: "{{description}}", hours_per_day: "{{hours_per_day}}", start_date: "{{start_date}}", end_date: "{{end_date}}", days_of_week: "{{days_of_week}}" } }, null, 2)
  }
];

const HEADERS_JSON = JSON.stringify({
  "Authorization": `Bearer ${MCP_TOKEN}`,
  "Content-Type": "application/json"
}, null, 2);

async function run() {
  // Login
  console.log("Logging in...");
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: "monica@mooving.ai", password: process.env.SENDA_ADMIN_PASSWORD || "" })
  });
  
  const setCookie = loginRes.headers.get('set-cookie');
  if (!setCookie) { console.error("No cookie returned, login failed"); return; }
  const cookie = setCookie.split(';')[0];
  console.log("Login OK. Cookie:", cookie.substring(0, 30) + "...");

  const headers = {
    'Content-Type': 'application/json',
    'Cookie': cookie
  };

  // Get existing actions
  const actRes = await fetch(`${API_URL}/actions`, { headers });
  const actData = await actRes.json();
  const existing = (actData.actions || actData.data || actData || []);
  const existingNames = new Set(existing.map(a => a.name));
  console.log(`\nExisting actions (${existing.length}):`, [...existingNames].join(', '));

  // Create missing actions
  let created = 0, skipped = 0, failed = 0;
  for (const action of ACTIONS) {
    if (existingNames.has(action.name)) {
      console.log(`⏭️  Skip (exists): ${action.name}`);
      skipped++;
      continue;
    }

    const body = {
      name: action.name,
      description: action.description,
      endpoint: MCP_ENDPOINT,
      method: "POST",
      headers_json: HEADERS_JSON,
      payload_template: action.payload_template,
      action_type: "http",
      api_key: null,
      parameters: null,
      directive: "",
      ui_render_type: "text",
      ui_render_config: null,
      folder: "Panel Horas",
      tags: null,
      technical_docs: null,
      tool_name: null,
      is_active: 1,
      auth_type: "bearer",
      oauth_config: null,
      mcp_server_url: null,
      mcp_tool_name: null,
      script_code: null,
      response_directive: null
    };

    const res = await fetch(`${API_URL}/actions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (res.ok || res.status === 201) {
      const result = await res.json();
      console.log(`✅ Created: ${action.name} (ID: ${result.id || result.action_id || 'unknown'})`);
      created++;
    } else {
      const text = await res.text();
      console.log(`❌ Failed: ${action.name} — Status ${res.status}: ${text}`);
      failed++;
    }
  }

  console.log(`\n📊 Summary: ${created} created, ${skipped} skipped, ${failed} failed.`);
  
  // Now let's assign all actions to the agent
  console.log("\nFetching agents to assign actions...");
  const agRes = await fetch(`${API_URL}/agents`, { headers });
  if (agRes.ok) {
    const agData = await agRes.json();
    const agents = agData.agents || agData || [];
    console.log(`Found ${agents.length} agent(s).`);
    if (agents.length > 0) {
      const agentId = agents[0].id;
      console.log(`Agent: ${agents[0].name || agentId}`);
    }
  } else {
    console.log("Could not fetch agents:", agRes.status);
  }
}

run().catch(console.error);
