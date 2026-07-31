// Requiere variables de entorno (ver .dev.vars). NO hardcodear secretos.
const API_KEY = process.env.CLOCKIFY_API_KEY || "";
const BASE_URL = "https://api.clockify.me/api/v1";
const REPORTS_URL = "https://reports.api.clockify.me/v1";

async function testClockify() {
  try {
    // 1. Get workspaces
    console.log("Fetching workspaces...");
    const wsRes = await fetch(`${BASE_URL}/workspaces`, {
      headers: { 'X-Api-Key': API_KEY }
    });
    const workspaces = await wsRes.json();
    console.log("Workspaces:", workspaces.map(w => ({ id: w.id, name: w.name })));
    
    const targetWs = workspaces.find(w => w.name.toLowerCase().includes("mooving tech"));
    if (!targetWs) {
      console.log("Mooving Tech workspace not found. Available:", workspaces.map(w => w.name));
      return;
    }
    
    console.log(`Found target workspace: ${targetWs.name} (${targetWs.id})`);
    
    // 2. Try to fetch detailed report
    console.log("Fetching detailed report...");
    const reportRes = await fetch(`${REPORTS_URL}/workspaces/${targetWs.id}/reports/detailed`, {
      method: "POST",
      headers: {
        'X-Api-Key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        dateRangeStart: "2020-01-01T00:00:00.000Z",
        dateRangeEnd: new Date().toISOString(),
        detailedFilter: {
          page: 1,
          pageSize: 10 // Just fetch 10 for testing
        }
      })
    });
    
    if (!reportRes.ok) {
      console.log("Report API error:", await reportRes.text());
      return;
    }
    
    const report = await reportRes.json();
    console.log(`Found ${report.timeentries.length} time entries in this page.`);
    if (report.timeentries.length > 0) {
      console.log("Sample entry:");
      console.log(JSON.stringify(report.timeentries[0], null, 2));
    }
    
  } catch (err) {
    console.error(err);
  }
}

testClockify();
