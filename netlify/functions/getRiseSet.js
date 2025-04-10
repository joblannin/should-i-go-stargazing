export async function handler(event) {
    try {
      const { lat, lon } = JSON.parse(event.body);
  
      const APP_ID = "1f9aebb3-1f89-4975-ba54-a17d427f92fc";
      const APP_SECRET = "e5e4eb150295507b410152f04137ed4366b28521b749b68120d045a31f7d9f76075ad6e51712a7dc7a356caa4f1c2c8c2402770a8546de663873e52c558318e752df082a2a580dff4155a0f1015f66f242f12becb0224c9f932737fca2c16701e865cbe73b621573980bbdac97bfcd36";
  
      // Step 1: Authenticate
      const authRes = await fetch("https://api.astronomyapi.com/api/v2/authenticate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET }),
      });
  
      const authData = await authRes.json();
  
      if (!authData?.data?.token) {
        console.error("Authentication failed:", authData);
        return {
          statusCode: 500,
          body: JSON.stringify({ error: "Authentication failed", details: authData }),
        };
      }
  
      const token = authData.data.token;
  
      // Step 2: Call rise/set endpoint
      const today = new Date().toISOString().split("T")[0];
  
      const url = `https://api.astronomyapi.com/api/v2/bodies/rise-set?latitude=${lat}&longitude=${lon}&from_date=${today}&to_date=${today}&bodies=moon,jupiter,saturn,venus,mars`;
  
      const riseSetRes = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
  
      const riseSetData = await riseSetRes.json();
  
      if (!riseSetData?.data?.table?.rows) {
        console.error("Rise/set data missing or malformed:", riseSetData);
        return {
          statusCode: 500,
          body: JSON.stringify({ error: "Invalid rise/set data", details
  