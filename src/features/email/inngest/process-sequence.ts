// @ts-nocheck
/**
 * Inngest Function — Processa sequência da régua de marketing.
 * 
 * Disparada pelo evento "email/opened". Verifica se há próximo passo
 * na campanha e agenda o envio do próximo email.
 */
import { inngest } from "@/shared/lib/inngest";
import { prisma } from "@/shared/lib/prisma";

export const processSequence = inngest.createFunction(
  {
    id: "process-sequence",
    name: "Process Marketing Sequence Step",
    retries: 2,
    triggers: [{ event: "email/opened" }],
  },
  async ({ event, step }) => {
    const { messageId } = event.data as { messageId: string };

    // Step 1: Buscar CampaignContact pelo messageId
    const campaignContact = await step.run("find-campaign-contact", async () => {
      return prisma.campaignContact.findFirst({
        where: { lastMessageId: messageId },
        include: {
          campaign: { include: { steps: { orderBy: { stepOrder: "asc" } } } },
          currentStep: true,
          contact: true,
        },
      });
    });

    if (!campaignContact) return { skipped: true, reason: "No campaign contact found" };
    if (campaignContact.isPaused) return { skipped: true, reason: "Contact is paused" };
    if (campaignContact.contact.status !== "ACTIVE") return { skipped: true, reason: "Contact inactive" };

    // Step 2: Atualizar status para OPENED
    await step.run("mark-as-opened", async () => {
      await prisma.campaignContact.update({
        where: { id: campaignContact.id },
        data: { stepStatus: "OPENED", lastOpenedAt: new Date() },
      });
    });

    // Step 3: Verificar próximo passo
    const currentOrder = campaignContact.currentStep?.stepOrder ?? 0;
    const nextStep = campaignContact.campaign.steps.find(
      (s) => s.stepOrder === currentOrder + 1
    );

    if (!nextStep) {
      // Fim da sequência
      await step.run("mark-completed", async () => {
        await prisma.campaignContact.update({
          where: { id: campaignContact.id },
          data: { stepStatus: "OPENED" },
        });
      });
      return { completed: true, reason: "Sequence completed" };
    }

    // Step 4: Aplicar delay (se configurado) e disparar próximo envio
    if (nextStep.delayHours > 0) {
      await step.sleep("delay-before-next", `${nextStep.delayHours}h`);
    }

    // Step 5: Atualizar para próximo passo e disparar envio
    await step.run("advance-to-next-step", async () => {
      await prisma.campaignContact.update({
        where: { id: campaignContact.id },
        data: { currentStepId: nextStep.id, stepStatus: "QUEUED" },
      });
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
