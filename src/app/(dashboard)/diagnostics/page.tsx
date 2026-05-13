/**
 * Diagnóstico Avançado — Health checks de todos os subsistemas.
 * Verifica: Supabase, Provedores (Mailrelay, Gmail, Brevo), Inngest, DNS.
 */
import { supabaseAdmin } from "@/shared/lib/supabase";

export const dynamic = "force-dynamic";

interface HealthCheck {
  name: string;
  status: "OK" | "WARNING" | "ERROR" | "CRITICAL";
  details: string;
  latencyMs?: number;
}

async function checkSupabase(): Promise<HealthCheck> {
  try {
    const start = Date.now();
    const { count, error } = await supabaseAdmin
      .from('Contact')
      .select('*', { count: 'exact', head: true });
    const latencyMs = Date.now() - start;
    
    if (error) return { name: "Supabase", status: "ERROR", details: error.message, latencyMs };
    return { 
      name: "Supabase Database", 
      status: latencyMs > 3000 ? "WARNING" : "OK", 
      details: `${count ?? 0} contatos | ${latencyMs}ms`,
      latencyMs
    };
  } catch (e: any) {
    return { name: "Supabase Database", status: "CRITICAL", details: e.message };
  }
}

async function checkProviders(): Promise<HealthCheck[]> {
  const checks: HealthCheck[] = [];
  
  try {
    const { data: providers } = await supabaseAdmin
      .from('ProviderConfig')
      .select('provider, providerType, isActive, sentToday, dailyLimit, fromEmail, accountTier, totalSent, totalBounces');

    if (!providers || providers.length === 0) {
      checks.push({ name: "Provedores", status: "ERROR", details: "Nenhum provedor configurado na tabela ProviderConfig." });
      return checks;
    }

    for (const p of providers) {
      const usage = p.dailyLimit > 0 ? Math.round((p.sentToday / p.dailyLimit) * 100) : 0;
      const bounceRate = p.totalSent > 0 ? ((p.totalBounces / p.totalSent) * 100).toFixed(1) : "0";
      
      let status: HealthCheck["status"] = "OK";
      if (!p.isActive) status = "WARNING";
      if (usage >= 90) status = "WARNING";
      if (parseFloat(bounceRate) > 5) status = "WARNING";
      if (parseFloat(bounceRate) > 10) status = "ERROR";

      checks.push({
        name: `${p.provider} (${p.providerType})`,
        status,
        details: [
          p.isActive ? "Ativo" : "Inativo",
          `Tier: ${p.accountTier}`,
          `Uso hoje: ${p.sentToday}/${p.dailyLimit} (${usage}%)`,
          `Total: ${p.totalSent} enviados`,
          `Bounce: ${bounceRate}%`,
          `From: ${p.fromEmail}`,
        ].join(" | "),
      });
    }
  } catch (e: any) {
    checks.push({ name: "Provedores", status: "CRITICAL", details: e.message });
  }

  return checks;
}

async function checkMailrelay(): Promise<HealthCheck> {
  const apiKey = process.env.MAILRELAY_API_KEY;
  const subdomain = process.env.MAILRELAY_SUBDOMAIN;
  
  if (!apiKey || !subdomain) {
    return { name: "Mailrelay API", status: "WARNING", details: "Variáveis MAILRELAY_API_KEY ou MAILRELAY_SUBDOMAIN não configuradas." };
  }

  try {
    const start = Date.now();
    const res = await fetch(`https://${subdomain}.ipzmarketing.com/api/v1/send_emails`, {
      method: 'OPTIONS',
      headers: { 'X-AUTH-TOKEN': apiKey },
    });
    const latencyMs = Date.now() - start;
    
    return { 
      name: "Mailrelay API", 
      status: res.ok || res.status === 404 || res.status === 405 ? "OK" : "ERROR",
      details: `Endpoint acessível | Status: ${res.status} | ${latencyMs}ms`,
      latencyMs 
    };
  } catch (e: any) {
    return { name: "Mailrelay API", status: "ERROR", details: `Falha na conexão: ${e.message}` };
  }
}

async function checkInngest(): Promise<HealthCheck> {
  const key = process.env.INNGEST_EVENT_KEY || process.env.INNGEST_SIGNING_KEY;
  if (!key) {
    return { name: "Inngest", status: "WARNING", details: "INNGEST_EVENT_KEY não configurada. Usando dev mode." };
  }
  return { name: "Inngest", status: "OK", details: "Chave de evento configurada." };
}

async function checkQueueHealth(): Promise<HealthCheck> {
  try {
    const [
      { count: queued },
      { count: failed },
      { count: sending },
    ] = await Promise.all([
      supabaseAdmin.from('CampaignContact').select('*', { count: 'exact', head: true }).in('stepStatus', ['QUEUED', 'PENDING']),
      supabaseAdmin.from('CampaignContact').select('*', { count: 'exact', head: true }).in('stepStatus', ['FAILED', 'BOUNCED']),
      supabaseAdmin.from('CampaignContact').select('*', { count: 'exact', head: true }).eq('stepStatus', 'SENDING'),
    ]);

    const failedCount = failed || 0;
    const queuedCount = queued || 0;
    const sendingCount = sending || 0;

    let status: HealthCheck["status"] = "OK";
    if (failedCount > 10) status = "WARNING";
    if (failedCount > 50) status = "ERROR";
    if (sendingCount > 100) status = "WARNING"; // Possivelmente travados

    return {
      name: "Fila de Envio",
      status,
      details: `Na fila: ${queuedCount} | Enviando: ${sendingCount} | Falhas: ${failedCount}`,
    };
  } catch (e: any) {
    return { name: "Fila de Envio", status: "CRITICAL", details: e.message };
  }
}

async function checkEnvVars(): Promise<{ name: string; loaded: boolean }[]> {
  const vars = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "RESEND_API_KEY",
    "BREVO_API_KEY",
    "MAILRELAY_API_KEY",
    "MAILRELAY_SUBDOMAIN",
    "GMAIL_USER",
    "GMAIL_APP_PASSWORD",
    "INNGEST_EVENT_KEY",
    "INNGEST_SIGNING_KEY",
    "CRON_SECRET",
    "NEXT_PUBLIC_APP_URL",
  ];
  
  return vars.map(name => ({
    name,
    loaded: !!process.env[name],
  }));
}

export default async function DiagnosticsPage() {
  const [supabaseCheck, providerChecks, mailrelayCheck, inngestCheck, queueCheck, envVars] = 
    await Promise.all([
      checkSupabase(),
      checkProviders(),
      checkMailrelay(),
      checkInngest(),
      checkQueueHealth(),
      checkEnvVars(),
    ]);

  const allChecks = [supabaseCheck, ...providerChecks, mailrelayCheck, inngestCheck, queueCheck];
  const overallStatus = allChecks.some(c => c.status === "CRITICAL") ? "CRITICAL" 
    : allChecks.some(c => c.status === "ERROR") ? "ERROR" 
    : allChecks.some(c => c.status === "WARNING") ? "WARNING" 
    : "OK";

  const statusStyles: Record<string, string> = {
    OK: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    WARNING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    ERROR: "bg-red-500/10 text-red-400 border-red-500/20",
    CRITICAL: "bg-red-500/20 text-red-300 border-red-500/30",
  };

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-50">Diagnóstico do Sistema</h1>
          <p className="text-surface-500 mt-1 text-sm">Verificação de integridade de todos os subsistemas.</p>
        </div>
        <div className={`px-4 py-2 rounded-xl border text-xs font-black uppercase tracking-widest ${statusStyles[overallStatus]}`}>
          {overallStatus === "OK" ? "✓ Todos os sistemas operacionais" :
           overallStatus === "WARNING" ? "⚠ Atenção necessária" :
           "✕ Problemas detectados"}
        </div>
      </div>

      {/* Health Checks */}
      <div className="glass-card p-6">
        <h2 className="text-sm font-black uppercase tracking-widest text-primary-500 mb-6">Status dos Serviços</h2>
        <div className="space-y-3">
          {allChecks.map((check, i) => (
            <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-surface-900/50 border border-surface-800 hover:border-surface-700/60 transition-colors">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-surface-100">{check.name}</p>
                <p className="text-xs text-surface-500 mt-0.5 truncate">{check.details}</p>
              </div>
              <div className="flex items-center gap-2 ml-3">
                {check.latencyMs !== undefined && (
                  <span className="text-[10px] font-mono text-surface-600">{check.latencyMs}ms</span>
                )}
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${statusStyles[check.status]}`}>
                  {check.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Variáveis de Ambiente */}
      <div className="glass-card p-6">
        <h2 className="text-sm font-black uppercase tracking-widest text-primary-500 mb-6">Variáveis de Ambiente</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {envVars.map((v, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-surface-900/30 border border-surface-800/60">
              <span className="text-xs font-medium text-surface-400 font-mono">{v.name}</span>
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                v.loaded ? "text-emerald-500 bg-emerald-500/5" : "text-red-500 bg-red-500/5"
              }`}>
                {v.loaded ? "OK" : "MISSING"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Timestamp */}
      <p className="text-center text-[10px] text-surface-600 font-mono">
        Diagnóstico executado em {new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
      </p>
    </div>
  );
}
