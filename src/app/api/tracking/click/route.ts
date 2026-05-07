/**
 * Tracking Proxy — Click (Hardened)
 * Decodifica URL Base64, registra evento e redireciona.
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/shared/lib/supabase";
import { inngest } from "@/shared/lib/inngest";

const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetUrlEncoded = searchParams.get("url");
  const campaignContactId = searchParams.get("ccid");

  // Decodificar URL do Base64
  const targetUrl = targetUrlEncoded 
    ? Buffer.from(targetUrlEncoded, 'base64').toString('utf-8') 
    : null;

  if (!targetUrl || !campaignContactId) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  try {
    // 1. Buscar vínculo da campanha via Admin (Bypass RLS)
    const { data: cc, error: ccError } = await supabaseAdmin
      .from('CampaignContact')
      .select('contactId, lastMessageId, contact:Contact(provider, tags)')
      .eq('id', campaignContactId)
      .single();

    if (!ccError && cc) {
      const contact = (cc as any).contact;
      const provider = contact?.provider || 'RESEND';
      const currentTags = contact?.tags || [];

      // 2. Registrar evento + atualizar tags em paralelo
      const updates: any[] = [
        // Registrar evento de clique
        supabaseAdmin.from('EmailEvent').insert({
          id: generateId(),
          externalId: `click_${campaignContactId}_${Date.now()}`,
          contactId: cc.contactId,
          messageId: cc.lastMessageId || 'direct-click',
          provider: provider,
          eventType: "CLICKED",
          clickedUrl: targetUrl,
          timestamp: new Date().toISOString(),
          ip: req.headers.get("x-forwarded-for")?.split(",")[0] || null,
          userAgent: req.headers.get("user-agent") || null,
        }),
        // Notificar Inngest
        inngest.send({
          name: "email/clicked",
          data: { 
            contactId: cc.contactId, 
            campaignContactId, 
            url: targetUrl 
          },
        }),
      ];

      // Adicionar tag CLICKED se não existir
      if (!currentTags.includes('CLICKED')) {
        updates.push(
          supabaseAdmin.from('Contact')
            .update({ tags: [...currentTags, 'CLICKED'] })
            .eq('id', cc.contactId)
        );
      }

      await Promise.all(updates);
    }

    // 3. Redirecionamento instantâneo
    return NextResponse.redirect(targetUrl);
  } catch (err) {
    console.error("[Tracking Click Error]", err);
    return NextResponse.redirect(targetUrl); // Fallback: redireciona mesmo se o log falhar
  }
}
