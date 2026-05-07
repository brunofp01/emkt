/**
 * Tracking Proxy — Click (Hardened)
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/shared/lib/supabase";
import { inngest } from "@/shared/lib/inngest";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get("url");
  const campaignContactId = searchParams.get("ccid");

  if (!targetUrl || !campaignContactId) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  try {
    // 1. Buscar vínculo da campanha via Admin (Bypass RLS para velocidade)
    const { data: cc, error: ccError } = await supabaseAdmin
      .from('CampaignContact')
      .select('contactId, lastMessageId')
      .eq('id', campaignContactId)
      .single();

    if (!ccError && cc) {
      // 2. Atualizar Tags e Registro de Evento em Paralelo
      const { data: contact } = await supabaseAdmin
        .from('Contact')
        .select('tags')
        .eq('id', cc.contactId)
        .single();
      
      const currentTags = contact?.tags || [];
      const tagUpdates = !currentTags.includes('CLICKED') 
        ? supabaseAdmin.from('Contact').update({ tags: [...currentTags, 'CLICKED'] }).eq('id', cc.contactId)
        : Promise.resolve();

      await Promise.all([
        tagUpdates,
        supabaseAdmin.from('EmailEvent').insert({
          contactId: cc.contactId,
          messageId: cc.lastMessageId || 'direct-click',
          provider: "TRACKING_PROXY",
          eventType: "CLICKED",
          clickedUrl: targetUrl,
          timestamp: new Date().toISOString(),
        }),
        inngest.send({
          name: "email/clicked",
          data: { 
            contactId: cc.contactId, 
            campaignContactId, 
            url: targetUrl 
          },
        })
      ]);
    }

    // 3. Redirecionamento Instantâneo (UX World-Class)
    return NextResponse.redirect(targetUrl);
  } catch (err) {
    console.error("[Tracking Error]", err);
    return NextResponse.redirect(targetUrl); // Fallback: redireciona mesmo se o log falhar
  }
}
