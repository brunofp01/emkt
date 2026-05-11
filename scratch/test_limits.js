import { supabaseAdmin as supabase } from '../src/shared/lib/supabase.js';

async function testFetch() {
  const { data, count, error } = await supabase
    .from('Contact')
    .select('*', { count: 'exact' });
    
  console.log('Total in DB (count):', count);
  console.log('Data length returned:', data?.length);
  
  const { data: data2 } = await supabase
    .from('Contact')
    .select('*')
    .range(0, 4999);
    
  console.log('Data length returned with range(0, 4999):', data2?.length);
}

testFetch();
