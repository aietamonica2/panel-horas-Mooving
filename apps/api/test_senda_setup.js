const API_URL = "https://sendaqa.telar.ai/api";
const MCP_URL = "https://panel-horas-api.aietamonica.workers.dev/api/protected/mcp/v1/tools/call";

const actionsToCreate = [
  { name: 'get_clients', desc: 'Obtener la lista de clientes', method: 'POST', tool: 'get_clients' },
  { name: 'create_client', desc: 'Crear un nuevo cliente', method: 'POST', tool: 'create_client' },
  { name: 'update_client', desc: 'Actualizar un cliente', method: 'POST', tool: 'update_client' },
  { name: 'delete_client', desc: 'Eliminar un cliente', method: 'POST', tool: 'delete_client' },
  { name: 'get_projects', desc: 'Obtener la lista de proyectos', method: 'POST', tool: 'get_projects' },
  { name: 'create_project', desc: 'Crear un nuevo proyecto', method: 'POST', tool: 'create_project' },
  { name: 'update_project', desc: 'Actualizar un proyecto', method: 'POST', tool: 'update_project' },
  { name: 'delete_project', desc: 'Eliminar un proyecto', method: 'POST', tool: 'delete_project' },
  { name: 'get_employees', desc: 'Obtener la lista de empleados', method: 'POST', tool: 'get_employees' },
  { name: 'create_employee', desc: 'Crear un nuevo empleado', method: 'POST', tool: 'create_employee' },
  { name: 'update_employee', desc: 'Actualizar un empleado', method: 'POST', tool: 'update_employee' },
  { name: 'delete_employee', desc: 'Eliminar un empleado', method: 'POST', tool: 'delete_employee' },
  { name: 'get_categories', desc: 'Obtener la lista de categorías', method: 'POST', tool: 'get_categories' },
  { name: 'create_category', desc: 'Crear una nueva categoría', method: 'POST', tool: 'create_category' },
  { name: 'update_category', desc: 'Actualizar una categoría', method: 'POST', tool: 'update_category' },
  { name: 'delete_category', desc: 'Eliminar una categoría', method: 'POST', tool: 'delete_category' },
  { name: 'get_time_records', desc: 'Listar registros de horas', method: 'POST', tool: 'get_time_records' },
  { name: 'get_availability_metrics', desc: 'Obtener métricas de disponibilidad', method: 'POST', tool: 'get_availability_metrics' },
  { name: 'get_employee_insights', desc: 'Obtener insights del empleado', method: 'POST', tool: 'get_employee_insights' },
  { name: 'sync_clockify_hours', desc: 'Sincronizar horas desde Clockify', method: 'POST', tool: 'sync_clockify_hours' },
  { name: 'sync_zendesk_tickets', desc: 'Sincronizar tickets de Zendesk', method: 'POST', tool: 'sync_zendesk_tickets' },
  { name: 'audit_timesheet', desc: 'Auditar hoja de horas', method: 'POST', tool: 'audit_timesheet' },
  { name: 'create_bulk_time_records', desc: 'Crear registros de forma masiva', method: 'POST', tool: 'create_bulk_time_records' },
  { name: 'create_time_record', desc: 'Cargar un registro de tiempo', method: 'POST', tool: 'create_time_record' }
];

async function run() {
  // Login
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: "monica@mooving.ai", password: "Mooving321" })
  });
  
  const setCookie = loginRes.headers.get('set-cookie');
  let cookie = '';
  if (setCookie) {
    cookie = setCookie.split(';')[0];
  } else {
    // maybe check auth token in json
    const json = await loginRes.json();
    if (json.token) cookie = `session=${json.token}`;
  }

  const headers = {
    'Content-Type': 'application/json',
    'Cookie': cookie
  };

  // 1. Get agents
  let agentId = null;
  const agRes = await fetch(`${API_URL}/agents`, { headers });
  if (agRes.ok) {
     const agJson = await agRes.json();
     if (agJson.agents && agJson.agents.length > 0) {
        agentId = agJson.agents[0].id; // assume first agent is active
        console.log("Agent ID:", agentId);
     }
  }

  // 2. Fetch all existing actions to avoid duplicates or delete them
  // We don't know the exact endpoint for actions CRUD, Senda uses /api/v1/actions probably or /api/actions in web UI
  const actRes = await fetch(`${API_URL}/config/actions`, { headers }); // guess
  let existingActions = [];
  if (actRes.ok) {
     const acts = await actRes.json();
     existingActions = acts.actions || acts.data || [];
     console.log("Found existing actions:", existingActions.length);
  } else {
     const actRes2 = await fetch(`${API_URL}/actions`, { headers });
     if (actRes2.ok) {
        const acts2 = await actRes2.json();
        existingActions = acts2.actions || acts2.data || acts2 || [];
        console.log("Found existing actions:", existingActions.length);
        
        // Try creating create_bulk_time_records
        const bulkPayload = {
          name: "create_bulk_time_records",
          description: "Permite insertar múltiples registros de horas (bulk) usando un rango de fechas o días de la semana.",
          endpoint: "https://panel-horas-api.aietamonica.workers.dev/api/protected/mcp/v1/tools/call",
          method: "POST",
          headers_json: "{\n  \"Authorization\": \"Bearer sk_live_8e8cb42b7fc7e15edf2fd6d6dadaa631713967cc1511f016a2fa76a0863e2c85\",\n  \"Content-Type\": \"application/json\"\n}",
          payload_template: "{\n  \"toolName\": \"create_bulk_time_records\",\n  \"params\": {\n    \"employee_id\": \"{{employee_id}}\",\n    \"client_id\": \"{{client_id}}\",\n    \"project_id\": \"{{project_id}}\",\n    \"duration_decimal\": \"{{duration_decimal}}\",\n    \"start_date\": \"{{start_date}}\",\n    \"end_date\": \"{{end_date}}\",\n    \"days_of_week\": \"{{days_of_week}}\",\n    \"work_type\": \"{{work_type}}\",\n    \"description\": \"{{description}}\"\n  }\n}",
          action_type: "http",
          api_key: null,
          parameters: [],
          directive: "",
          ui_render_type: "text",
          ui_render_config: null,
          folder: "General",
          tags: [],
          technical_docs: null,
          tool_name: null,
          is_active: true,
          auth_type: "bearer",
          oauth_config: null,
          mcp_server_url: null,
          mcp_tool_name: null,
          script_code: null,
          response_directive: null
        };
        
        const createRes = await fetch(`${API_URL}/actions`, {
           method: 'POST',
           headers,
           body: JSON.stringify(bulkPayload)
        });
        
        console.log("Create action status:", createRes.status, await createRes.text());
     }
  }

  console.log("Done fetching info.");
}

run().catch(console.error);
