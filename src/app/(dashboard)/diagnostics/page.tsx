
import { supabaseAdmin } from "@/shared/lib/supabase";
import { env } from "@/shared/lib/env";

export default async function DiagnosticsPage() {
  const checks = [];

  // 1. Check Supabase
  try {
    const start = Date.now();
    const { data: contacts, error } = await supabaseAdmin.from('Contact').select('id', { count: 'exact', head: true });
    const end = Date.now();
    checks.push({
      name: "Supabase Connection (Contact table)",
      status: error ? "ERROR" : "OK",
      details: error ? error.message : `Success (${end - start}ms). Count: ${contacts?.length ?? 0}`,
    });
  } catch (e: any) {
    checks.push({ name: "Supabase Connection", status: "CRITICAL", details: e.message });
  }

  // 2. Check ProviderConfig
  try {
    const { data: providers, error } = await supabaseAdmin.from('ProviderConfig').select('*');
    checks.push({
      name: "Provider Configuration",
      status: (error || !providers || providers.length === 0) ? "ERROR" : "OK",
      details: error ? error.message : (providers?.length === 0 ? "No active providers found in ProviderConfig table." : `${providers?.length} providers configured.`),
    });
  } catch (e: any) {
    checks.push({ name: "Provider Configuration", status: "CRITICAL", details: e.message });
  }

  // 3. Check Env Vars
  const envVars = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "RESEND_API_KEY",
    "BREVO_API_KEY",
  ];
  
  const envResults = envVars.map(v => ({
    name: v,
    status: (env as any)[v] ? "LOADED" : "MISSING",
    details: (env as any)[v] ? "Value present" : "Variable not found in process.env",
  }));

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-surface-50">Sistema de Diagnóstico</h1>
        <p className="text-surface-500 mt-1">Verificação de integridade da infraestrutura e banco de dados.</p>
      </div>

      <div className="grid gap-6">
        <div className="glass-card p-6">
          <h2 className="text-sm font-black uppercase tracking-widest text-primary-500 mb-6">Status dos Serviços</h2>
          <div className="space-y-4">
            {checks.map((check, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-surface-900/50 border border-surface-800">
                <div>
                  <p className="text-sm font-bold text-surface-100">{check.name}</p>
                  <p className="text-xs text-surface-500 mt-0.5">{check.details}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  check.status === "OK" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                }`}>
                  {check.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-sm font-black uppercase tracking-widest text-primary-500 mb-6">Variáveis de Ambiente</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {envResults.map((result, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-surface-900/30 border border-surface-800/60">
                <span className="text-xs font-medium text-surface-400">{result.name}</span>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                  result.status === "LOADED" ? "text-emerald-500 bg-emerald-500/5" : "text-red-500 bg-red-500/5"
                }`}>
                  {result.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
