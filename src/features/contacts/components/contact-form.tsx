"use client";

import { useActionState } from "react";
import { X, Loader2, UserPlus, Mail, User, Building2, Phone, Tag, Activity, Edit2, Server } from "lucide-react";
import { createContact, updateContact, type CreateContactState } from "@/features/contacts/actions/create-contact";

interface ContactFormProps {
  campaigns: Array<{ id: string; name: string }>;
  activeProviders?: Array<{ id: string; type: string }>;
  onClose: () => void;
  initialData?: {
    id: string;
    email: string;
    name: string | null;
    company: string | null;
    phone: string | null;
    tags: string[];
    status: string;
    provider?: string;
  };
}

export function ContactForm({ onClose, campaigns, activeProviders = [], initialData }: ContactFormProps) {
  const isEditing = !!initialData;
  const [state, formAction, isPending] = useActionState<CreateContactState, FormData>(
    isEditing ? updateContact : createContact,
    {}
  );

  if (state.success) {
    setTimeout(onClose, 500);
  }

  const inputClass = "h-11 w-full rounded-xl border border-surface-800 bg-surface-900/50 pl-11 pr-4 text-sm text-surface-200 placeholder:text-surface-600 transition-all focus:border-primary-500/50 focus:outline-none focus:ring-4 focus:ring-primary-500/5";
  const labelClass = "mb-1.5 block text-[10px] font-black uppercase tracking-widest text-surface-500 ml-1";
  const iconClass = "absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-600 group-focus-within:text-primary-500 transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass-card w-full max-w-lg animate-in fade-in zoom-in duration-200 overflow-hidden">
        <div className="flex items-center justify-between border-b border-surface-800/60 px-6 py-5 bg-surface-900/20">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-500/10 text-primary-500 border border-primary-500/20">
              {isEditing ? <Edit2 className="h-6 w-6" /> : <UserPlus className="h-6 w-6" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-surface-50">{isEditing ? "Editar Contato" : "Novo Contato"}</h2>
              <p className="text-xs text-surface-500 font-medium">{isEditing ? "Atualize as informações do lead" : "Cadastre um lead manualmente"}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-surface-500 hover:bg-surface-800 hover:text-surface-300 transition-all">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-8">
          {state.error && (
            <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400 flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
              {state.error}
            </div>
          )}
          
          {state.success && (
            <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-400 flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              {isEditing ? "Contato atualizado com sucesso!" : "Contato cadastrado com sucesso!"}
            </div>
          )}

          <form action={formAction} className="space-y-5">
            {isEditing && <input type="hidden" name="id" value={initialData.id} />}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label htmlFor="contact-email" className={labelClass}>Email Principal *</label>
                <div className="relative group">
                   <Mail className={iconClass} />
                   <input 
                    id="contact-email" 
                    name="email" 
                    type="email" 
                    required 
                    placeholder="ex: joao@empresa.com" 
                    className={`${inputClass} ${isEditing ? 'opacity-60 cursor-not-allowed' : ''}`}
                    defaultValue={initialData?.email}
                    readOnly={isEditing}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="contact-name" className={labelClass}>Nome Completo</label>
                <div className="relative group">
                  <User className={iconClass} />
                  <input id="contact-name" name="name" type="text" placeholder="ex: João Silva" className={inputClass} defaultValue={initialData?.name ?? ""} />
                </div>
              </div>
 
              <div>
                <label htmlFor="contact-phone" className={labelClass}>Telefone / WhatsApp</label>
                <div className="relative group">
                  <Phone className={iconClass} />
                  <input id="contact-phone" name="phone" type="tel" placeholder="ex: (11) 99999-9999" className={inputClass} defaultValue={initialData?.phone ?? ""} />
                </div>
              </div>
 
              <div>
                <label htmlFor="contact-company" className={labelClass}>Empresa</label>
                <div className="relative group">
                  <Building2 className={iconClass} />
                  <input id="contact-company" name="company" type="text" placeholder="ex: Tech Solutions" className={inputClass} defaultValue={initialData?.company ?? ""} />
                </div>
              </div>
 
              <div>
                <label htmlFor="contact-tags" className={labelClass}>Tags (separadas por vírgula)</label>
                <div className="relative group">
                  <Tag className={iconClass} />
                  <input id="contact-tags" name="tags" type="text" placeholder="ex: lead, vip, 2024" className={inputClass} defaultValue={initialData?.tags?.join(", ")} />
                </div>
              </div>

              {/* Seletor de Provedor */}
              <div>
                <label htmlFor="contact-provider" className={labelClass}>Provedor de Email</label>
                <div className="relative group">
                  <Server className={iconClass} />
                  <select id="contact-provider" name="provider" className={inputClass} defaultValue={initialData?.provider ?? ""}>
                    {!isEditing && <option value="">Automático (Fila Ordenada)</option>}
                    {activeProviders.map((p) => (
                      <option key={p.id} value={p.id}>{p.id} ({p.type === 'SMTP' ? 'SMTP' : 'API'})</option>
                    ))}
                  </select>
                </div>
              </div>

              {!isEditing && (
                <div className="md:col-span-2">
                  <label htmlFor="contact-campaign" className={labelClass}>Adicionar à Campanha</label>
                  <div className="relative group">
                    <Activity className={iconClass} />
                    <select id="contact-campaign" name="campaignId" className={inputClass}>
                      <option value="">Nenhuma campanha (Apenas cadastrar)</option>
                      {campaigns.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <p className="mt-1.5 text-[10px] text-surface-500 italic ml-1">
                    Se selecionado, o contato iniciará o fluxo de emails automaticamente.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4">
              <button 
                type="submit" 
                disabled={isPending} 
                className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl bg-primary-600 font-bold text-white shadow-xl shadow-primary-500/20 hover:bg-primary-500 active:scale-[0.98] disabled:opacity-50 transition-all"
              >
                {isPending ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> Processando...</>
                ) : (
                  <>
                    {isEditing ? <Edit2 className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
                    {isEditing ? "Salvar Alterações" : "Confirmar Cadastro"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
