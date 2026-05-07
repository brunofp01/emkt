/**
 * Tracking Pixel — Open (Hardened)
 * Retorna uma imagem 1x1 transparente e registra o evento.
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/shared/lib/supabase";
import { inngest } from "@/shared/lib/inngest";

const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

// Imagem 1x1 transparente (GIF)
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const campaignContactId = searchParams.get("ccid");

  if (!campaignContactId) {
    return new NextResponse(PIXEL, {
      headers: { "Content-Type": "image/gif", "Cache-Control": "no-store" },
    });
  }

  try {
    // 1. Buscar vínculo da campanha
    const { data: cc, error: ccError } = await supabaseAdmin
      .from('CampaignContact')
      .select('contactId, lastMessageId, stepStatus, contact:Contact(provider)')
      .eq('id', campaignContactId)
      .single();

    if (!ccError && cc) {
      const provider = (cc as any).contact?.provider || 'RESEND';

      // 2. Registrar evento de abertura
      await supabaseAdmin.from('EmailEvent').insert({
        id: generateId(),
        externalId: `open_${campaignContactId}_${Date.now()}`,
        contactId: cc.contactId,
        messageId: cc.lastMessageId || 'pixel-open',
        provider: provider,
        eventType: "OPENED",
        timestamp: new Date().toISOString(),
        userAgent: req.headers.get("user-agent") || null,
        ip: req.headers.get("x-forwarded-for")?.split(",")[0] || null,
      });

      // 3. Atualizar status se ainda não estiver como aberto/clicado
      if (cc.stepStatus === 'SENT' || cc.stepStatus === 'DELIVERED') {
        await supabaseAdmin
          .from('CampaignContact')
          .update({ stepStatus: 'OPENED', lastOpenedAt: new Date().toISOString() })
          .eq('id', campaignContactId);
      }

      // 4. Notificar Inngest para disparar próximas etapas
      await inngest.send({
        name: "email/opened",
        data: { contactId: cc.contactId, campaignContactId },
      });
    }
  } catch (err) {
    console.error("[Tracking Open Error]", err);
  }

  return new NextResponse(PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
}
