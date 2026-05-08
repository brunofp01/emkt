"use client";
import { useState, useEffect } from "react";
import { Plus, Search, FileUp, LayoutGrid, List } from "lucide-react";
import { ContactForm } from "./contact-form";
import { ImportModal } from "./import-modal";
import { ContactTableRow } from "./contact-table-row";
import { ContactCard } from "./contact-card";
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
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
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
        {/* Header Superior */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-surface-900/20 p-4 rounded-2xl border border-surface-800/40">
          <div className="relative w-full lg:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-600" />
            <input 
              type="text"
              placeholder="Pesquisar contatos por email, nome ou empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-base w-full pl-10 !py-3 !bg-surface-950/50"
            />
          </div>

          <div className="flex items-center justify-between lg:justify-end gap-3">
            {/* View Toggle */}
            <div className="flex items-center bg-surface-950/50 rounded-xl p-1 border border-surface-800/60">
              <button 
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'text-surface-500 hover:text-surface-300'}`}
                title="Visualização em Grid"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button 
                onClick={() => setViewMode("table")}
                className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'text-surface-500 hover:text-surface-300'}`}
                title="Visualização em Tabela"
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            <div className="h-8 w-px bg-surface-800 mx-1 hidden sm:block" />

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowImport(true)}
                className="btn btn-secondary !py-2.5 !px-4 text-xs font-bold"
              >
                <FileUp className="h-3.5 w-3.5" /> Importar
              </button>
              <button 
                onClick={() => setShowForm(true)} 
                className="btn btn-primary !py-2.5 !px-4 text-xs font-bold"
              >
                <Plus className="h-3.5 w-3.5" /> Novo Contato
              </button>
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 px-1 custom-scrollbar">
          {filterTabs.map(tab => (
            <button 
              key={tab.key}
              onClick={() => handleFilterChange('tag', tab.key)}
              className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border ${
                currentTag === tab.key 
                  ? 'bg-primary-500/10 border-primary-500/30 text-primary-400 shadow-sm' 
                  : 'bg-surface-900/30 border-surface-800/40 text-surface-500 hover:text-surface-300 hover:bg-surface-800/40'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={`ml-2 px-1.5 py-0.5 rounded-md text-[9px] ${currentTag === tab.key ? 'bg-primary-500 text-white' : 'bg-surface-800 text-surface-500'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        {contacts.length === 0 ? (
          <div className="glass-card flex flex-col items-center justify-center py-32 text-center">
            <div className="h-16 w-16 rounded-3xl bg-surface-900 flex items-center justify-center border border-surface-800/40 mb-6 rotate-3">
              <Search className="h-8 w-8 text-surface-700" />
            </div>
            <h3 className="text-lg font-bold text-surface-50">Nenhum contato encontrado</h3>
            <p className="text-sm text-surface-500 mt-2 max-w-xs">
              Tente ajustar seus filtros ou pesquisar por um termo diferente.
            </p>
          </div>
        ) : (
          viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {contacts.map((contact) => (
                <ContactCard 
                  key={contact.id} 
                  contact={contact} 
                  campaigns={campaigns} 
                  activeProviders={activeProviders} 
                />
              ))}
            </div>
          ) : (
            <div className="glass-card overflow-hidden !p-0 !rounded-2xl border-surface-800/40">
              <div className="mobile-table-wrapper">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-surface-800/40 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-surface-600 bg-surface-900/30">
                      <th className="px-6 py-4">Contato</th>
                      <th className="hidden md:table-cell px-6 py-4">Empresa</th>
                      <th className="px-6 py-4">Provedor</th>
                      <th className="hidden lg:table-cell px-6 py-4">Campanha Ativa</th>
                      <th className="px-6 py-4">Último Evento</th>
                      <th className="px-6 py-4 text-center">Engajamento</th>
                      <th className="px-6 py-4 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-800/30">
                    {contacts.map((contact) => (
                      <ContactTableRow key={contact.id} contact={contact} campaigns={campaigns} activeProviders={activeProviders} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}

        {/* Improved Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6">
          <p className="text-[11px] font-bold uppercase tracking-widest text-surface-500">
            Página <span className="text-primary-400">{page}</span> de <span className="text-surface-300">{totalPages}</span>
            <span className="mx-3 text-surface-800">|</span>
            Total de <span className="text-surface-300">{total}</span> contatos
          </p>
          
          <div className="flex items-center gap-2">
            <button 
              disabled={page <= 1}
              onClick={() => handleFilterChange('page', (page - 1).toString())}
              className="px-4 py-2 rounded-xl bg-surface-900 border border-surface-800 text-xs font-bold text-surface-400 hover:text-surface-100 hover:border-surface-700 disabled:opacity-20 transition-all"
            >
              Anterior
            </button>
            <div className="flex gap-1">
              {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                const p = i + 1;
                return (
                  <button 
                    key={p}
                    onClick={() => handleFilterChange('page', p.toString())}
                    className={`h-8 w-8 rounded-lg text-xs font-bold transition-all ${page === p ? 'bg-primary-500 text-white' : 'bg-surface-900 text-surface-500 hover:text-surface-300'}`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
            <button 
              disabled={page >= totalPages}
              onClick={() => handleFilterChange('page', (page + 1).toString())}
              className="px-4 py-2 rounded-xl bg-surface-900 border border-surface-800 text-xs font-bold text-surface-400 hover:text-surface-100 hover:border-surface-700 disabled:opacity-20 transition-all"
            >
              Próxima
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
