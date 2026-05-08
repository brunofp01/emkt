"use client";
import { useState, useEffect } from "react";
import { Plus, Search, FileUp, Trash2, Tag, Edit2, CheckSquare, Square, X, Loader2 } from "lucide-react";
import { ContactForm } from "./contact-form";
import { ImportModal } from "./import-modal";
import { ContactTableRow } from "./contact-table-row";
import { useRouter, useSearchParams } from "next/navigation";
import { bulkDeleteContacts, bulkAddTagsToContacts } from "@/features/contacts/actions/create-contact";
import { getAvailableTags } from "@/features/campaigns/actions/create-campaign";

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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [showBulkTagInput, setShowBulkTagInput] = useState(false);
  const [bulkTags, setBulkTags] = useState("");

  const router = useRouter();
  const searchParams = useSearchParams();
  
  const currentTag = searchParams.get('tag') || "";
  const currentSearch = searchParams.get('search') || "";
  const [searchTerm, setSearchTerm] = useState(currentSearch);

  // Carregar tags reais para os filtros dinâmicos
  useEffect(() => {
    getAvailableTags().then(setAvailableTags);
  }, []);

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
    if (value) params.set(key, value);
    else params.delete(key);
    params.set('page', '1');
    router.push(`?${params.toString()}`);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === contacts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(contacts.map(c => c.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Excluir ${selectedIds.length} contatos selecionados?`)) return;
    setIsProcessing(true);
    try {
      const res = await bulkDeleteContacts(selectedIds);
      if (res.error) alert(res.error);
      else {
        setSelectedIds([]);
        router.refresh();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkAddTags = async () => {
    const tagsArray = bulkTags.split(",").map(t => t.trim()).filter(Boolean);
    if (!tagsArray.length) return;
    
    setIsProcessing(true);
    try {
      const res = await bulkAddTagsToContacts(selectedIds, tagsArray);
      if (res.error) alert(res.error);
      else {
        setBulkTags("");
        setShowBulkTagInput(false);
        setSelectedIds([]);
        router.refresh();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const mainFilters = [
    { key: "", label: "Todos" },
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

      <div className="space-y-4 animate-fade-in">
        {/* Barra de Filtros e Busca */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full custom-scrollbar">
            {/* Filtros Fixos */}
            <div className="flex bg-surface-900/40 p-1 rounded-xl border border-surface-800/40 shrink-0">
              {mainFilters.map(tab => (
                <button 
                  key={tab.key}
                  onClick={() => handleFilterChange('tag', tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    currentTag === tab.key 
                      ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' 
                      : 'text-surface-500 hover:text-surface-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="h-6 w-px bg-surface-800 mx-1 shrink-0" />

            {/* Tags Dinâmicas */}
            <div className="flex gap-2">
              {availableTags.map(tag => (
                <button 
                  key={tag}
                  onClick={() => handleFilterChange('tag', tag)}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                    currentTag === tag 
                      ? 'bg-primary-500/20 border-primary-500/50 text-primary-400' 
                      : 'bg-surface-900/30 border-surface-800/60 text-surface-600 hover:text-surface-400 hover:border-surface-700'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>

          <div className="relative w-full lg:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-surface-600" />
            <input 
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-base w-full pl-9 !py-2 text-xs"
            />
          </div>
        </div>

        {/* Barra de Ações em Massa (Aparece ao selecionar) */}
        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between bg-primary-500/10 border border-primary-500/20 p-3 rounded-xl animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold text-primary-400">
                {selectedIds.length} selecionados
              </span>
              <div className="h-4 w-px bg-primary-500/20" />
              <button 
                onClick={handleBulkDelete}
                disabled={isProcessing}
                className="flex items-center gap-1.5 text-xs font-bold text-red-400 hover:text-red-300 transition-colors"
              >
                {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Excluir
              </button>
              
              <div className="relative flex items-center gap-2">
                <button 
                  onClick={() => setShowBulkTagInput(!showBulkTagInput)}
                  className="flex items-center gap-1.5 text-xs font-bold text-surface-300 hover:text-white transition-colors"
                >
                  <Tag className="h-3.5 w-3.5" /> Adicionar Tags
                </button>
                {showBulkTagInput && (
                  <div className="absolute left-0 top-8 z-50 flex items-center gap-2 bg-surface-900 p-2 rounded-xl border border-surface-800 shadow-2xl min-w-[200px]">
                    <input 
                      autoFocus
                      type="text" 
                      placeholder="Tags separadas por vírgula" 
                      className="input-base !py-1 text-[10px] flex-1"
                      value={bulkTags}
                      onChange={(e) => setBulkTags(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleBulkAddTags()}
                    />
                    <button onClick={handleBulkAddTags} className="p-1 rounded bg-primary-500 text-white">
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            <button onClick={() => setSelectedIds([])} className="text-surface-500 hover:text-surface-300">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Tabela de Contatos */}
        <div className="glass-card !p-0 overflow-hidden !rounded-2xl border-surface-800/40">
          <div className="mobile-table-wrapper">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-800/40 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-surface-600 bg-surface-900/30">
                  <th className="pl-4 pr-2 py-4 w-10">
                    <button onClick={toggleSelectAll} className="text-surface-600 hover:text-primary-500 transition-colors">
                      {selectedIds.length === contacts.length && contacts.length > 0 ? <CheckSquare className="h-4 w-4 text-primary-500" /> : <Square className="h-4 w-4" />}
                    </button>
                  </th>
                  <th className="px-4 py-4">Contato</th>
                  <th className="hidden md:table-cell px-4 py-4">Empresa</th>
                  <th className="px-4 py-4">Provedor</th>
                  <th className="hidden lg:table-cell px-4 py-4">Campanha</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4 text-center w-28">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800/30">
                {contacts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-20 text-center">
                      <p className="text-sm text-surface-500">Nenhum contato encontrado.</p>
                    </td>
                  </tr>
                ) : (
                  contacts.map((contact) => (
                    <ContactTableRow 
                      key={contact.id} 
                      contact={contact} 
                      campaigns={campaigns} 
                      activeProviders={activeProviders} 
                      isSelected={selectedIds.includes(contact.id)}
                      onSelect={() => toggleSelectOne(contact.id)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Paginação */}
        <div className="flex items-center justify-between py-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-surface-600">
            Total: <span className="text-surface-300">{total}</span>
          </p>
          <div className="flex items-center gap-4">
            <button 
              disabled={page <= 1}
              onClick={() => handleFilterChange('page', (page - 1).toString())}
              className="btn btn-secondary !py-1.5 !px-3 text-[10px] disabled:opacity-20"
            >
              Anterior
            </button>
            <span className="text-[10px] font-black text-surface-500">{page} / {totalPages}</span>
            <button 
              disabled={page >= totalPages}
              onClick={() => handleFilterChange('page', (page + 1).toString())}
              className="btn btn-secondary !py-1.5 !px-3 text-[10px] disabled:opacity-20"
            >
              Próxima
            </button>
          </div>
        </div>

        {/* Botão Flutuante Novo Contato (Mobile) */}
        <button 
          onClick={() => setShowForm(true)}
          className="fixed bottom-6 right-6 lg:hidden h-14 w-14 rounded-full bg-primary-500 text-white shadow-2xl flex items-center justify-center animate-bounce-slow z-40"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>
    </>
  );
}
