export const dynamic = "force-dynamic";

import { Settings, Mail, Shield, Bell, Database, Zap, CheckCircle2, XCircle } from "lucide-react";
import { supabaseAdmin } from "@/shared/lib/supabase";
import { PROVIDER_LABELS, PROVIDER_COLORS } from "@/shared/lib/constants";
import { SetupProvidersButton } from "@/features/email/components/setup-providers-button";
import { ProviderToggle } from "@/features/email/components/provider-toggle";

async function getProviderConfigs() {
  const { data, error } = await supabaseAdmin
    .from('ProviderConfig')
    .select('*')
    .order('provider', { ascending: true });
  
  if (error) {
    console.error('Erro ao buscar ProviderConfig:', error);
    return [];
  }
  return data || [];
}

export default async function SettingsPage() {
  const providers = await getProviderConfigs();
  const hasProviders = providers.length > 0;

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div>
        <h1 className="text-2xl font-bold text-surface-50 flex items-center gap-3">
          <Settings className="h-6 w-6 text-primary-500" />
          Configurações
        </h1>
        <p className="mt-1 text-sm text-surface-500">Gerencie provedores de email, limites e preferências da plataforma.</p>
      </div>

      {/* Provedores de Email */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-500/10">
              <Mail className="h-5 w-5 text-primary-400" />
            </div>
            <div>
              <h2 className="font-bold text-surface-100">Provedores de Email</h2>
              <p className="text-xs text-surface-500">Configure remetentes, limites diários e status de cada provedor.</p>
            </div>
          </div>
          {!hasProviders && <SetupProvidersButton />}
        </div>

        {hasProviders ? (
          <div className="space-y-4">
            {providers.map((provider: any) => {
              const color = PROVIDER_COLORS[provider.provider as keyof typeof PROVIDER_COLORS] ?? "#6b7280";
              const label = PROVIDER_LABELS[provider.provider as keyof typeof PROVIDER_LABELS] ?? provider.provider;
              const usagePct = provider.dailyLimit > 0 ? Math.round((provider.sentToday / provider.dailyLimit) * 100) : 0;
              
              return (
                <div key={provider.id} className="p-4 rounded-xl bg-surface-900/30 border border-surface-800/50 hover:border-surface-700/50 transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}40` }} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-surface-200">{label}</h3>
                          {provider.isActive ? (
                            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Ativo</span>
                          ) : (
                            <span className="text-[9px] font-black uppercase tracking-widest text-surface-600 bg-surface-800 px-1.5 py-0.5 rounded">Inativo</span>
                          )}
                        </div>
                        <p className="text-[10px] text-surface-500 mt-0.5 truncate">
                          <span className="text-surface-400 font-medium">{provider.fromName}</span> &lt;{provider.fromEmail}&gt;
                        </p>
                      </div>
                    </div>
                    <ProviderToggle providerId={provider.id} isActive={provider.isActive} />
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-3">
                    <div className="text-center p-2 rounded-lg bg-surface-800/30">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-surface-600">Peso</p>
                      <p className="text-lg font-black text-surface-300">{provider.weight}</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-surface-800/30">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-surface-600">Enviados Hoje</p>
                      <p className="text-lg font-black text-surface-300">{provider.sentToday}</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-surface-800/30">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-surface-600">Limite Diário</p>
                      <p className="text-lg font-black text-surface-300">{provider.dailyLimit}</p>
                    </div>
                  </div>

                  {/* Barra de uso */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-surface-600">Uso Diário</span>
                      <span className="text-[9px] font-mono text-surface-500">{usagePct}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-1000" 
                        style={{ 
                          width: `${usagePct}%`, 
                          backgroundColor: usagePct > 80 ? '#ef4444' : color,
                          boxShadow: `0 0 6px ${usagePct > 80 ? 'rgba(239,68,68,0.3)' : `${color}30`}` 
                        }} 
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-10 text-center border-2 border-dashed border-surface-800 rounded-2xl">
            <Zap className="h-8 w-8 text-surface-700 mx-auto mb-3" />
            <p className="text-xs text-surface-600 uppercase tracking-widest">Nenhum provedor configurado</p>
            <p className="text-xs text-surface-500 mt-1">Clique em "Configurar Conexões Iniciais" para começar</p>
          </div>
        )}
      </div>

      {/* Outras configurações */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-3 text-primary-400">
            <Shield className="h-5 w-5" />
            <h2 className="font-semibold text-surface-100">Segurança</h2>
          </div>
          <p className="text-sm text-surface-400">Altere sua senha e gerencie sessões ativas.</p>
        </div>

        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-3 text-primary-400">
            <Database className="h-5 w-5" />
            <h2 className="font-semibold text-surface-100">Plano e Faturamento</h2>
          </div>
          <p className="text-sm text-surface-400">Gerencie sua assinatura e veja seu histórico de faturas.</p>
        </div>
      </div>
    </div>
  );
}
