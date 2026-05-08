/**
 * Dashboard Home — Página principal com overview de métricas.
 * Refatorado para Advanced Analytics (Fase 5).
 */
export const dynamic = "force-dynamic";

import {
  Users,
  Mail,
  TrendingUp,
  BarChart3,
  Activity,
  Zap,
  Globe,
} from "lucide-react";
import { getDashboardStats } from "@/features/analytics/lib/queries";
import { formatDate, calcPercentage } from "@/shared/lib/utils";
import { StatusBadge } from "@/shared/components/status-badge";
import { DashboardCharts } from "@/features/analytics/components/dashboard-charts";

export default async function DashboardPage() {
  try {
    const stats = await getDashboardStats();

    const metricCards = [
      {
        label: "Audiência Total",
        value: stats.totalContacts.toLocaleString("pt-BR"),
        icon: Users,
        color: "from-blue-500 to-indigo-600",
        trend: stats.growthData.length > 0 ? `+${stats.growthData[stats.growthData.length-1].count}` : "Novo",
      },
      {
        label: "Aberturas (Total)",
        value: stats.totalOpened.toLocaleString("pt-BR"),
        icon: Zap,
        color: "from-amber-500 to-orange-600",
        trend: `${stats.openRate}% Rate`,
      },
      {
        label: "Engajamento",
        value: `${stats.openRate}%`,
        icon: TrendingUp,
        color: "from-emerald-500 to-teal-600",
        trend: "Top 5%",
      },
      {
        label: "Taxa de Rejeição",
        value: `${stats.bounceRate}%`,
        icon: Activity,
        color: "from-red-500 to-rose-600",
        trend: stats.bounceRate < 5 ? "Saudável" : "Atenção",
      },
    ] as const;

    return (
      <div className="space-y-8 animate-fade-in pb-10">
        {/* Header Estratégico */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-surface-50 tracking-tight">
              Dashboard de Inteligência
            </h1>
            <p className="mt-1 text-sm text-surface-500 flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary-500" />
              Monitoramento global de entregabilidade em tempo real.
            </p>
          </div>
          
          <div className="flex items-center gap-2 px-4 py-2 bg-surface-900 border border-surface-800 rounded-full">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-surface-300 uppercase tracking-widest">Sistema Operacional</span>
          </div>
        </div>

        {/* KPIs Principais */}
        <div className="dashboard-grid">
          {metricCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="glass-card relative overflow-hidden group p-6"
              >
                <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${card.color} opacity-[0.03] -mr-8 -mt-8 rounded-full blur-2xl group-hover:opacity-10 transition-opacity`} />
                
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${card.color} shadow-lg shadow-primary-500/10`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded ${
                    card.label === "Taxa de Rejeição" && stats.bounceRate >= 5 ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"
                  }`}>
                    {card.trend}
                  </span>
                </div>
                
                <p className="text-xs font-bold uppercase tracking-widest text-surface-500">
                  {card.label}
                </p>
                <p className="mt-1 text-3xl font-black text-surface-50">
                  {card.value}
                </p>
              </div>
            );
          })}
        </div>

        {/* Seção de Gráficos Avançados */}
        <DashboardCharts 
          funnelData={stats.funnelData} 
          trendData={stats.trendData} 
          growthData={stats.growthData}
          campaignPerformance={stats.campaignsPerformance}
        />

        {/* Terceira Linha: Distribuição e Live Feed */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Provider Health */}
          <div className="glass-card p-6">
            <h2 className="mb-6 text-sm font-bold uppercase tracking-widest text-surface-400 flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary-500" />
              Saúde dos Provedores
            </h2>
            <div className="space-y-5">
              {stats.providerCounts.map((p) => {
                const percentage = calcPercentage(p.count, stats.totalContacts);
                const providerColor = "#3b82f6"; // Default blue
                return (
                  <div key={p.provider} className="group">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-2 w-2 rounded-full" 
                          style={{ backgroundColor: providerColor }}
                        />
                        <span className="text-xs font-bold text-surface-300">
                          {p.provider}
                        </span>
                      </div>
                      <span className="text-xs text-surface-500 font-mono">
                        {p.count} leads
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-900 border border-surface-800/50">
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-out group-hover:opacity-80"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: providerColor,
                          boxShadow: `0 0 10px ${providerColor}40`
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Activity Feed */}
          <div className="glass-card p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-bold uppercase tracking-widest text-surface-400 flex items-center gap-2">
                < Zap className="h-4 w-4 text-amber-500" />
                Live Feed de Interações
              </h2>
              <span className="text-[10px] text-surface-600 font-medium">ATUALIZAÇÃO AUTOMÁTICA</span>
            </div>
            
            <div className="space-y-3">
              {stats.recentEvents.slice(0, 6).map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-4 p-3 rounded-xl bg-surface-900/30 border border-surface-800/50 hover:border-primary-500/30 transition-all hover:translate-x-1"
                >
                  <StatusBadge status={event.eventType} label={event.eventType} size="sm" dot />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-bold text-surface-100">
                      {event.contact.email}
                    </p>
                    <p className="text-[10px] text-surface-500 flex items-center gap-2">
                      {formatDate(event.timestamp)} 
                      {event.clickedUrl && (
                        <span className="text-primary-500 font-medium truncate">
                           ➔ Clicou em link
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
              
              {stats.recentEvents.length === 0 && (
                <div className="py-10 text-center border-2 border-dashed border-surface-900 rounded-2xl">
                   <p className="text-xs text-surface-600 uppercase tracking-widest">Aguardando interações...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error: any) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center bg-surface-950 rounded-3xl border border-red-500/10">
        <div className="mb-6 p-5 rounded-full bg-red-500/10 text-red-500">
          <Activity className="h-12 w-10" />
        </div>
        <h2 className="text-2xl font-bold text-surface-50">Falha na Sincronização</h2>
        <p className="mt-2 max-w-md text-surface-400 text-sm">
          Não conseguimos processar os dados analíticos via HTTPS.
        </p>
        <div className="mt-8 w-full max-w-2xl overflow-hidden rounded-xl border border-surface-800 bg-surface-900 p-4 text-left font-mono text-[10px] text-red-400">
          {error.message || String(error)}
        </div>
      </div>
    );
  }
}
