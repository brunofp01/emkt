/**
 * Server Actions — CRUD de contatos usando Supabase SDK (HTTPS).
 */
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseAdmin as supabase } from "@/shared/lib/supabase";
import { selectProviderForNewContact } from "@/features/email/lib/provider-selector";
import { addContactsToCampaign } from "@/features/campaigns/actions/create-campaign";

/** Schema de validação para criação de contato */
const createContactSchema = z.object({
  email: z.string().email("Email inválido"),
  name: z.string().optional(),
  company: z.string().optional(),
  phone: z.string().optional(),
  tags: z.array(z.string()).optional(),
  campaignId: z.string().optional().nullable(),
});

/** Schema de validação para atualização de contato */
const updateContactSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  company: z.string().optional(),
  phone: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["ACTIVE", "PAUSED", "BOUNCED", "UNSUBSCRIBED", "COMPLAINED"]).optional(),
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
      tags: formData.get("tags")
        ? (formData.get("tags") as string).split(",").map((t) => t.trim()).filter(Boolean)
        : undefined,
    };

    // 1. Validação
    const validated = createContactSchema.parse(rawData);

    // 2. Verificar duplicidade via HTTPS
    const { data: existing } = await supabase
      .from('Contact')
      .select('id')
      .eq('email', validated.email)
      .single();

    let contactId = existing?.id;

    if (!existing) {
      // 3. Selecionar provedor
      const selectedProvider = await selectProviderForNewContact();

      // 4. Criar contato via HTTPS
      const { data: contact, error } = await supabase
        .from('Contact')
        .insert({
          email: validated.email,
          name: validated.name,
          company: validated.company,
          phone: validated.phone,
          tags: validated.tags ?? [],
          provider: selectedProvider,
        })
        .select()
        .single();

      if (error) throw error;
      contactId = contact.id;
    }

    // 5. Se houver campanha selecionada, adicionar à campanha
    if (validated.campaignId && contactId) {
      const result = await addContactsToCampaign(validated.campaignId, [contactId]);
      if (result.error) {
        console.error('Erro ao adicionar à campanha:', result.error);
        // Não falhamos a criação do contato por causa disso, mas reportamos no console
      }
    }

    revalidatePath("/contacts");
    revalidatePath("/");

    return { success: true, contactId };
  } catch (err) {
    console.error('Action error (createContact):', err);
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
      tags: formData.get("tags")
        ? (formData.get("tags") as string).split(",").map((t) => t.trim()).filter(Boolean)
        : undefined,
    };

    const validated = updateContactSchema.parse(rawData);

    const { error } = await supabase
      .from('Contact')
      .update({
        name: validated.name,
        company: validated.company,
        phone: validated.phone,
        status: validated.status,
        tags: validated.tags,
      })
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
