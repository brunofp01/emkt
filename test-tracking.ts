import { supabaseAdmin } from "./src/shared/lib/supabase";

async function test() {
  // 1. Pegar um CampaignContact recente
  const { data: cc, error: fetchError } = await supabaseAdmin
    .from('CampaignContact')
    .select('id, contactId, stepStatus')
    .order('createdAt', { ascending: false })
    .limit(1)
    .single();

  if (fetchError || !cc) {
    console.error("Erro ao buscar CampaignContact:", fetchError);
    return;
  }

  console.log("CampaignContact selecionado:", cc);

  const baseUrl = "https://mktemail.vercel.app";

  // 2. Testar o endpoint de Open
  console.log("\n--- Testando Endpoint Open ---");
  const openUrl = `${baseUrl}/api/tracking/open?ccid=${cc.id}`;
  console.log("URL:", openUrl);
  try {
    const openRes = await fetch(openUrl);
    console.log("Status Open:", openRes.status);
  } catch (e) {
    console.error("Erro no fetch open:", e);
  }

  // Verificar status no banco apos open
  const { data: ccAfterOpen } = await supabaseAdmin
    .from('CampaignContact')
    .select('stepStatus')
    .eq('id', cc.id)
    .single();
  console.log("Status após Open:", ccAfterOpen?.stepStatus);

  // 3. Testar o endpoint de Click
  console.log("\n--- Testando Endpoint Click ---");
  const targetUrl = Buffer.from("https://google.com").toString('base64');
  const clickUrl = `${baseUrl}/api/tracking/click?ccid=${cc.id}&url=${targetUrl}`;
  console.log("URL:", clickUrl);
  try {
    const clickRes = await fetch(clickUrl, { redirect: 'manual' });
    console.log("Status Click:", clickRes.status);
    console.log("Redirect Location:", clickRes.headers.get('location'));
  } catch (e) {
    console.error("Erro no fetch click:", e);
  }

  // Verificar status no banco apos click
  const { data: ccAfterClick } = await supabaseAdmin
    .from('CampaignContact')
    .select('stepStatus')
    .eq('id', cc.id)
    .single();
  console.log("Status após Click:", ccAfterClick?.stepStatus);

  // Verificar eventos criados
  const { data: events } = await supabaseAdmin
    .from('EmailEvent')
    .select('eventType, timestamp, clickedUrl')
    .eq('contactId', cc.contactId)
    .order('timestamp', { ascending: false });
  console.log("\nEventos do contato:", events);
}

test().catch(console.error);
