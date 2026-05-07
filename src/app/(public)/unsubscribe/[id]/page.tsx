import { supabaseAdmin } from "@/shared/lib/supabase";
import { Mail, ShieldCheck, XCircle } from "lucide-react";
import { notFound } from "next/navigation";

interface UnsubscribePageProps {
  params: Promise<{ id: string }>;
}

/**
 * Página de Descadastro (Unsubscribe) — World-Class Compliance.
 * Permite que o lead saia da lista de forma simples e respeitosa.
 */
export default async function UnsubscribePage({ params }: UnsubscribePageProps) {
  const { id: contactId } = await params;

  // 1. Verificar se o contato existe via Admin (público não tem RLS pra ler)
  const { data: contact, error } = await supabaseAdmin
    .from('Contact')
    .select('id, email, name, status')
    .eq('id', contactId)
    .single();

  if (error || !contact) {
    notFound();
  }

  // Se já estiver descadastrado, mostrar mensagem diferente
  const alreadyUnsubscribed = contact.status === 'UNSUBSCRIBED';

  // Action para processar o descadastro
  async function handleUnsubscribe() {
    'use server';
    
    // Usar Admin para garantir que o update funcione (bypass RLS)
    const { importSupabaseAdmin } = await import("@/shared/lib/supabase-server");
    const admin = importSupabaseAdmin();
    
    await admin
      .from('Contact')
      .update({ status: 'UNSUBSCRIBED', updatedAt: new Date().toISOString() })
      .eq('id', contactId);
      
    // Também pausar todas as campanhas ativas para este contato
    await admin
      .from('CampaignContact')
      .update({ isPaused: true, stepStatus: 'PENDING', updatedAt: new Date().toISOString() })
      .eq('contactId', contactId);
  }

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md glass-card p-8 text-center space-y-6 border-surface-800 shadow-2xl">
        <div className="flex justify-center">
          <div className="p-3 bg-primary-500/10 rounded-full border border-primary-500/20">
            <Mail className="h-8 w-8 text-primary-400" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-surface-50">
            {alreadyUnsubscribed ? "Você já foi descadastrado" : "Sentiremos sua falta!"}
          </h1>
          <p className="text-surface-400 text-sm">
            Olá <span className="text-surface-200 font-medium">{contact.name || contact.email}</span>, 
            {alreadyUnsubscribed 
              ? " você já foi removido da nossa lista de e-mails."
              : " confirmamos sua solicitação para parar de receber nossos e-mails."
            }
          </p>
        </div>

        {!alreadyUnsubscribed && (
          <form action={handleUnsubscribe}>
            <button
              type="submit"
              className="w-full py-4 bg-surface-800 hover:bg-red-500/20 hover:text-red-400 border border-surface-700 hover:border-red-500/30 rounded-xl font-bold text-surface-200 transition-all active:scale-[0.98] group flex items-center justify-center gap-2"
            >
              <XCircle className="h-5 w-5 group-hover:animate-pulse" />
              Confirmar Descadastro
            </button>
          </form>
        )}

        <div className="pt-4 border-t border-surface-800">
          <div className="flex items-center justify-center gap-2 text-[10px] text-surface-600 uppercase tracking-widest">
            <ShieldCheck className="h-3 w-3" />
            Privacidade Garantida pela MailPulse
          </div>
        </div>
      </div>
      
      <p className="mt-8 text-surface-700 text-[10px] uppercase tracking-[0.2em]">
        © 2026 MailPulse Marketing Automation
      </p>
    </div>
  );
}
