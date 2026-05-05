"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { ContactForm } from "./contact-form";
import { ContactTableRow } from "./contact-table-row";

interface Contact {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  provider: string;
  status: string;
  createdAt: Date;
  campaignContacts: Array<{
    campaign: { name: string };
    currentStep: { stepOrder: number } | null;
    stepStatus: string;
  }>;
  emailEvents: Array<{
    eventType: string;
    timestamp: Date;
  }>;
}

interface ContactTableProps {
  contacts: Contact[];
  total: number;
  page: number;
  totalPages: number;
}

export function ContactTable({ contacts, total, page, totalPages }: ContactTableProps) {
  const [showForm, setShowForm] = useState(false);

  return (
    <>
      {showForm && <ContactForm onClose={() => setShowForm(false)} />}

      <div className="glass-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-surface-800/60 px-6 py-4">
          <div>
            <h2 className="text-sm font-semibold text-surface-200">{total} contatos</h2>
            <p className="text-xs text-surface-500">Página {page} de {totalPages}</p>
          </div>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-primary-500/20 hover:bg-primary-500 active:scale-[0.97]">
            <Plus className="h-4 w-4" />Novo Contato
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-800/60 text-left text-xs font-medium uppercase tracking-wider text-surface-500">
                <th className="px-4 py-3 sm:px-6">Email</th>
                <th className="hidden px-6 py-3 md:table-cell">Nome</th>
                <th className="px-4 py-3 sm:px-6">Provedor</th>
                <th className="hidden px-6 py-3 lg:table-cell">Régua</th>
                <th className="px-4 py-3 sm:px-6">Último Evento</th>
                <th className="px-4 py-3 sm:px-6 text-center">Status</th>
                <th className="hidden px-6 py-3 xl:table-cell">Cadastro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800/40">
              {contacts.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-surface-500">Nenhum contato encontrado.</td></tr>
              ) : (
                contacts.map((contact) => (
                  <ContactTableRow key={contact.id} contact={contact} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
