/**
 * Contacts Page — Lista de contatos com filtros e busca.
 * Renderização: SSR com search params.
 */
import { Suspense } from "react";
import { getContacts } from "@/features/contacts/lib/queries";
import { ContactTable } from "@/features/contacts/components/contact-table";
import type { EmailProvider, ContactStatus } from "@prisma/client";

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
  const { contacts, total, page, totalPages } = await getContacts({
    search: params.search,
    provider: params.provider as EmailProvider | undefined,
    status: params.status as ContactStatus | undefined,
    page: params.page ? parseInt(params.page) : 1,
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-surface-50">Contatos</h1>
        <p className="mt-1 text-sm text-surface-500">
          Gerencie seus contatos e veja o provedor vinculado a cada um.
        </p>
      </div>

      <Suspense fallback={<div className="skeleton h-96 w-full" />}>
        <ContactTable
          contacts={contacts}
          total={total}
          page={page}
          totalPages={totalPages}
        />
      </Suspense>
    </div>
  );
}
