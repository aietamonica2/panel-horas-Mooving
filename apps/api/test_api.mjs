async function fetchRecords() {
  const res = await fetch('https://panel-horas-api.aietamonica.workers.dev/api/data/records');
  const data = await res.json();
  console.log(`Total records from API: ${data.data.records.length}`);
  
  const clients = new Set(data.data.records.map((r) => r.client_name));
  console.log('Clients in API response:', Array.from(clients));
}

fetchRecords();
