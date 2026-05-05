"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/shared/lib/prisma";
import { inngest } from "@/shared/lib/inngest";

const campaignStepSchema = z.object({
  stepOrder: z.number().int().positive(),
  subject: z.string().min(1, "Assunto obrigatório"),
  htmlBody: z.string().min(1, "Corpo do email obrigatório"),
  textBody: z.string().optional(),
  delayHours: z.number().int().min(0).default(0),
});

const createCampaignSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  description: z.string().optional(),
  steps: z.array(campaignStepSchema).min(1, "Pelo menos uma etapa é necessária"),
});

export type CampaignActionState = { success?: boolean; error?: string; campaignId?: string };

export async function createCampaign(_prevState: CampaignActionState, formData: FormData): Promise<CampaignActionState> {
  try {
    const raw = {
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || undefined,
      steps: JSON.parse((formData.get("steps") as string) || "[]"),
    };
    const validated = createCampaignSchema.parse(raw);

    const campaign = await prisma.campaign.create({
      data: {
        name: validated.name,
        description: validated.description,
        steps: { create: validated.steps },
      },
    });

    revalidatePath("/campaigns");
    return { success: true, campaignId: campaign.id };
  } catch (err) {
    if (err instanceof z.ZodError) return { error: (err as any).errors[0]?.message ?? "Dados inválidos." };
    return { error: err instanceof Error ? err.message : "Erro ao criar campanha." };
  }
}

export async function activateCampaign(campaignId: string): Promise<CampaignActionState> {
  try {
    await prisma.campaign.update({ where: { id: campaignId }, data: { status: "ACTIVE" } });
    revalidatePath("/campaigns");
    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro." };
  }
}

export async function addContactsToCampaign(campaignId: string, contactIds: string[]): Promise<CampaignActionState> {
  try {
    const campaign = await prisma.campaign.findUniqueOrThrow({
      where: { id: campaignId },
      include: { steps: { orderBy: { stepOrder: "asc" }, take: 1 } },
    });

    const firstStep = campaign.steps[0];
    if (!firstStep) return { error: "Campanha sem etapas definidas." };

    // Criar CampaignContacts e disparar envio do primeiro email
    for (const contactId of contactIds) {
      const existing = await prisma.campaignContact.findUnique({
        where: { contactId_campaignId: { contactId, campaignId } },
      });
      if (existing) continue;

      const cc = await prisma.campaignContact.create({
        data: { contactId, campaignId, currentStepId: firstStep.id, stepStatus: "QUEUED" },
      });

      // Disparar envio via Inngest
      await inngest.send({
        name: "email/send",
        data: {
          contactId,
          campaignContactId: cc.id,
          subject: firstStep.subject,
          htmlBody: firstStep.htmlBody,
          textBody: firstStep.textBody,
        },
      });
    }

    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao adicionar contatos." };
  }
}
