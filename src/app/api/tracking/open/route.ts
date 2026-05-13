/**
 * Tracking Pixel — Open (Hardened)
 * Retorna uma imagem 1x1 transparente e registra o evento de abertura.
 * Atualiza o stepStatus do CampaignContact na hierarquia correta.
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/shared/lib/supabase";
import { inngest } from "@/shared/lib/inngest";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

// Deduplicação: evita múltiplos opens do mesmo ccid em janela de 30s
const recentOpens = new Map<string, number>();
const DEDUP_WINDOW_MS = 30_000;

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
    // Deduplicação: ignorar opens repetidos do mesmo ccid em 30s
    const now = Date.now();
    const lastOpen = recentOpens.get(campaignContactId);
    if (lastOpen && (now - lastOpen) < DEDUP_WINDOW_MS) {
      return new NextResponse(PIXEL, {
        headers: { "Content-Type": "image/gif", "Cache-Control": "no-store" },
      });
    }
    recentOpens.set(campaignContactId, now);
    // Limpar entradas antigas periodicamente
    if (recentOpens.size > 1000) {
      for (const [key, ts] of recentOpens) {
        if (now - ts > DEDUP_WINDOW_MS) recentOpens.delete(key);
      }
    }

    // 1. Buscar vínculo da campanha
    const { data: cc, error: ccError } = await supabaseAdmin
      .from('CampaignContact')
      .select('contactId, lastMessageId, stepStatus, contact:Contact(provider)')
      .eq('id', campaignContactId)
      .single();

    if (!ccError && cc) {
      const provider = (cc as any).contact?.provider || 'SMTP';
      const timestamp = new Date().toISOString();

      // 2. Registrar evento de abertura
      await supabaseAdmin.from('EmailEvent').insert({
        id: randomUUID(),
        externalId: `open_${campaignContactId}_${Date.now()}`,
        contactId: cc.contactId,
        messageId: cc.lastMessageId || 'pixel-open',
        provider: provider,
        eventType: "OPENED",
        timestamp,
        userAgent: req.headers.get("user-agent") || null,
        ip: req.headers.get("x-forwarded-for")?.split(",")[0] || null,
      });

      // 3. Atualizar stepStatus para OPENED se estiver em um status inferior
      // Hierarquia: QUEUED < SENDING < SENT < DELIVERED < OPENED < CLICKED
      // Nunca retroceder: se já está como CLICKED, não voltar para OPENED
      const promotableStatuses = ['QUEUED', 'SENDING', 'SENT', 'DELIVERED'];
      if (promotableStatuses.includes(cc.stepStatus)) {
        await supabaseAdmin
          .from('CampaignContact')
          .update({ 
            stepStatus: 'OPENED', 
            lastOpenedAt: timestamp,
            updatedAt: timestamp 
          })
          .eq('id', campaignContactId);
      }

      // 4. Notificar Inngest para disparar próximas etapas
      try {
        await inngest.send({
          name: "email/opened",
          data: { contactId: cc.contactId, campaignContactId },
        });
      } catch (inngestErr) {
        // Não bloquear o tracking se o Inngest falhar
        console.error("[Tracking Open] Inngest error:", inngestErr);
      }
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
