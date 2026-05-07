/**
 * Tracking Endpoint — Captura cliques e redireciona.
 * 
 * Fluxo:
 * 1. Recebe CCID (CampaignContactID) e URL (Base64)
 * 2. Registra o evento de CLICK no banco (Supabase HTTPS)
 * 3. Dispara evento para o Inngest (para automação)
 * 4. Redireciona o usuário para o destino final.
 */
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/shared/lib/supabase";
import { inngest } from "@/shared/lib/inngest";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const campaignContactId = searchParams.get("ccid");
  const encodedUrl = searchParams.get("url");

  if (!campaignContactId || !encodedUrl) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  try {
    // 1. Decodificar a URL de destino
    const targetUrl = Buffer.from(encodedUrl, 'base64').toString('utf-8');

    // 2. Buscar informações do contato e campanha via HTTPS
    const { data: cc, error: ccError } = await supabase
      .from('CampaignContact')
      .select('id, contactId, lastMessageId')
      .eq('id', campaignContactId)
      .single();

    if (!ccError && cc) {
      // 3. Atualizar Tags do Contato (Segmentação Automática)
      const { data: contact } = await supabase
        .from('Contact')
        .select('tags')
        .eq('id', cc.contactId)
        .single();
      
      const currentTags = contact?.tags || [];
      if (!currentTags.includes('CLICKED')) {
        await supabase
          .from('Contact')
          .update({ tags: [...currentTags, 'CLICKED'] })
          .eq('id', cc.contactId);
      }

      // 4. Registrar o evento de CLICK via HTTPS
      await supabase.from('EmailEvent').insert({
        contactId: cc.contactId,
        messageId: cc.lastMessageId || 'direct-click',
        eventType: 'CLICKED',
        clickedUrl: targetUrl,
        ip: req.headers.get("x-forwarded-for")?.split(',')[0] || null,
        userAgent: req.headers.get("user-agent") || null,
        timestamp: new Date().toISOString(),
      });

      // 4. Notificar o Inngest que houve interação (isso pode disparar próximas etapas da régua)
      await inngest.send({
        name: "email/clicked",
        data: { 
          campaignContactId, 
          url: targetUrl,
          messageId: cc.lastMessageId 
        }
      });
      
      // Também marcar como aberto se ainda não estiver (clique implica abertura)
      await inngest.send({
        name: "email/opened",
        data: { messageId: cc.lastMessageId }
      });
    }

    // 5. Redirecionamento Final (o mais rápido possível)
    return NextResponse.redirect(new URL(targetUrl));
  } catch (err) {
    console.error("[Tracking Error]", err);
    // Em caso de erro, ainda tentamos redirecionar para não frustrar o usuário
    try {
      const fallbackUrl = Buffer.from(encodedUrl, 'base64').toString('utf-8');
      return NextResponse.redirect(new URL(fallbackUrl));
    } catch {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }
}
