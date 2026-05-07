"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/shared/lib/prisma";
import { inngest } from "@/shared/lib/inngest";

const DEFAULT_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 8px; border: 1px solid #e0e0e0; }
    .footer { margin-top: 30px; font-size: 12px; color: #999; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <p>Olá, {{contactName}}!</p>
    <p>Obrigado por se conectar conosco. Gostaríamos de compartilhar algumas novidades importantes sobre como podemos ajudar a impulsionar seus resultados.</p>
    <p>Podemos agendar uma breve conversa de 10 minutos esta semana?</p>
    <p>Atenciosamente,<br>Equipe de Sucesso</p>
  </div>
  <div class="footer">
    Sent with MailPulse
  </div>
</body>
</html>
`;

const campaignStepSchema = z.object({
  stepOrder: z.number().int().positive(),
  subject: z.string().min(1, "Assunto obrigatório"),
  htmlBody: z.string(), // Permitimos vazio para injetar o padrão
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
 * Cria uma nova campanha usando Prisma.
 */
export async function createCampaign(_prevState: CampaignActionState, formData: FormData): Promise<CampaignActionState> {
  try {
    const stepsRaw = formData.get("steps") as string;
    const name = formData.get("name") as string;
    const description = (formData.get("description") as string) || undefined;

    if (!stepsRaw) throw new Error("O campo 'steps' está ausente no FormData.");

    const parsedSteps = JSON.parse(stepsRaw);
    const validated = createCampaignSchema.parse({ name, description, steps: parsedSteps });

    // Criar campanha e etapas em uma única transação atômica
    const campaign = await prisma.campaign.create({
      data: {
        name: validated.name,
        description: validated.description || null,
        steps: {
          create: validated.steps.map(step => ({
            stepOrder: step.stepOrder,
            subject: step.subject,
            htmlBody: step.htmlBody.trim() || DEFAULT_TEMPLATE,
            textBody: step.textBody || null,
            design: step.design || { isDefault: true },
            delayHours: step.delayHours,
            isABTest: step.isABTest,
            subjectB: step.subjectB || null,
            htmlBodyB: (step.isABTest && !step.htmlBodyB?.trim()) ? DEFAULT_TEMPLATE : (step.htmlBodyB || null),
            designB: step.designB || null,
          }))
        }
      }
    });

    revalidatePath("/campaigns");
    return { success: true, campaignId: campaign.id };
  } catch (err: any) {
    console.error('Action error (createCampaign):', err);
    if (err instanceof z.ZodError) {
      return { error: err.issues[0]?.message ?? "Dados inválidos." };
    }
    return { error: err instanceof Error ? err.message : "Erro ao criar campanha." };
  }
}

/**
 * Ativa uma campanha.
 */
export async function activateCampaign(campaignId: string): Promise<CampaignActionState> {
  try {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { 
        status: 'ACTIVE',
        updatedAt: new Date()
      }
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
        update: {
          updatedAt: new Date()
        },
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
          description: validated.description || null,
          updatedAt: new Date(),
        }
      });

      // 2. Limpar etapas antigas
      await tx.campaignStep.deleteMany({
        where: { campaignId }
      });

      // 3. Criar novas etapas
      for (const step of validated.steps) {
        await tx.campaignStep.create({
          data: {
            campaignId,
            stepOrder: step.stepOrder,
            subject: step.subject,
            htmlBody: step.htmlBody,
            textBody: step.textBody || null,
            design: step.design || null,
            delayHours: step.delayHours,
            isABTest: step.isABTest,
            subjectB: step.subjectB || null,
            htmlBodyB: step.htmlBodyB || null,
            designB: step.designB || null,
          }
        });
      }
    });

    revalidatePath("/campaigns");
    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true };
  } catch (err) {
    console.error('Action error (updateCampaign):', err);
    return { error: err instanceof Error ? err.message : "Erro ao atualizar." };
  }
}
