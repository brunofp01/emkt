"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseAdmin as supabase } from "@/shared/lib/supabase"; // Usando o cliente Admin para estabilidade total
import { inngest } from "@/shared/lib/inngest";
import { crypto } from "crypto";

// Função simples para gerar um ID compatível com o campo String do Prisma
const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

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
  htmlBody: z.string(),
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
 * Cria uma nova campanha usando o Supabase SDK (HTTPS) para estabilidade máxima.
 */
export async function createCampaign(_prevState: CampaignActionState, formData: FormData): Promise<CampaignActionState> {
  try {
    const stepsRaw = formData.get("steps") as string;
    const name = formData.get("name") as string;
    const description = (formData.get("description") as string) || null;

    if (!stepsRaw) throw new Error("O campo 'steps' está ausente no FormData.");

    const parsedSteps = JSON.parse(stepsRaw);
    const validated = createCampaignSchema.parse({ name, description, steps: parsedSteps });

    // 1. Criar a Campanha
    const campaignId = generateId();
    const { error: campaignError } = await supabase
      .from('Campaign')
      .insert({
        id: campaignId,
        name: validated.name,
        description: validated.description || null,
        status: 'DRAFT',
        updatedAt: new Date().toISOString(),
      });

    if (campaignError) throw new Error(`Erro ao criar campanha: ${campaignError.message}`);

    // 2. Criar as Etapas
    const stepsToInsert = validated.steps.map(step => ({
      id: generateId(),
      campaignId: campaignId,
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
      updatedAt: new Date().toISOString(),
    }));

    const { error: stepsError } = await supabase
      .from('CampaignStep')
      .insert(stepsToInsert);

    if (stepsError) throw new Error(`Erro ao criar etapas: ${stepsError.message}`);

    revalidatePath("/campaigns");
    return { success: true, campaignId };
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
    const { error } = await supabase
      .from('Campaign')
      .update({ status: 'ACTIVE', updatedAt: new Date().toISOString() })
      .eq('id', campaignId);

    if (error) throw error;

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
    // Buscar primeira etapa
    const { data: steps, error: stepsError } = await supabase
      .from('CampaignStep')
      .select('id, subject, htmlBody, textBody')
      .eq('campaignId', campaignId)
      .order('stepOrder', { ascending: true })
      .limit(1);

    if (stepsError || !steps?.[0]) return { error: "Campanha sem etapas." };
    const firstStep = steps[0];

    for (const contactId of contactIds) {
      const contactCampaignId = generateId();
      
      const { data: cc, error: ccError } = await supabase
        .from('CampaignContact')
        .upsert({
          contactId,
          campaignId,
          currentStepId: firstStep.id,
          stepStatus: 'QUEUED',
          updatedAt: new Date().toISOString(),
        }, { onConflict: 'contactId,campaignId' })
        .select()
        .single();

      if (ccError) continue;

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
    const { error } = await supabase
      .from('Campaign')
      .delete()
      .eq('id', campaignId);

    if (error) throw error;

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
    const stepsRaw = formData.get("steps") as string;
    const name = formData.get("name") as string;
    const description = (formData.get("description") as string) || null;

    const parsedSteps = JSON.parse(stepsRaw || "[]");
    const validated = createCampaignSchema.parse({ name, description, steps: parsedSteps });

    // 1. Atualizar dados básicos
    const { error: updateError } = await supabase
      .from('Campaign')
      .update({
        name: validated.name,
        description: validated.description,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', campaignId);

    if (updateError) throw updateError;

    // 2. Limpar etapas antigas
    await supabase.from('CampaignStep').delete().eq('campaignId', campaignId);

    // 3. Criar novas etapas
    const stepsToInsert = validated.steps.map(step => ({
      id: generateId(),
      campaignId,
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
      updatedAt: new Date().toISOString(),
    }));

    const { error: stepsError } = await supabase
      .from('CampaignStep')
      .insert(stepsToInsert);

    if (stepsError) throw stepsError;

    revalidatePath("/campaigns");
    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true };
  } catch (err) {
    console.error('Action error (updateCampaign):', err);
    return { error: err instanceof Error ? err.message : "Erro ao atualizar." };
  }
}
