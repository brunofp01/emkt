const URL = "https://tlkdjmzinrsizqgelowq.supabase.co/rest/v1/Contact?select=*";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsa2RqbXppbnJzaXpxZ2Vsb3dxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5OTk4NDYsImV4cCI6MjA5MzU3NTg0Nn0.3EknUlLByyK9kpqqPplDF3izSFE3EEwr6XABeat9Z78";

async function check() {
  const res = await fetch(URL, {
    headers: {
      "apikey": ANON_KEY,
      "Authorization": `Bearer ${ANON_KEY}`,
      "Range": "0-10000"
    }
  });
  const data = await res.json();
  console.log("Returned length:", data.length);
  console.log("Content-Range header:", res.headers.get("Content-Range"));
}

check();
