"use client";
import { useState, useEffect } from "react";
import { Plus, Search, FileUp } from "lucide-react";
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
  activeProviders: Array<{ id: string; type: string }>;
}

export function ContactTable({ contacts, total, page, totalPages, campaigns, activeProviders }: ContactTableProps) {
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const currentTag = searchParams.get('tag') || "";
  const currentSearch = searchParams.get('search') || "";

  const [searchTerm, setSearchTerm] = useState(currentSearch);

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

  const filterTabs = [
    { key: "", label: "Todos", count: total },
    { key: "CLICKED", label: "Clicou" },
    { key: "LEAD_QUENTE", label: "Quentes" },
  ];

  return (
    <>
      {showForm && (
        <ContactForm 
          campaigns={campaigns} 
          activeProviders={activeProviders} 
          onClose={() => { setShowForm(false); router.refresh(); }} 
        />
      )}
      {showImport && (
        <ImportModal 
          campaigns={campaigns} 
          onClose={() => { setShowImport(false); router.refresh(); }} 
        />
      )}

      <div className="space-y-5 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs order-2 sm:order-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-600" />
            <input 
              type="text"
              placeholder="Buscar contatos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-base w-full pl-10 !py-2.5"
            />
          </div>

          <div className="flex items-center gap-2 order-1 sm:order-2">
            <button 
              onClick={() => setShowImport(true)}
              className="btn btn-secondary !py-2 text-xs"
            >
              <FileUp className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Importar</span>
            </button>
            <button 
              onClick={() => setShowForm(true)} 
              className="btn btn-primary !py-2 text-xs"
            >
              <Plus className="h-3.5 w-3.5" /> Novo Contato
            </button>
          </div>
        </div>

        {/* Filter tabs + count */}
        <div className="flex items-center gap-1 px-1">
          {filterTabs.map(tab => (
            <button 
              key={tab.key}
              onClick={() => handleFilterChange('tag', tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentTag === tab.key 
                  ? 'bg-primary-500/10 text-primary-400 shadow-sm' 
                  : 'text-surface-500 hover:text-surface-300 hover:bg-surface-800/40'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-1.5 text-[10px] opacity-60">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="glass-card overflow-hidden !p-0 !rounded-2xl">
          <div className="mobile-table-wrapper">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-800/40 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-surface-600 bg-surface-900/30">
                  <th className="px-4 py-3">Contato</th>
                  <th className="hidden md:table-cell px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">Provedor</th>
                  <th className="hidden lg:table-cell px-4 py-3">Campanha</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-center">Saúde</th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800/30">
                {contacts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-20 text-center">
                      <div className="flex flex-col items-center gap-3 max-w-xs mx-auto">
                        <div className="h-12 w-12 rounded-2xl bg-surface-900 flex items-center justify-center border border-surface-800/40">
                          <Search className="h-5 w-5 text-surface-700" />
                        </div>
                        <div>
                          <p className="text-surface-300 font-semibold text-sm">Nenhum contato encontrado</p>
                          <p className="text-xs text-surface-600 mt-1">Ajuste os filtros ou importe uma lista.</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  contacts.map((contact) => (
                    <ContactTableRow key={contact.id} contact={contact} campaigns={campaigns} activeProviders={activeProviders} />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 bg-surface-900/20 border-t border-surface-800/40">
            <p className="text-[10px] text-surface-500 tabular-nums">
              Página <span className="font-semibold text-surface-300">{page}</span> de <span className="font-semibold text-surface-300">{totalPages}</span>
            </p>
            <div className="flex gap-1">
              <button 
                disabled={page <= 1}
                onClick={() => handleFilterChange('page', (page - 1).toString())}
                className="btn btn-ghost !px-3 !py-1.5 text-xs disabled:opacity-20"
              >
                Anterior
              </button>
              <button 
                disabled={page >= totalPages}
                onClick={() => handleFilterChange('page', (page + 1).toString())}
                className="btn btn-ghost !px-3 !py-1.5 text-xs disabled:opacity-20"
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
