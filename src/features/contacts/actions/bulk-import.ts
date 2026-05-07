"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/shared/lib/supabase";
import { selectProviderForNewContact } from "@/features/email/lib/provider-selector";
import { addContactsToCampaign } from "@/features/campaigns/actions/create-campaign";
import type { EmailProvider } from "@/shared/types";

interface ImportContact {
  email: string;
  name?: string | null;
  company?: string | null;
  phone?: string | null;
  tags?: string[];
}

export async function bulkImportContacts(contacts: ImportContact[], campaignId?: string) {
  try {
    if (!contacts.length) return { success: true };

    // 1. Obter provedor sugerido (usamos o mesmo para o lote para performance, 
    // ou poderíamos alternar se o lote for muito grande. Para 100 contatos, um provedor está ok).
    const selectedProvider = await selectProviderForNewContact();

    // 2. Preparar dados para o Supabase
    // Usamos 'onConflict' para ignorar duplicatas ou atualizar se necessário.
    // Aqui vamos apenas ignorar (do nothing) para manter a integridade do provedor original se já existir.
    const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const now = new Date().toISOString();

    const dataToInsert = contacts.map(c => ({
      id: generateId(),
      email: c.email.toLowerCase().trim(),
      name: c.name || null,
      company: c.company || null,
      phone: c.phone || null,
      tags: c.tags || [],
      provider: selectedProvider,
      status: 'ACTIVE',
      updatedAt: now,
    }));

    const { error: upsertError } = await supabaseAdmin
      .from('Contact')
      .upsert(dataToInsert, { 
        onConflict: 'email',
        ignoreDuplicates: false 
      });

    if (upsertError) {
      console.error('Erro no Bulk Upsert:', upsertError);
      throw upsertError;
    }

    // 3. Se houver campanha, vincular todos os contatos do lote
    if (campaignId) {
      // Buscar IDs dos contatos que acabamos de processar (novos e antigos)
      const emails = dataToInsert.map(d => d.email);
      const { data: contactIds, error: fetchError } = await supabaseAdmin
        .from('Contact')
        .select('id')
        .in('email', emails);

      if (fetchError) throw fetchError;

      if (contactIds && contactIds.length > 0) {
        const ids = contactIds.map(c => c.id);
        const campaignResult = await addContactsToCampaign(campaignId, ids);
        if (campaignResult.error) {
          console.error('Erro ao adicionar lote à campanha:', campaignResult.error);
        }
      }
    }

    revalidatePath("/contacts");
    return { success: true };
  } catch (err) {
    console.error('Action error (bulkImportContacts):', err);
    return { error: err instanceof Error ? err.message : "Erro ao importar contatos." };
  }
}
