const { Client } = require('pg');

const regions = [
  'ap-southeast-1', 'ap-northeast-1', 'ap-northeast-2', 'ap-south-1',
  'ca-central-1', 'eu-central-1', 'eu-west-1', 'eu-west-2', 'eu-west-3',
  'sa-east-1', 'us-east-1', 'us-west-1', 'us-west-2', 'us-east-2'
];

const pass = 'Joca@22cbacbA';
const projectRef = 'tlkdjmzinrsizqgelowq';

async function testRegions() {
  for (const region of regions) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    const client = new Client({
      host: host,
      port: 6543,
      user: `postgres.${projectRef}`,
      password: pass,
      database: 'postgres',
      ssl: { rejectUnauthorized: false }
    });

    try {
      await client.connect();
      console.log(`✅ SUCCESS! Region: ${region}`);
      await client.end();
      return region;
    } catch (err) {
      if (!err.message.includes("Tenant or user not found") && !err.message.includes("tenant/user")) {
        console.log(`⚠️ ${region}: ${err.message}`);
      }
    }
  }
  console.log("Could not connect to any region.");
}

testRegions();
