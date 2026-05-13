/**
 * Dashboard Home — Visão completa e consolidada da plataforma.
 * Combina KPIs, gráficos, provedores, atividade recente e monitoramento de campanhas.
 */
export const dynamic = "force-dynamic";

import {
  Users,
  Mail,
  TrendingUp,
  Activity,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  MousePointerClick,
  BarChart3,
  Info,
} from "lucide-react";
import { getDashboardStats } from "@/features/analytics/lib/queries";
import { formatDate, calcPercentage } from "@/shared/lib/utils";
import { StatusBadge } from "@/shared/components/status-badge";
import { DashboardCharts } from "@/features/analytics/components/dashboard-charts";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export default async function DashboardPage() {
  try {
    const stats = await getDashboardStats();

    const metricCards = [
      {
        label: "Audiência Total",
        value: stats.totalContacts.toLocaleString("pt-BR"),
        icon: Users,
        gradient: "from-blue-500 to-indigo-600",
        trend: stats.growthData.length > 0 ? `+${stats.growthData[stats.growthData.length-1].count}` : "—",
        trendUp: true,
      },
      {
        label: "Emails Enviados",
        value: stats.totalSent.toLocaleString("pt-BR"),
        icon: Mail,
        gradient: "from-cyan-500 to-blue-600",
        trend: `${stats.deliveryRate || 0}% entregues`,
        trendUp: true,
      },
      {
        label: "Taxa de Abertura",
        value: `${stats.openRate}%`,
        icon: Eye,
        gradient: "from-emerald-500 to-teal-600",
        trend: stats.openRate > 20 ? "Excelente" : stats.openRate > 10 ? "Bom" : "Melhorar",
        trendUp: stats.openRate > 10,
      },
      {
        label: "Taxa de Clique",
        value: `${stats.clickRate}%`,
        icon: MousePointerClick,
        gradient: "from-violet-500 to-purple-600",
        trend: stats.clickRate > 3 ? "Acima da média" : "Normal",
        trendUp: stats.clickRate > 2,
      },
      {
        label: "Cliques Totais",
        value: stats.totalClicked.toLocaleString("pt-BR"),
        icon: TrendingUp,
        gradient: "from-cyan-500 to-blue-600",
        trend: "Últimos 30 dias",
        trendUp: true,
      },
      {
        label: "Bounces",
        value: stats.totalBounced.toLocaleString("pt-BR"),
        icon: Info,
        gradient: "from-amber-500 to-orange-600",
        trend: stats.totalBounced === 0 ? "Ótimo" : "Monitorar",
        trendUp: stats.totalBounced === 0,
      },
    ] as const;

    return (
      <div className="space-y-8 animate-fade-in pb-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-surface-500 mb-1">{getGreeting()} 👋</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-surface-50 tracking-tight">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-surface-500">Inteligência consolidada e análise de performance.</p>
          </div>
          
          <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-900/60 border border-surface-800/40 rounded-full self-start sm:self-auto">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-dot-pulse" />
            <span className="text-[10px] font-semibold text-surface-400 uppercase tracking-widest">Sistema Operacional</span>
          </div>
        </div>

        {/* KPIs — 6 cards */}
        <div className="grid gap-4 sm:gap-5 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 stagger-children">
          {metricCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="glass-card relative overflow-hidden group !p-5 xl:col-span-1">
                <div className={`absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r ${card.gradient} opacity-40 group-hover:opacity-80 transition-opacity`} />
                
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2 rounded-xl bg-gradient-to-br ${card.gradient} shadow-lg`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    card.trendUp
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-amber-500/10 text-amber-400"
                  }`}>
                    {card.trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {card.trend}
                  </span>
                </div>
                
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-surface-500">
                  {card.label}
                </p>
                <p className="mt-1 text-3xl font-black text-surface-50 tabular-nums tracking-tight">
                  {card.value}
                </p>
              </div>
            );
          })}
        </div>

        {/* Charts */}
        <DashboardCharts 
          funnelData={stats.funnelData} 
          trendData={stats.trendData} 
          growthData={stats.growthData}
          campaignPerformance={stats.campaignsPerformance}
        />

        {/* Bottom row: Provider Health + Campaign Monitoring + Live Feed */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Provider Health */}
          <div className="glass-card !p-6">
            <h2 className="mb-5 text-[11px] font-bold uppercase tracking-[0.15em] text-surface-500 flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-primary-400" />
              Saúde dos Provedores
            </h2>
            <div className="space-y-4">
              {stats.providerCounts.map((p, i) => {
                const percentage = calcPercentage(p.count, stats.totalContacts);
                const colors = ["#6366f1", "#06b6d4", "#8b5cf6", "#10b981", "#f59e0b"];
                const color = colors[i % colors.length];
                return (
                  <div key={p.provider} className="group">
                    <div className="mb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-xs font-semibold text-surface-300">{p.provider}</span>
                      </div>
                      <span className="text-[10px] text-surface-500 font-mono tabular-nums">
                        {p.count} leads
                      </span>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-surface-900 border border-surface-800/30">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${Math.max(percentage, 2)}%`,
                          backgroundColor: color,
                          boxShadow: `0 0 8px ${color}30`
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              {stats.providerCounts.length === 0 && (
                <p className="text-center py-8 text-xs text-surface-600 italic">Nenhum provedor configurado</p>
              )}
            </div>
          </div>

          {/* Campaign Monitoring */}
          <div className="glass-card !p-6">
            <h2 className="mb-5 text-[11px] font-bold uppercase tracking-[0.15em] text-surface-500 flex items-center gap-2">
              <BarChart3 className="h-3.5 w-3.5 text-violet-400" />
              Campanhas em Monitoramento
            </h2>
            <div className="space-y-2">
              {stats.campaignsPerformance.map((campaign) => (
                <div key={campaign.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-900/30 border border-surface-800/30 hover:border-surface-700/40 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`h-2 w-2 flex-shrink-0 rounded-full ${campaign.status === 'ACTIVE' ? 'bg-emerald-500 animate-dot-pulse' : 'bg-surface-600'}`} />
                    <span className="text-xs font-semibold text-surface-200 truncate">{campaign.name}</span>
                  </div>
                  <span className="text-[10px] font-semibold text-surface-500 uppercase tracking-widest ml-2 flex-shrink-0">{campaign.status}</span>
                </div>
              ))}
              {stats.campaignsPerformance.length === 0 && (
                <p className="text-center py-10 text-xs text-surface-600 italic">Nenhuma campanha</p>
              )}
            </div>
          </div>

          {/* Live Activity Feed */}
          <div className="glass-card !p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-surface-500 flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                Atividade Recente
              </h2>
              <div className="flex items-center gap-1.5">
                <div className="h-1 w-1 rounded-full bg-emerald-500 animate-dot-pulse" />
                <span className="text-[9px] text-surface-600 font-semibold uppercase tracking-widest">Live</span>
              </div>
            </div>
            
            <div className="space-y-2">
              {stats.recentEvents.slice(0, 6).map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-surface-900/30 border border-surface-800/30 hover:border-primary-500/20 transition-all duration-200 group"
                >
                  <StatusBadge status={event.eventType} label={event.eventType} size="sm" dot />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-surface-200 group-hover:text-surface-50 transition-colors">
                      {event.contact.email}
                    </p>
                    <p className="text-[10px] text-surface-500 flex items-center gap-1.5 mt-0.5">
                      {formatDate(event.timestamp)} 
                      {event.clickedUrl && (
                        <span className="text-primary-400 font-medium">• Clicou em link</span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
              
              {stats.recentEvents.length === 0 && (
                <div className="py-12 text-center border border-dashed border-surface-800/50 rounded-2xl">
                  <Zap className="h-6 w-6 text-surface-700 mx-auto mb-2" />
                  <p className="text-xs text-surface-600">Aguardando interações...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error: any) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center glass-card">
        <div className="mb-6 p-4 rounded-2xl bg-red-500/10 text-red-400">
          <Activity className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-surface-50">Algo deu errado no Dashboard</h2>
        <p className="mt-2 max-w-md text-surface-400 text-sm">
          Não conseguimos carregar estas informações agora. Isso pode ser uma falha temporária de conexão.
        </p>
        <div className="mt-4 text-[10px] text-surface-600 font-mono">Erro interno do dashboard</div>
      </div>
    );
  }
}
