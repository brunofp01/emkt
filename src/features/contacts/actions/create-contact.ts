/**
 * Server Actions — CRUD de contatos usando Supabase SDK (HTTPS).
 */
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseAdmin as supabase } from "@/shared/lib/supabase";
import { selectProviderForNewContact } from "@/features/email/lib/provider-selector";
import { addContactsToCampaign } from "@/features/campaigns/actions/create-campaign";

/**
 * Função simples para gerar um ID compatível com o campo String (cuid) do Prisma.
 * Usado para inserções diretas via Supabase SDK.
 */
const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

/** Schema de validação para criação de contato */
const createContactSchema = z.object({
  email: z.string().email("Email inválido"),
  name: z.string().optional(),
  company: z.string().optional(),
  phone: z.string().optional(),
  tags: z.array(z.string()).optional(),
  campaignId: z.string().optional().nullable(),
  provider: z.string().optional(),
});

/** Schema de validação para atualização de contato */
const updateContactSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  company: z.string().optional(),
  phone: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["ACTIVE", "PAUSED", "BOUNCED", "UNSUBSCRIBED", "COMPLAINED"]).optional(),
  provider: z.string().optional(),
});

export type CreateContactState = {
  success?: boolean;
  error?: string;
  contactId?: string;
};

/**
 * Cria um novo contato via HTTPS.
 */
export async function createContact(
  _prevState: CreateContactState,
  formData: FormData
): Promise<CreateContactState> {
  try {
    const rawData = {
      email: formData.get("email") as string,
      name: (formData.get("name") as string) || undefined,
      company: (formData.get("company") as string) || undefined,
      phone: (formData.get("phone") as string) || undefined,
      campaignId: (formData.get("campaignId") as string) || undefined,
      provider: (formData.get("provider") as string) || undefined,
      tags: formData.get("tags")
        ? (formData.get("tags") as string).split(",").map((t) => t.trim()).filter(Boolean)
        : undefined,
    };

    console.log('[Diagnostic] Início da criação de contato:', rawData.email);

    // 1. Validação
    const validated = createContactSchema.parse(rawData);
    console.log('[Diagnostic] Dados validados com sucesso.');

    // 2. Upsert do Contato (Cria se não existe, atualiza se existe)
    console.log('[Diagnostic] Realizando upsert do contato...');
    const contactIdToUse = generateId();
    
    // Tentamos inserir/atualizar. O 'onConflict' garante que e-mails duplicados não gerem erro.
    const { data: contact, error: upsertError } = await supabase
      .from('Contact')
      .upsert({
        id: contactIdToUse, // Será ignorado se houver conflito e ignoreDuplicates for false, ou usado se novo
        email: validated.email,
        name: validated.name,
        company: validated.company,
        phone: validated.phone,
        tags: validated.tags ?? [],
        provider: validated.provider || "AUTO",
        updatedAt: new Date().toISOString(),
      }, { 
        onConflict: 'email',
        ignoreDuplicates: false 
      })
      .select('id')
      .single();

    if (upsertError) {
      console.error('[Diagnostic] Erro no upsert do contato:', upsertError);
      throw new Error(`Erro de banco (upsert): ${upsertError.message}`);
    }

    const contactId = contact.id;
    console.log('[Diagnostic] Contato processado com ID:', contactId);

    // 5. Se houver campanha selecionada, adicionar à campanha
    if (validated.campaignId && contactId) {
      console.log('[Diagnostic] Adicionando à campanha:', validated.campaignId);
      const result = await addContactsToCampaign(validated.campaignId, [contactId]);
      if (result.error) {
        console.error('[Diagnostic] Erro ao adicionar à campanha:', result.error);
      } else {
        console.log('[Diagnostic] Adicionado à campanha com sucesso.');
      }
    }

    console.log('[Diagnostic] Revalidando paths...');
    revalidatePath("/contacts");
    revalidatePath("/");

    return { success: true, contactId };
  } catch (err) {
    console.error('[Diagnostic] Erro fatal em createContact:', err);
    if (err instanceof z.ZodError) {
      return { error: (err as any).errors[0]?.message ?? "Dados inválidos." };
    }
    const message = err instanceof Error ? err.message : "Erro ao criar contato.";
    return { error: message };
  }
}

/**
 * Atualiza um contato via HTTPS.
 */
export async function updateContact(
  _prevState: CreateContactState,
  formData: FormData
): Promise<CreateContactState> {
  try {
    const rawData = {
      id: formData.get("id") as string,
      name: (formData.get("name") as string) || undefined,
      company: (formData.get("company") as string) || undefined,
      phone: (formData.get("phone") as string) || undefined,
      status: (formData.get("status") as string) || undefined,
      provider: (formData.get("provider") as string) || undefined,
      tags: formData.get("tags")
        ? (formData.get("tags") as string).split(",").map((t) => t.trim()).filter(Boolean)
        : undefined,
    };

    const validated = updateContactSchema.parse(rawData);

    const updateData: any = {
      name: validated.name,
      company: validated.company,
      phone: validated.phone,
      status: validated.status,
      tags: validated.tags,
      updatedAt: new Date().toISOString(),
    };
    if (validated.provider) updateData.provider = validated.provider;

    const { error } = await supabase
      .from('Contact')
      .update(updateData)
      .eq('id', validated.id);

    if (error) throw error;

    revalidatePath("/contacts");
    revalidatePath(`/contacts/${validated.id}`);

    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: (err as any).errors[0]?.message ?? "Dados inválidos." };
    }
    const message = err instanceof Error ? err.message : "Erro ao atualizar contato.";
    return { error: message };
  }
}

/**
 * Remove um contato via HTTPS.
 */
export async function deleteContact(contactId: string): Promise<CreateContactState> {
  try {
    const { error } = await supabase
      .from('Contact')
      .delete()
      .eq('id', contactId);

    if (error) throw error;

    revalidatePath("/contacts");
    revalidatePath("/");

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao deletar contato.";
    return { error: message };
  }
}
