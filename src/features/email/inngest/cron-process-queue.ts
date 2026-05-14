import { inngest } from "@/shared/lib/inngest";
import { supabaseAdmin } from "@/shared/lib/supabase";

/**
 * Inngest Cron — Process Queue
 * 
 * Substitui o Vercel Cron (limitado no plano Hobby) para processar 
 * a fila de emails a cada minuto.
 */
export const cronProcessQueue = inngest.createFunction(
  { 
    id: "cron-process-queue", 
    name: "Cron — Process Email Queue",
    triggers: [
      { cron: "* * * * *" },
      { event: "email/cron-process-queue" }
    ]
  },
  async ({ step }) => {
    // 1. Buscar contatos QUEUED (lote de 100)
    const contacts = await step.run("fetch-queued-contacts", async () => {
      const { data, error } = await supabaseAdmin
        .from("CampaignContact")
        .select("id, contactId, currentStepId, campaignId")
        .eq("stepStatus", "QUEUED")
        .limit(100);
      
      if (error) throw error;
      return data || [];
    });

    if (contacts.length === 0) return { message: "Fila vazia" };

    // 2. Buscar steps envolvidos
    const stepIds = [...new Set(contacts.map(c => c.currentStepId).filter(Boolean))];
    const { data: steps } = await supabaseAdmin
      .from("CampaignStep")
      .select("id, subject, htmlBody, textBody")
      .in("id", stepIds);

    const stepMap = new Map((steps || []).map(s => [s.id, s]));

    // 3. Preparar eventos para o Inngest
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
      // 4. Despachar envios
      await inngest.send(inngestEvents);

      // 5. Marcar como SENDING
      const ids = inngestEvents.map(e => e.data.campaignContactId);
      await step.run("mark-as-sending", async () => {
        await supabaseAdmin
          .from("CampaignContact")
          .update({ stepStatus: "SENDING", updatedAt: new Date().toISOString() })
          .in("id", ids);
      });
    }

    return { dispatched: inngestEvents.length };
  }
);
