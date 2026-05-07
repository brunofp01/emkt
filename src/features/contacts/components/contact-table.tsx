"use client";
import { useState, useEffect } from "react";
import { Plus, Filter, Tag, Search, FileUp, Download, MoreHorizontal, CheckCircle2, AlertCircle } from "lucide-react";
import { ContactForm } from "./contact-form";
import { ImportModal } from "./import-modal";
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
  campaigns: Array<{ id: string; name: string }>;
}

export function ContactTable({ contacts, total, page, totalPages, campaigns }: ContactTableProps) {
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
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
      {showForm && <ContactForm campaigns={campaigns} onClose={() => setShowForm(false)} />}
      {showImport && <ImportModal campaigns={campaigns} onClose={() => setShowImport(false)} />}

      <div className="space-y-6">
        {/* Header de Ações Principais */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500" />
            <input 
              type="text"
              placeholder="Buscar por email, nome ou empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-surface-900/50 border border-surface-800 rounded-2xl text-sm text-surface-200 focus:outline-none focus:border-primary-500/50 focus:ring-4 focus:ring-primary-500/5 transition-all"
            />
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto">
            <button 
              onClick={() => setShowImport(true)}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 rounded-xl bg-surface-800 px-5 py-3 text-sm font-bold text-surface-200 hover:bg-surface-700 active:scale-[0.98] transition-all"
            >
              <FileUp className="h-4 w-4 text-primary-500" /> Importar
            </button>
            <button 
              onClick={() => setShowForm(true)} 
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary-500/20 hover:bg-primary-500 active:scale-[0.98] transition-all whitespace-nowrap"
            >
              <Plus className="h-4 w-4" /> Novo Contato
            </button>
          </div>
        </div>

        {/* Filtros e Stats */}
        <div className="glass-card p-2 flex flex-wrap items-center gap-2">
          <div className="px-4 py-2 flex items-center gap-2 border-r border-surface-800/60 mr-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-bold text-surface-200">{total} <span className="text-surface-500 font-medium">Contatos</span></span>
          </div>
          
          <div className="flex items-center gap-1">
            <button 
              onClick={() => handleFilterChange('tag', '')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${!currentTag ? 'bg-primary-500/10 text-primary-400' : 'text-surface-500 hover:text-surface-300'}`}
            >
              Todos
            </button>
            <button 
              onClick={() => handleFilterChange('tag', 'CLICKED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${currentTag === 'CLICKED' ? 'bg-primary-500/10 text-primary-400' : 'text-surface-500 hover:text-surface-300'}`}
            >
              Clicou
            </button>
            <button 
              onClick={() => handleFilterChange('tag', 'LEAD_QUENTE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${currentTag === 'LEAD_QUENTE' ? 'bg-primary-500/10 text-primary-400' : 'text-surface-500 hover:text-surface-300'}`}
            >
              Quentes
            </button>
          </div>
        </div>

        <div className="glass-card overflow-hidden border border-surface-800/40">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-800/60 text-left text-[10px] font-black uppercase tracking-[0.15em] text-surface-600 bg-surface-900/40">
                  <th className="px-6 py-4">Identificação</th>
                  <th className="hidden px-6 py-4 md:table-cell">Empresa</th>
                  <th className="px-6 py-4">Provedor</th>
                  <th className="hidden px-6 py-4 lg:table-cell">Engajamento</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-center">Saúde</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800/40">
                {contacts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-24 text-center">
                      <div className="flex flex-col items-center gap-4 max-w-xs mx-auto">
                        <div className="h-16 w-16 rounded-full bg-surface-900 flex items-center justify-center border border-surface-800">
                          <Search className="h-8 w-8 text-surface-700" />
                        </div>
                        <div>
                          <p className="text-surface-200 font-bold">Nenhum contato encontrado</p>
                          <p className="text-xs text-surface-500 mt-1">Tente ajustar seus filtros ou importar uma nova lista de leads.</p>
                        </div>
                        <button onClick={() => router.push('/contacts')} className="mt-2 text-xs text-primary-500 font-black uppercase tracking-widest hover:text-primary-400">Limpar Filtros</button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  contacts.map((contact) => (
                    <ContactTableRow key={contact.id} contact={contact} campaigns={campaigns} />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          <div className="flex items-center justify-between px-6 py-4 bg-surface-900/20 border-t border-surface-800/60">
            <div className="text-xs text-surface-500">
              Página <span className="text-surface-300 font-bold">{page}</span> de <span className="text-surface-300 font-bold">{totalPages}</span>
            </div>
            <div className="flex gap-1">
              <button 
                disabled={page <= 1}
                onClick={() => handleFilterChange('page', (page - 1).toString())}
                className="h-8 px-3 rounded-lg bg-surface-800 text-xs font-bold text-surface-400 hover:text-surface-200 disabled:opacity-30 transition-all"
              >
                Anterior
              </button>
              <button 
                disabled={page >= totalPages}
                onClick={() => handleFilterChange('page', (page + 1).toString())}
                className="h-8 px-3 rounded-lg bg-surface-800 text-xs font-bold text-surface-400 hover:text-surface-200 disabled:opacity-30 transition-all"
              >
                Próxima
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
