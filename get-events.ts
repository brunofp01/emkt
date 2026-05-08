import { supabaseAdmin } from "./src/shared/lib/supabase";
async function run() {
  const { data } = await supabaseAdmin
    .from('EmailEvent')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(10);
  console.log(data);
}
run();
