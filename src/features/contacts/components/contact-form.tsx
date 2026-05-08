"use client";

import { useActionState } from "react";
import { X, Loader2, UserPlus, Mail, User, Building2, Phone, Tag, Activity, Edit2, Server, CheckCircle2 } from "lucide-react";
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
    setTimeout(onClose, 800);
  }

  const inputClass = "input-base pl-10 h-11";
  const labelClass = "mb-1.5 block text-[10px] font-bold uppercase tracking-[0.15em] text-surface-500";
  const iconClass = "absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-600 group-focus-within:text-primary-500 transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass-panel w-full max-w-lg animate-slide-up overflow-hidden !rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-800/40 px-6 py-5 bg-surface-900/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 text-primary-400 border border-primary-500/20">
              {isEditing ? <Edit2 className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-surface-50">{isEditing ? "Editar Contato" : "Novo Contato"}</h2>
              <p className="text-[11px] text-surface-500">{isEditing ? "Atualize as informações" : "Cadastre um lead"}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-surface-500 hover:bg-surface-800/60 hover:text-surface-300 transition-all">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6">
          {/* Success state */}
          {state.success && (
            <div className="mb-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-400 flex items-center gap-3 animate-fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {isEditing ? "Contato atualizado!" : "Contato cadastrado!"}
            </div>
          )}

          {/* Error state */}
          {state.error && (
            <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400 flex items-center gap-3 animate-fade-in">
              <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
              {state.error}
            </div>
          )}

          <form action={formAction} className="space-y-5">
            {isEditing && <input type="hidden" name="id" value={initialData.id} />}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label htmlFor="contact-email" className={labelClass}>Email *</label>
                <div className="relative group">
                  <Mail className={iconClass} />
                  <input 
                    id="contact-email" name="email" type="email" required 
                    placeholder="joao@empresa.com" 
                    className={`${inputClass} ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    defaultValue={initialData?.email}
                    readOnly={isEditing}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="contact-name" className={labelClass}>Nome</label>
                <div className="relative group">
                  <User className={iconClass} />
                  <input id="contact-name" name="name" type="text" placeholder="João Silva" className={inputClass} defaultValue={initialData?.name ?? ""} />
                </div>
              </div>

              <div>
                <label htmlFor="contact-phone" className={labelClass}>Telefone</label>
                <div className="relative group">
                  <Phone className={iconClass} />
                  <input id="contact-phone" name="phone" type="tel" placeholder="(11) 99999-9999" className={inputClass} defaultValue={initialData?.phone ?? ""} />
                </div>
              </div>

              <div>
                <label htmlFor="contact-company" className={labelClass}>Empresa</label>
                <div className="relative group">
                  <Building2 className={iconClass} />
                  <input id="contact-company" name="company" type="text" placeholder="Tech Solutions" className={inputClass} defaultValue={initialData?.company ?? ""} />
                </div>
              </div>

              <div>
                <label htmlFor="contact-tags" className={labelClass}>Tags</label>
                <div className="relative group">
                  <Tag className={iconClass} />
                  <input id="contact-tags" name="tags" type="text" placeholder="lead, vip" className={inputClass} defaultValue={initialData?.tags?.join(", ")} />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="contact-provider" className={labelClass}>Provedor</label>
                <div className="relative group">
                  <Server className={iconClass} />
                  <select id="contact-provider" name="provider" className={inputClass} defaultValue={initialData?.provider ?? ""}>
                    {!isEditing && <option value="">Automático</option>}
                    {activeProviders.map((p) => (
                      <option key={p.id} value={p.id}>{p.id} ({p.type === 'SMTP' ? 'SMTP' : 'API'})</option>
                    ))}
                  </select>
                </div>
              </div>

              {!isEditing && (
                <div className="sm:col-span-2">
                  <label htmlFor="contact-campaign" className={labelClass}>Campanha</label>
                  <div className="relative group">
                    <Activity className={iconClass} />
                    <select id="contact-campaign" name="campaignId" className={inputClass}>
                      <option value="">Nenhuma</option>
                      {campaigns.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <button 
              type="submit" 
              disabled={isPending} 
              className="btn btn-primary w-full !py-3 !text-sm"
            >
              {isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Processando...</>
              ) : (
                <>
                  {isEditing ? <Edit2 className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                  {isEditing ? "Salvar" : "Cadastrar"}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
