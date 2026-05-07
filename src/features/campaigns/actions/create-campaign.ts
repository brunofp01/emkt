"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabase } from "@/shared/lib/supabase";
import { inngest } from "@/shared/lib/inngest";

const campaignStepSchema = z.object({
  stepOrder: z.number().int().positive(),
  subject: z.string().min(1, "Assunto obrigatório"),
  htmlBody: z.string().min(1, "Corpo do email obrigatório"),
  textBody: z.string().optional(),
  design: z.any().optional(),
  delayHours: z.number().int().min(0).default(0),
  // A/B Testing Fields
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
 * Cria uma nova campanha usando o SDK oficial do Supabase (HTTPS).
 */
export async function createCampaign(_prevState: CampaignActionState, formData: FormData): Promise<CampaignActionState> {
  try {
    const raw = {
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || undefined,
      steps: JSON.parse((formData.get("steps") as string) || "[]"),
    };
    const validated = createCampaignSchema.parse(raw);

    // 1. Criar a campanha
    const { data: campaign, error: campaignError } = await supabase
      .from('Campaign')
      .insert({
        name: validated.name,
        description: validated.description || null,
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (campaignError) throw new Error(`Erro ao criar campanha: ${campaignError.message}`);

    // 2. Criar as etapas
    const stepsData = validated.steps.map(step => ({
      campaignId: campaign.id,
      stepOrder: step.stepOrder,
      subject: step.subject,
      htmlBody: step.htmlBody,
      textBody: step.textBody || null,
      design: step.design || null,
      delayHours: step.delayHours,
      // A/B Testing Fields
      isABTest: step.isABTest,
      subjectB: step.subjectB || null,
      htmlBodyB: step.htmlBodyB || null,
      designB: step.designB || null,
      updatedAt: new Date().toISOString(),
    }));

    const { error: stepsError } = await supabase
      .from('CampaignStep')
      .insert(stepsData);

    if (stepsError) throw new Error(`Erro ao criar etapas: ${stepsError.message}`);

    revalidatePath("/campaigns");
    return { success: true, campaignId: campaign.id };
  } catch (err) {
    console.error('Action error (createCampaign):', err);
    if (err instanceof z.ZodError) return { error: (err as any).errors[0]?.message ?? "Dados inválidos." };
    return { error: err instanceof Error ? err.message : "Erro ao criar campanha." };
  }
}

/**
 * Ativa uma campanha via HTTPS.
 */
export async function activateCampaign(campaignId: string): Promise<CampaignActionState> {
  try {
    const { error } = await supabase
      .from('Campaign')
      .update({ 
        status: 'ACTIVE',
        updatedAt: new Date().toISOString() 
      })
      .eq('id', campaignId);

    if (error) throw error;

    revalidatePath("/campaigns");
    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro." };
  }
}

/**
 * Adiciona contatos a uma campanha e inicia o fluxo no Inngest via HTTPS.
 */
export async function addContactsToCampaign(campaignId: string, contactIds: string[]): Promise<CampaignActionState> {
  try {
    // Buscar a primeira etapa da campanha
    const { data: steps, error: stepError } = await supabase
      .from('CampaignStep')
      .select('*')
      .eq('campaignId', campaignId)
      .order('stepOrder', { ascending: true })
      .limit(1);

    if (stepError) throw stepError;
    const firstStep = steps?.[0];
    if (!firstStep) return { error: "Campanha sem etapas definidas." };

    for (const contactId of contactIds) {
      // Verificar se já existe vínculo
      const { data: existing } = await supabase
        .from('CampaignContact')
        .select('id')
        .match({ contactId, campaignId })
        .single();

      if (existing) continue;

      // Criar o vínculo
      const { data: cc, error: ccError } = await supabase
        .from('CampaignContact')
        .insert({ 
          contactId, 
          campaignId, 
          currentStepId: firstStep.id, 
          stepStatus: "QUEUED",
          updatedAt: new Date().toISOString()
        })
        .select()
        .single();

      if (ccError) {
        console.error(`Erro ao vincular contato ${contactId}:`, ccError);
        continue;
      }

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
    console.error('Action error (addContactsToCampaign):', err);
    return { error: err instanceof Error ? err.message : "Erro ao adicionar contatos." };
  }
}

/**
 * Exclui uma campanha via HTTPS.
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
    return { error: err instanceof Error ? err.message : "Erro ao excluir campanha." };
  }
}

/**
 * Atualiza uma campanha existente via HTTPS.
 */
export async function updateCampaign(campaignId: string, _prevState: CampaignActionState, formData: FormData): Promise<CampaignActionState> {
  try {
    const raw = {
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || undefined,
      steps: JSON.parse((formData.get("steps") as string) || "[]"),
    };
    const validated = createCampaignSchema.parse(raw);

    // 1. Atualizar dados básicos da campanha
    const { error: campaignError } = await supabase
      .from('Campaign')
      .update({
        name: validated.name,
        description: validated.description || null,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', campaignId);

    if (campaignError) throw new Error(`Erro ao atualizar campanha: ${campaignError.message}`);

    // 2. Atualizar etapas (Estratégia: Deletar e Reinserir para simplificar ordem)
    // Nota: Em produção real, deveríamos atualizar por ID para evitar quebra de CampaignContact
    const { error: deleteError } = await supabase
      .from('CampaignStep')
      .delete()
      .eq('campaignId', campaignId);

    if (deleteError) throw new Error(`Erro ao limpar etapas antigas: ${deleteError.message}`);

    const stepsData = validated.steps.map(step => ({
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
      updatedAt: new Date().toISOString(),
    }));

    const { error: stepsError } = await supabase
      .from('CampaignStep')
      .insert(stepsData);

    if (stepsError) throw new Error(`Erro ao atualizar etapas: ${stepsError.message}`);

    revalidatePath("/campaigns");
    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true };
  } catch (err) {
    console.error('Action error (updateCampaign):', err);
    if (err instanceof z.ZodError) return { error: (err as any).errors[0]?.message ?? "Dados inválidos." };
    return { error: err instanceof Error ? err.message : "Erro ao atualizar campanha." };
  }
}
