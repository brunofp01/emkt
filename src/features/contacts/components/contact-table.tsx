"use client";
import { useState, useEffect } from "react";
import { Plus, Filter, Tag, Search } from "lucide-react";
import { ContactForm } from "./contact-form";
import { ContactTableRow } from "./contact-table-row";
import { useRouter, useSearchParams } from "next/navigation";

interface Contact {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  provider: string;
  status: string;
  tags: string[];
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
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const currentTag = searchParams.get('tag') || "";
  const currentSearch = searchParams.get('search') || "";

  const [searchTerm, setSearchTerm] = useState(currentSearch);

  // Debounce logic (400ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== currentSearch) {
        handleFilterChange('search', searchTerm);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1');
    router.push(`?${params.toString()}`);
  };

  return (
    <>
      {showForm && <ContactForm onClose={() => setShowForm(false)} />}

      <div className="space-y-4">
        {/* Filtros de Segmentação Dinâmica */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between glass-card p-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500" />
            <input 
              type="text"
              placeholder="Buscar por email, nome ou empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface-900 border border-surface-800 rounded-lg text-sm text-surface-200 focus:outline-none focus:border-primary-500/50"
            />
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500" />
              <select
                value={currentTag}
                onChange={(e) => handleFilterChange('tag', e.target.value)}
                className="w-full pl-10 pr-8 py-2 bg-surface-900 border border-surface-800 rounded-lg text-sm text-surface-200 appearance-none focus:outline-none focus:border-primary-500/50 cursor-pointer"
              >
                <option value="">Todas as Tags</option>
                <option value="CLICKED">Clicou (CLICKED)</option>
                <option value="LEAD_QUENTE">Lead Quente</option>
                <option value="IMPORTADO">Importado</option>
              </select>
            </div>

            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary-500/20 hover:bg-primary-500 active:scale-[0.97] transition-all whitespace-nowrap">
              <Plus className="h-4 w-4" />Novo Contato
            </button>
          </div>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-surface-800/60 px-6 py-4 bg-surface-900/20">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-widest text-surface-400 flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary-500" />
                {total} Leads Segmentados
              </h2>
            </div>
            <div className="flex gap-1">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => handleFilterChange('page', (i + 1).toString())}
                  className={`h-7 w-7 rounded flex items-center justify-center text-xs font-bold transition-all ${page === i + 1 ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20' : 'bg-surface-800 text-surface-500 hover:text-surface-200'}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-800/60 text-left text-[10px] font-black uppercase tracking-[0.15em] text-surface-600">
                  <th className="px-4 py-4 sm:px-6">Identificação e Tags</th>
                  <th className="hidden px-6 py-4 md:table-cell">Empresa / Lead</th>
                  <th className="px-4 py-4 sm:px-6">Provedor</th>
                  <th className="hidden px-6 py-4 lg:table-cell">Engajamento Atual</th>
                  <th className="px-4 py-4 sm:px-6">Status</th>
                  <th className="px-4 py-4 sm:px-6 text-center">Saúde</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800/40">
                {contacts.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Search className="h-10 w-10 text-surface-800" />
                      <p className="text-sm text-surface-500 font-medium">Nenhum lead encontrado para este filtro.</p>
                      <button onClick={() => router.push('/contacts')} className="text-xs text-primary-500 font-bold hover:underline uppercase tracking-widest">Limpar todos os filtros</button>
                    </div>
                  </td></tr>
                ) : (
                  contacts.map((contact) => (
                    <ContactTableRow key={contact.id} contact={contact} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
