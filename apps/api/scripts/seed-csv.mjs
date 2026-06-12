import fs from 'fs';
import path from 'path';

// Define paths
const csvPath = 'C:/Users/aieta/Documents/Claude/Projects/Dashboard Horas del equipo/detalle.csv';
const sqlOutputPath = 'C:/Users/aieta/Documents/panel-horas-Mooving/db/seed-data.sql';

// Helper to safely escape SQL strings
const escapeSql = (str) => {
  if (!str) return "''";
  return `'${str.replace(/'/g, "''")}'`;
};

// Helper to generate a slug (ID)
const generateId = (str) => {
  if (!str) return 'unknown';
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
};

// Map Work Types
const mapWorkType = (proyecto) => {
  if (!proyecto) return 'project';
  const lower = proyecto.toLowerCase();
  if (lower.includes('interna') || lower.includes('interno')) return 'internal';
  if (lower.includes('reunión') || lower.includes('reunion') || lower.includes('meeting')) return 'meeting';
  if (lower.includes('capacitación') || lower.includes('training')) return 'training';
  return 'project';
};

// Convert DD/MM/YYYY to YYYY-MM-DD
const formatDate = (dateStr) => {
  if (!dateStr) return '2026-06-01';
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return dateStr;
};

// Map boolean
const isBillable = (str) => {
  return str && str.toLowerCase().trim() === 'sí' ? 1 : 0;
};

// Parse CSV manually (assuming standard quotes format)
const parseCsvLine = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && line[i+1] === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
};

async function run() {
  console.log('Reading CSV file from:', csvPath);
  const content = fs.readFileSync(csvPath, 'utf8');
  const lines = content.split('\n').filter(l => l.trim().length > 0);
  
  console.log(`Found ${lines.length} rows (including header).`);
  
  // Skip header
  const dataLines = lines.slice(1);
  
  const sqlStatements = [
    '-- Auto-generated seed data from detalle.csv',
    'DELETE FROM time_records;',
    '-- Inserting time records...'
  ];
  
  let count = 0;
  
  for (const line of dataLines) {
    const cols = parseCsvLine(line);
    if (cols.length < 18) continue;
    
    // Columns mapping
    const proyecto = cols[0];
    const cliente = cols[1];
    const descripcion = cols[2];
    const usuarioName = cols[4];
    const usuarioEmail = cols[6];
    const facturable = cols[8];
    const fechaInicio = cols[9];
    const duracionStr = cols[13]; // e.g. "01:30:00"
    const duracionDec = parseFloat(cols[14]) || 0;
    
    // Derived fields
    const id = `rec_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    const companyId = 'mooving-default';
    const employeeId = generateId(usuarioEmail);
    const clientId = generateId(cliente);
    const projectId = generateId(proyecto);
    
    // Duration parsing
    let durationHours = 0;
    let durationMinutes = 0;
    if (duracionStr && duracionStr.includes(':')) {
      const parts = duracionStr.split(':');
      durationHours = parseInt(parts[0], 10) || 0;
      durationMinutes = parseInt(parts[1], 10) || 0;
    }
    
    const sql = `INSERT INTO time_records (
      id, company_id, employee_id, employee_name, 
      client_id, client_name, project_id, project_name, 
      duration_decimal, duration_hours, duration_minutes, 
      date, work_type, description, is_billable
    ) VALUES (
      ${escapeSql(id)}, ${escapeSql(companyId)}, ${escapeSql(employeeId)}, ${escapeSql(usuarioName)},
      ${escapeSql(clientId)}, ${escapeSql(cliente)}, ${escapeSql(projectId)}, ${escapeSql(proyecto)},
      ${duracionDec}, ${durationHours}, ${durationMinutes},
      ${escapeSql(formatDate(fechaInicio))}, ${escapeSql(mapWorkType(proyecto))}, ${escapeSql(descripcion)}, ${isBillable(facturable)}
    );`;
    
    sqlStatements.push(sql);
    count++;
  }
  
  console.log(`Generated ${count} INSERT statements.`);
  
  fs.writeFileSync(sqlOutputPath, sqlStatements.join('\n'));
  console.log(`Seed file written to: ${sqlOutputPath}`);
}

run().catch(console.error);
