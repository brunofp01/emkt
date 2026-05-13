/**
 * Cron Job — Process Queue
 * 
 * Busca contatos QUEUED e despacha via Inngest para aproveitamento
 * da roleta de provedores com fallback automático.
 * 
 * Segurança: Requer CRON_SECRET no header Authorization.
 */
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/shared/lib/supabase";
import { inngest } from "@/shared/lib/inngest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  try {
    // 1. Autenticação obrigatória
    const CRON_SECRET = process.env.CRON_SECRET;
    const authHeader = req.headers.get("authorization");
    
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Buscar contatos QUEUED (lote de 20)
    const { data: contacts, error: fetchError } = await supabaseAdmin
      .from("CampaignContact")
      .select("id, contactId, currentStepId, campaignId")
      .eq("stepStatus", "QUEUED")
      .limit(20);

    if (fetchError) throw fetchError;

    if (!contacts || contacts.length === 0) {
      return NextResponse.json({ message: "Nenhum contato na fila." });
    }

    // 3. Buscar stepConfig para cada contato e despachar via Inngest
    //    Isto garante que CADA email passa pela roleta de provedores individualmente
    const stepIds = [...new Set(contacts.map(c => c.currentStepId).filter(Boolean))];
    const { data: steps } = await supabaseAdmin
      .from("CampaignStep")
      .select("id, subject, htmlBody, textBody")
      .in("id", stepIds);

    const stepMap = new Map((steps || []).map(s => [s.id, s]));

    const inngestEvents = contacts
      .filter(cc => cc.currentStepId && stepMap.has(cc.currentStepId))
      .map(cc => {
        const step = stepMap.get(cc.currentStepId)!;
        return {
          name: "email/send" as const,
          data: {
            contactId: cc.contactId,
            campaignContactId: cc.id,
            subject: step.subject,
            htmlBody: step.htmlBody,
            textBody: step.textBody,
          },
        };
      });

    if (inngestEvents.length > 0) {
      // Batch send — 1 requisição HTTP para todos os eventos
      await inngest.send(inngestEvents);

      // Marcar como SENDING para evitar re-processamento
      const ids = inngestEvents.map(e => e.data.campaignContactId);
      await supabaseAdmin
        .from("CampaignContact")
        .update({ stepStatus: "SENDING", updatedAt: new Date().toISOString() })
        .in("id", ids);
    }

    return NextResponse.json({ 
      success: true, 
      dispatched: inngestEvents.length,
      skipped: contacts.length - inngestEvents.length 
    });
  } catch (error: any) {
    console.error("Cron Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
