require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://tlkdjmzinrsizqgelowq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsa2RqbXppbnJzaXpxZ2Vsb3dxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzk5OTg0NiwiZXhwIjoyMDkzNTc1ODQ2fQ.bHsAD7DbljWkifAq3VcFHxvKOzEWcULE6uqqOrrBh9A'
);
const { getEffectiveDailyLimit } = require('../src/features/email/lib/warmup-engine');

async function run() {
  const { data: providers, error } = await supabase.from('ProviderConfig').select('*').eq('isActive', true);
  if (error) throw error;
  
  let totalCapacity = 0;
  for (const p of providers) {
    const effectiveLimit = getEffectiveDailyLimit(
      p.dailyLimit,
      p.accountTier || 'NOVA',
      new Date(p.warmupStartedAt || p.createdAt)
    );
    const available = Math.max(0, effectiveLimit - (p.dailySent || 0));
    console.log(`${p.provider}: Tier=${p.accountTier}, Limit=${effectiveLimit}, Sent=${p.dailySent}, Available=${available}`);
    totalCapacity += available;
  }
  console.log(`TOTAL CAPACITY AVAILABLE: ${totalCapacity}`);
}
run();
