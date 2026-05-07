/**
 * Inngest Function — Processa sequência da régua de marketing.
 * Refatorado para usar Supabase SDK (HTTPS).
 */
import { inngest } from "@/shared/lib/inngest";
import { supabase } from "@/shared/lib/supabase";

export const processSequence = inngest.createFunction(
  {
    id: "process-sequence",
    name: "Process Marketing Sequence Step",
    retries: 2,
    triggers: [{ event: "email/opened" }],
  },
  async ({ event, step }) => {
    const { messageId } = event.data as { messageId: string };

    // Step 1: Buscar CampaignContact pelo messageId via HTTPS
    const campaignContact = await step.run("find-campaign-contact", async () => {
      const { data, error } = await supabase
        .from('CampaignContact')
        .select(`
          *,
          campaign:Campaign(
            *,
            steps:CampaignStep(*)
          ),
          currentStep:CampaignStep(*),
          contact:Contact(*)
        `)
        .eq('lastMessageId', messageId)
        .single();

      if (error) {
        console.error('Erro ao buscar CampaignContact no Inngest:', error);
        return null;
      }
      return data;
    });

    if (!campaignContact) return { skipped: true, reason: "No campaign contact found" };
    if (campaignContact.isPaused) return { skipped: true, reason: "Contact is paused" };
    if (campaignContact.contact.status !== "ACTIVE") return { skipped: true, reason: "Contact inactive" };

    // Step 2: Atualizar status para OPENED via HTTPS
    await step.run("mark-as-opened", async () => {
      const { error } = await supabase
        .from('CampaignContact')
        .update({ stepStatus: "OPENED", lastOpenedAt: new Date().toISOString() })
        .eq('id', campaignContact.id);
      if (error) throw error;
    });

    // Step 3: Verificar próximo passo
    const currentOrder = campaignContact.currentStep?.stepOrder ?? 0;
    const steps = campaignContact.campaign.steps || [];
    const nextStep = steps.find(
      (s: any) => s.stepOrder === currentOrder + 1
    );

    if (!nextStep) {
      return { completed: true, reason: "Sequence completed" };
    }

    // Step 4: Aplicar delay (se configurado) e disparar próximo envio
    if (nextStep.delayHours > 0) {
      await step.sleep("delay-before-next", `${nextStep.delayHours}h`);
    }

    // Step 5: Atualizar para próximo passo via HTTPS
    await step.run("advance-to-next-step", async () => {
      const { error } = await supabase
        .from('CampaignContact')
        .update({ currentStepId: nextStep.id, stepStatus: "QUEUED" })
        .eq('id', campaignContact.id);
      if (error) throw error;
    });

    await step.sendEvent("trigger-next-email", {
      name: "email/send",
      data: {
        contactId: campaignContact.contactId,
        campaignContactId: campaignContact.id,
        subject: nextStep.subject,
        htmlBody: nextStep.htmlBody,
        textBody: nextStep.textBody,
      },
    });

    return { advanced: true, nextStepOrder: nextStep.stepOrder };
  }
);
