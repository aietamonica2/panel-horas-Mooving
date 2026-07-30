import fs from 'fs';

// Helper for basic CSV parsing
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, ''));
  const results = [];
  
  for (let i = 1; i < lines.length; i++) {
    // Regex to split by comma but ignore commas inside quotes
    const regex = /(".*?"|[^",\s]+)(?=\s*,|\s*$)/g;
    const matches = lines[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
    
    // Fallback simple parsing if regex gets complicated, but standard for this file
    const values = [];
    let inQuotes = false;
    let currentVal = '';
    
    for (let char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(currentVal);
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
    values.push(currentVal);
    
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ? values[idx].replace(/^"|"$/g, '') : '';
    });
    results.push(row);
  }
  return results;
}

const csvContent = fs.readFileSync('C:\\Users\\aieta\\Documents\\Claude\\Projects\\Dashboard Horas del equipo\\detalle (3).csv', 'utf8');

const records = parseCSV(csvContent);

function sanitizeId(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function parseDate(dateStr) {
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return dateStr;
}

let sql = '';
const company_id = 'mooving-default';

for (const row of records) {
  if (!row['Usuario']) continue;
  
  const id = crypto.randomUUID();
  
  const employee_name = row['Usuario'] || 'Desconocido';
  const employee_id = sanitizeId(employee_name);
  
  const client_name = row['Cliente'] || 'Interno';
  const client_id = sanitizeId(client_name);
  
  const project_name = row['Proyecto'] || 'Sin Proyecto';
  const project_id = sanitizeId(project_name);
  
  const duration_decimal = parseFloat(row['Duración (decimal)']) || 0;
  if (duration_decimal <= 0) continue;
  
  const duration_hours = Math.floor(duration_decimal);
  const duration_minutes = Math.round((duration_decimal % 1) * 60);
  
  const rawDate = row['Fecha de inicio'] || row['Fecha de creación'];
  const date = parseDate(rawDate);
  
  const desc = (row['Descripción'] || '').replace(/'/g, "''");
  
  let work_type = 'project';
  const lowerDesc = desc.toLowerCase();
  if (project_name.toLowerCase().includes('interna') || client_name.toLowerCase().includes('mooving')) {
    work_type = 'internal';
    if (lowerDesc.includes('daily') || lowerDesc.includes('reunión') || lowerDesc.includes('weekly')) {
      work_type = 'meeting';
    }
  }
  
  sql += `INSERT INTO time_records (id, company_id, employee_id, employee_name, client_id, client_name, project_id, project_name, duration_decimal, duration_hours, duration_minutes, date, work_type, description, source) VALUES ('${id}', '${company_id}', '${employee_id}', '${employee_name.replace(/'/g, "''")}', '${client_id}', '${client_name.replace(/'/g, "''")}', '${project_id}', '${project_name.replace(/'/g, "''")}', ${duration_decimal}, ${duration_hours}, ${duration_minutes}, '${date}', '${work_type}', '${desc}', 'clockify');\n`;
}

fs.writeFileSync('C:\\Users\\aieta\\Documents\\panel-horas-Mooving\\apps\\api\\import.sql', sql);
console.log(`Generated import.sql with ${records.length} records processed.`);
