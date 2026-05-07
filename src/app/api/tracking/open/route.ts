
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/shared/lib/supabase";
import { inngest } from "@/shared/lib/inngest";

/**
 * Tracking Pixel — Open (Hardened)
 * Retorna uma imagem 1x1 transparente e registra o evento.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const campaignContactId = searchParams.get("ccid");

  // Imagem 1x1 transparente (GIF)
  const pixel = Buffer.from(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    "base64"
  );

  if (!campaignContactId) {
    return new NextResponse(pixel, {
      headers: { "Content-Type": "image/gif", "Cache-Control": "no-store" },
    });
  }

  try {
    // 1. Buscar vínculo da campanha
    const { data: cc, error: ccError } = await supabaseAdmin
      .from('CampaignContact')
      .select('contactId, lastMessageId, stepStatus')
      .eq('id', campaignContactId)
      .single();

    if (!ccError && cc) {
      // 2. Registrar evento e atualizar status se for a primeira abertura
      const updates = [];
      
      // Registrar evento de abertura
      updates.push(
        supabaseAdmin.from('EmailEvent').insert({
          contactId: cc.contactId,
          messageId: cc.lastMessageId || 'pixel-open',
          provider: "TRACKING_PIXEL",
          eventType: "OPENED",
          timestamp: new Date().toISOString(),
          userAgent: req.headers.get("user-agent"),
          ip: req.headers.get("x-forwarded-for")?.split(",")[0],
        })
      );

      // Atualizar status na régua se ainda não estiver como aberto/clicado
      if (cc.stepStatus === 'SENT' || cc.stepStatus === 'DELIVERED') {
        updates.push(
          supabaseAdmin
            .from('CampaignContact')
            .update({ stepStatus: 'OPENED', lastOpenedAt: new Date().toISOString() })
            .eq('id', campaignContactId)
        );
      }

      // Notificar Inngest para disparar próximas etapas se necessário
      updates.push(
        inngest.send({
          name: "email/opened",
          data: { contactId: cc.contactId, campaignContactId },
        })
      );

      await Promise.all(updates);
    }
  } catch (err) {
    console.error("[Tracking Open Error]", err);
  }

  return new NextResponse(pixel, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
}
