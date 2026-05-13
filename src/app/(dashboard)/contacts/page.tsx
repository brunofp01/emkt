import { Suspense } from "react";
import { getContacts } from "@/features/contacts/lib/queries";
import { getCampaigns } from "@/features/campaigns/lib/queries";
import { ContactTable } from "@/features/contacts/components/contact-table";
import type { ContactStatus } from "@/shared/types";

import { supabaseAdmin } from "@/shared/lib/supabase";

interface ContactsPageProps {
  searchParams: Promise<{
    search?: string;
    provider?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function ContactsPage({ searchParams }: ContactsPageProps) {
  const params = await searchParams;
  
  // Buscar contatos, campanhas e provedores em paralelo
  const [contactsResult, campaigns, { data: providers }] = await Promise.all([
    getContacts({
      search: params.search,
      provider: params.provider,
      status: params.status as ContactStatus | undefined,
      page: params.page ? parseInt(params.page) : 1,
    }),
    getCampaigns(),
    supabaseAdmin.from('ProviderConfig').select('provider, providerType').eq('isActive', true)
  ]);

  const { contacts, total, page, totalPages } = contactsResult;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-surface-50">Contatos</h1>
        <p className="mt-1 text-sm text-surface-500">
          Gerencie seus contatos e veja o engajamento em tempo real.
        </p>
      </div>

      <Suspense fallback={<div className="skeleton h-96 w-full rounded-2xl" />}>
        <ContactTable
          contacts={contacts}
          total={total}
          page={page}
          totalPages={totalPages}
          campaigns={campaigns.map(c => ({ id: c.id, name: c.name }))}
          activeProviders={providers?.map(p => ({ id: p.provider, type: p.providerType })) || []}
        />
      </Suspense>
    </div>
  );
}
