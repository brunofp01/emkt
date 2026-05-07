/**
 * Inngest Function — Processa sequência da régua de marketing com lógica de branching.
 * Refatorado para usar Supabase SDK (HTTPS).
 */
import { inngest } from "@/shared/lib/inngest";
import { supabase } from "@/shared/lib/supabase";

export const processSequence = inngest.createFunction(
  {
    id: "process-sequence",
    name: "Process Marketing Sequence Step",
    retries: 2,
    triggers: [
      { event: "email/opened" },
      { event: "email/clicked" }
    ],
  },
  async ({ event, step }) => {
    const { messageId } = event.data as { messageId: string };
    const eventType = event.name === "email/clicked" ? "CLICKED" : "OPENED";

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
    
    // Proteção contra múltiplos avanços para a mesma etapa
    if (campaignContact.stepStatus === "OPENED" && eventType === "OPENED") {
      return { skipped: true, reason: "Already processed opening" };
    }
    
    if (campaignContact.isPaused) return { skipped: true, reason: "Contact is paused" };
    if (campaignContact.contact.status !== "ACTIVE") return { skipped: true, reason: "Contact inactive" };

    // Step 2: Atualizar status e carimbar data
    await step.run("update-interaction-status", async () => {
      const updateData: any = { stepStatus: eventType };
      if (eventType === "OPENED") updateData.lastOpenedAt = new Date().toISOString();
      if (eventType === "CLICKED") updateData.lastClickedAt = new Date().toISOString();

      const { error } = await supabase
        .from('CampaignContact')
        .update(updateData)
        .eq('id', campaignContact.id);
      
      if (error) throw error;
    });

    // Step 3: Lógica de Branching (Sequência Inteligente)
    const nextStep = await step.run("determine-next-step", async () => {
      const currentStep = campaignContact.currentStep;
      const allSteps = (campaignContact.campaign.steps || []) as any[];
      
      // 1. Verificar se há uma condição específica para este evento
      const conditions = currentStep?.conditions as any[];
      if (conditions && Array.isArray(conditions)) {
        const condition = conditions.find(c => c.on === eventType);
        if (condition) {
          if (condition.nextStepId) {
            return allSteps.find((s: any) => s.id === condition.nextStepId);
          }
          if (condition.nextStepOrder) {
            return allSteps.find((s: any) => s.stepOrder === condition.nextStepOrder);
          }
        }
      }

      // 2. Fallback: Se for clique e não houver regra de clique, tenta avançar normalmente (linear)
      // Se for abertura, segue a ordem linear (stepOrder + 1)
      const currentOrder = currentStep?.stepOrder ?? 0;
      return allSteps.find((s: any) => s.stepOrder === currentOrder + 1);
    });

    if (!nextStep) {
      return { completed: true, reason: "Sequence completed or no next step for this branch" };
    }

    // Step 4: Aplicar delay (se configurado)
    if (nextStep.delayHours > 0) {
      await step.sleep("delay-before-next", `${nextStep.delayHours}h`);
    }

    // Step 5: Avançar contato para a próxima etapa via HTTPS
    await step.run("advance-to-next-step", async () => {
      const { error } = await supabase
        .from('CampaignContact')
        .update({ 
          currentStepId: nextStep.id, 
          stepStatus: "QUEUED",
          lastMessageId: null // Resetar messageId para o novo envio
        })
        .eq('id', campaignContact.id);
      
      if (error) throw error;
    });

    // Step 6: Disparar novo envio
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

    return { 
      advanced: true, 
      fromEvent: eventType,
      nextStepId: nextStep.id, 
      nextStepOrder: nextStep.stepOrder 
    };
  }
);
