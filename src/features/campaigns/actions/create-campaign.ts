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
  design: z.any().optional(),
  delayHours: z.number().int().min(0).default(0),
  isABTest: z.boolean().default(false),
  subjectB: z.string().optional(),
  htmlBodyB: z.string().optional(),
  designB: z.any().optional(),
});

const createCampaignSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  description: z.string().optional(),
  steps: z.array(campaignStepSchema).min(1, "Pelo menos uma etapa é necessária"),
});

export type CampaignActionState = { success?: boolean; error?: string; campaignId?: string };

/**
 * Cria uma nova campanha usando Prisma para garantir geração de CUID e timestamps.
 */
export async function createCampaign(_prevState: CampaignActionState, formData: FormData): Promise<CampaignActionState> {
  try {
    const raw = {
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || undefined,
      steps: JSON.parse((formData.get("steps") as string) || "[]"),
    };
    const validated = createCampaignSchema.parse(raw);

    // Criar campanha e etapas em uma única transação atômica
    const campaign = await prisma.campaign.create({
      data: {
        name: validated.name,
        description: validated.description,
        steps: {
          create: validated.steps.map(step => ({
            stepOrder: step.stepOrder,
            subject: step.subject,
            htmlBody: step.htmlBody,
            textBody: step.textBody,
            design: step.design,
            delayHours: step.delayHours,
            isABTest: step.isABTest,
            subjectB: step.subjectB,
            htmlBodyB: step.htmlBodyB,
            designB: step.designB,
          }))
        }
      }
    });

    revalidatePath("/campaigns");
    return { success: true, campaignId: campaign.id };
  } catch (err) {
    console.error('Action error (createCampaign):', err);
    if (err instanceof z.ZodError) return { error: (err as any).errors[0]?.message ?? "Dados inválidos." };
    return { error: err instanceof Error ? err.message : "Erro interno ao criar campanha." };
  }
}

/**
 * Ativa uma campanha.
 */
export async function activateCampaign(campaignId: string): Promise<CampaignActionState> {
  try {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'ACTIVE' }
    });

    revalidatePath("/campaigns");
    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao ativar." };
  }
}

/**
 * Adiciona contatos e inicia o fluxo.
 */
export async function addContactsToCampaign(campaignId: string, contactIds: string[]): Promise<CampaignActionState> {
  try {
    const firstStep = await prisma.campaignStep.findFirst({
      where: { campaignId },
      orderBy: { stepOrder: 'asc' }
    });

    if (!firstStep) return { error: "Campanha sem etapas." };

    for (const contactId of contactIds) {
      // Upsert para evitar duplicidade e garantir vínculo
      const cc = await prisma.campaignContact.upsert({
        where: {
          contactId_campaignId: { contactId, campaignId }
        },
        update: {},
        create: {
          contactId,
          campaignId,
          currentStepId: firstStep.id,
          stepStatus: "QUEUED"
        }
      });

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
    console.error('Action error (addContactsToCampaign):', err);
    return { error: err instanceof Error ? err.message : "Erro ao adicionar contatos." };
  }
}

/**
 * Exclui uma campanha.
 */
export async function deleteCampaign(campaignId: string): Promise<CampaignActionState> {
  try {
    await prisma.campaign.delete({
      where: { id: campaignId }
    });

    revalidatePath("/campaigns");
    return { success: true };
  } catch (err) {
    console.error('Action error (deleteCampaign):', err);
    return { error: err instanceof Error ? err.message : "Erro ao excluir." };
  }
}

/**
 * Atualiza uma campanha e sincroniza etapas.
 */
export async function updateCampaign(campaignId: string, _prevState: CampaignActionState, formData: FormData): Promise<CampaignActionState> {
  try {
    const raw = {
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || undefined,
      steps: JSON.parse((formData.get("steps") as string) || "[]"),
    };
    const validated = createCampaignSchema.parse(raw);

    await prisma.$transaction(async (tx) => {
      // 1. Atualizar dados básicos
      await tx.campaign.update({
        where: { id: campaignId },
        data: {
          name: validated.name,
          description: validated.description,
        }
      });

      // 2. Limpar etapas antigas
      await tx.campaignStep.deleteMany({
        where: { campaignId }
      });

      // 3. Criar novas etapas
      await tx.campaignStep.createMany({
        data: validated.steps.map(step => ({
          campaignId,
          stepOrder: step.stepOrder,
          subject: step.subject,
          htmlBody: step.htmlBody,
          textBody: step.textBody,
          design: step.design,
          delayHours: step.delayHours,
          isABTest: step.isABTest,
          subjectB: step.subjectB,
          htmlBodyB: step.htmlBodyB,
          designB: step.designB,
        }))
      });
    });

    revalidatePath("/campaigns");
    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true };
  } catch (err) {
    console.error('Action error (updateCampaign):', err);
    return { error: err instanceof Error ? err.message : "Erro ao atualizar." };
  }
}
