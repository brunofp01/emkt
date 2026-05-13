"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/shared/lib/supabase";
import { addContactsToCampaign } from "@/features/campaigns/actions/create-campaign";

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

    // 1. Preparar dados para o Supabase
    const generateId = () => require('crypto').randomUUID();
    const now = new Date().toISOString();

    const dataToInsert = contacts.map((c) => ({
      id: generateId(),
      email: c.email.toLowerCase().trim(),
      name: c.name || null,
      company: c.company || null,
      phone: c.phone || null,
      tags: c.tags || [],
      provider: "AUTO",
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
