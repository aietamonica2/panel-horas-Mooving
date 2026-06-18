const API_URL = "https://sendaqa.telar.ai/api";

async function login() {
  const payload = {
    email: "monica@mooving.ai",
    password: "Mooving321"
  };

  const res = await fetch(`${API_URL}/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  if (!res.ok) {
     const text = await res.text();
     console.log("Failed. Try another endpoint. Status:", res.status, text);
     
     // try /api/auth/login
     const res2 = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      console.log("Try 2:", res2.status, await res2.text());
  } else {
     console.log("Success:", await res.json());
  }
}

login().catch(console.error);
