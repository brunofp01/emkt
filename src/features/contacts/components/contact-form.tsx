"use client";

import { useActionState } from "react";
import { X, Loader2, UserPlus } from "lucide-react";
import { createContact, type CreateContactState } from "@/features/contacts/actions/create-contact";

interface ContactFormProps {
  onClose: () => void;
}

export function ContactForm({ onClose }: ContactFormProps) {
  const [state, formAction, isPending] = useActionState<CreateContactState, FormData>(
    createContact,
    {}
  );

  if (state.success) {
    setTimeout(onClose, 300);
  }

  const inputClass = "h-10 w-full rounded-lg border border-surface-800 bg-surface-900/50 px-4 text-sm text-surface-200 placeholder:text-surface-600 transition-colors focus:border-primary-500/50 focus:outline-none focus:ring-1 focus:ring-primary-500/20";
  const labelClass = "mb-1.5 block text-xs font-medium uppercase tracking-wider text-surface-400";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-card w-full max-w-md animate-fade-in p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700">
              <UserPlus className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-surface-50">Novo Contato</h2>
              <p className="text-xs text-surface-500">Provedor atribuído automaticamente</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-surface-500 hover:bg-surface-800 hover:text-surface-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        {state.error && <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{state.error}</div>}
        {state.success && <div className="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">✓ Contato criado!</div>}

        <form action={formAction} className="space-y-4">
          <div><label htmlFor="contact-email" className={labelClass}>Email *</label><input id="contact-email" name="email" type="email" required placeholder="contato@empresa.com" className={inputClass} /></div>
          <div><label htmlFor="contact-name" className={labelClass}>Nome</label><input id="contact-name" name="name" type="text" placeholder="João Silva" className={inputClass} /></div>
          <div><label htmlFor="contact-company" className={labelClass}>Empresa</label><input id="contact-company" name="company" type="text" placeholder="Empresa Ltda" className={inputClass} /></div>
          <div><label htmlFor="contact-phone" className={labelClass}>Telefone</label><input id="contact-phone" name="phone" type="tel" placeholder="(11) 99999-9999" className={inputClass} /></div>
          <div><label htmlFor="contact-tags" className={labelClass}>Tags (vírgula)</label><input id="contact-tags" name="tags" type="text" placeholder="lead, marketing" className={inputClass} /></div>
          <button type="submit" disabled={isPending} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary-600 font-medium text-white shadow-lg shadow-primary-500/20 hover:bg-primary-500 active:scale-[0.98] disabled:opacity-50">
            {isPending ? <><Loader2 className="h-4 w-4 animate-spin" />Criando...</> : <><UserPlus className="h-4 w-4" />Criar Contato</>}
          </button>
        </form>
      </div>
    </div>
  );
}
