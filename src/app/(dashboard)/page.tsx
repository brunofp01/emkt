/**
 * Dashboard Analytics Unificado — Visão CEO-level.
 * 
 * Combina TODAS as métricas em uma única página com seletor de campanha.
 * Visão padrão: todas as campanhas. Com filtro: campanha específica.
 */
export const dynamic = "force-dynamic";

import {
  Mail, TrendingUp, Activity, Zap, Eye, MousePointerClick,
  ArrowUpRight, ArrowDownRight, ShieldCheck, AlertTriangle,
  SendHorizonal, Clock, Server, Users,
} from "lucide-react";
import { getDashboardStats } from "@/features/analytics/lib/queries";
import { formatDate } from "@/shared/lib/utils";
import { StatusBadge } from "@/shared/components/status-badge";
import { DashboardCharts } from "@/features/analytics/components/dashboard-charts";
import { CampaignSelector } from "@/features/analytics/components/campaign-selector";
import Link from "next/link";

interface DashboardPageProps {
  searchParams: Promise<{ campaign?: string }>;
}

function rateIndicator(rate: number, goodThreshold: number, warnThreshold: number) {
  if (rate >= goodThreshold) return { trendIcon: ArrowUpRight, color: "text-emerald-400", bg: "bg-emerald-500/10", rateLabel: "Excelente" };
  if (rate >= warnThreshold) return { trendIcon: ArrowUpRight, color: "text-amber-400", bg: "bg-amber-500/10", rateLabel: "Bom" };
  return { trendIcon: ArrowDownRight, color: "text-red-400", bg: "bg-red-500/10", rateLabel: "Atenção" };
}

function pctHelper(v: number, t: number): number {
  if (t === 0) return 0;
  return Math.round((v / t) * 100);
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const campaignId = params.campaign;

  try {
    const stats = await getDashboardStats(campaignId);

    // Hero KPI cards config
    const heroCards = [
      {
        label: campaignId ? "Contatos na Campanha" : "Audiência Total",
        value: stats.totalContacts.toLocaleString("pt-BR"),
        icon: Users,
        gradient: "from-indigo-500 to-blue-600",
        sub: campaignId
          ? `${stats.totalSent.toLocaleString("pt-BR")} enviados · ${stats.totalQueued.toLocaleString("pt-BR")} na fila`
          : `${stats.totalActive.toLocaleString("pt-BR")} ativos · ${stats.totalUnsubscribed} cancelados`,
        ...rateIndicator(campaignId ? pctHelper(stats.totalSent, stats.totalContacts) : stats.totalActive / Math.max(stats.totalContacts, 1) * 100, 90, 70),
      },
      {
        label: "Emails Enviados",
        value: stats.totalSent.toLocaleString("pt-BR"),
        icon: Mail,
        gradient: "from-blue-500 to-cyan-600",
        sub: `${stats.totalQueued.toLocaleString("pt-BR")} na fila`,
        ...rateIndicator(stats.deliveryRate, 95, 85),
      },
      {
        label: "Taxa de Entrega",
        value: `${stats.deliveryRate}%`,
        icon: ShieldCheck,
        gradient: "from-emerald-500 to-teal-600",
        sub: `${stats.totalDelivered.toLocaleString("pt-BR")} entregues`,
        ...rateIndicator(stats.deliveryRate, 95, 85),
      },
      {
        label: "Taxa de Abertura",
        value: `${stats.openRate}%`,
        icon: Eye,
        gradient: "from-amber-500 to-orange-600",
        sub: `${stats.totalOpened.toLocaleString("pt-BR")} aberturas`,
        ...rateIndicator(stats.openRate, 20, 10),
      },
      {
        label: "CTOR",
        value: `${stats.ctorRate}%`,
        icon: MousePointerClick,
        gradient: "from-violet-500 to-purple-600",
        sub: `${stats.totalClicked.toLocaleString("pt-BR")} cliques`,
        ...rateIndicator(stats.ctorRate, 10, 3),
      },
      {
        label: "Taxa de Bounce",
        value: `${stats.bounceRate}%`,
        icon: AlertTriangle,
        gradient: "from-red-500 to-rose-600",
        sub: `${stats.totalBounced.toLocaleString("pt-BR")} rejeições`,
        trendIcon: stats.bounceRate <= 2 ? ArrowDownRight : ArrowUpRight,
        color: stats.bounceRate <= 2 ? "text-emerald-400" : stats.bounceRate <= 5 ? "text-amber-400" : "text-red-400",
        bg: stats.bounceRate <= 2 ? "bg-emerald-500/10" : stats.bounceRate <= 5 ? "bg-amber-500/10" : "bg-red-500/10",
        rateLabel: stats.bounceRate <= 2 ? "Ótimo" : stats.bounceRate <= 5 ? "Monitorar" : "Crítico",
      },
    ];

    return (
      <div className="space-y-8 animate-fade-in pb-10">
        {/* Header + Campaign Selector */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-surface-50 tracking-tight">
              {stats.filteredCampaignName ? `📊 ${stats.filteredCampaignName}` : "📊 Analytics"}
            </h1>
            <p className="mt-1 text-sm text-surface-500">
              {stats.filteredCampaignName
                ? "Métricas filtradas para esta campanha."
                : "Inteligência consolidada de todas as campanhas."}
            </p>
          </div>
          <CampaignSelector
            campaigns={stats.allCampaigns}
            currentCampaignId={campaignId}
          />
        </div>

        {/* Hero KPIs */}
        <div className="grid gap-4 sm:gap-5 grid-cols-2 lg:grid-cols-3 stagger-children">
          {heroCards.map((card) => {
            const Icon = card.icon;
            const TrendIcon = card.trendIcon || card.icon;
            const trendColor = card.color;
            const trendBg = card.bg;
            const trendLabel = card.rateLabel;
            return (
              <div key={card.label} className="glass-card relative overflow-hidden group !p-5">
                <div className={`absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r ${card.gradient} opacity-40 group-hover:opacity-80 transition-opacity`} />
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2 rounded-xl bg-gradient-to-br ${card.gradient} shadow-lg`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${trendBg} ${trendColor}`}>
                    <TrendIcon className="h-3 w-3" />
                    {trendLabel}
                  </span>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-surface-500">{card.label}</p>
                <p className="mt-1 text-3xl font-black text-surface-50 tabular-nums tracking-tight">{card.value}</p>
                <p className="mt-1 text-[10px] text-surface-500">{card.sub}</p>
              </div>
            );
          })}
        </div>

        {/* Charts */}
        <DashboardCharts
          funnelData={stats.funnelData}
          trendData={stats.trendData}
          growthData={stats.growthData}
          campaignsPerformance={stats.campaignsPerformance}
        />

        {/* Bottom row: Provider Health + Queue Snapshot + Live Feed */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Provider Health */}
          <div className="glass-card !p-6">
            <h2 className="mb-5 text-[11px] font-bold uppercase tracking-[0.15em] text-surface-500 flex items-center gap-2">
              <Server className="h-3.5 w-3.5 text-primary-400" />
              Saúde dos Provedores
            </h2>
            <div className="space-y-4">
              {stats.providerHealth.map(p => {
                const barColor = p.usagePct > 80 ? '#ef4444' : p.usagePct > 50 ? '#f59e0b' : '#10b981';
                return (
                  <div key={p.provider} className="p-3 rounded-xl bg-surface-900/30 border border-surface-800/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${p.isActive ? 'bg-emerald-500 animate-dot-pulse' : 'bg-surface-600'}`} />
                        <span className="text-xs font-semibold text-surface-200">{p.provider}</span>
                        <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${p.isActive ? 'text-emerald-400 bg-emerald-500/10' : 'text-surface-600 bg-surface-800'}`}>
                          {p.isActive ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-surface-500 tabular-nums">
                        {p.sentToday}/{p.dailyLimit}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(p.usagePct, 100)}%`, backgroundColor: barColor, boxShadow: `0 0 6px ${barColor}30` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[9px] text-surface-600">Tier: {p.accountTier}</span>
                      <span className="text-[9px] font-mono text-surface-500">{p.usagePct}%</span>
                    </div>
                  </div>
                );
              })}
              {stats.providerHealth.length === 0 && (
                <p className="text-center py-8 text-xs text-surface-600 italic">Nenhum provedor configurado</p>
              )}
            </div>
          </div>

          {/* Queue Snapshot */}
          <div className="glass-card !p-6">
            <h2 className="mb-5 text-[11px] font-bold uppercase tracking-[0.15em] text-surface-500 flex items-center gap-2">
              <SendHorizonal className="h-3.5 w-3.5 text-cyan-400" />
              Fila de Envio
            </h2>
            <div className="space-y-3">
              {[
                { label: 'Na Fila', value: stats.queueSnapshot.queued, color: 'text-amber-400', dot: 'bg-amber-500' },
                { label: 'Enviando', value: stats.queueSnapshot.sending, color: 'text-blue-400', dot: 'bg-blue-500' },
                { label: 'Enviados', value: stats.queueSnapshot.sent, color: 'text-emerald-400', dot: 'bg-emerald-500' },
                { label: 'Falha', value: stats.queueSnapshot.failed, color: 'text-red-400', dot: 'bg-red-500' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between p-3 rounded-xl bg-surface-900/30 border border-surface-800/30">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${item.dot}`} />
                    <span className={`text-xs font-semibold ${item.color}`}>{item.label}</span>
                  </div>
                  <span className="text-lg font-black text-surface-200 tabular-nums">{item.value.toLocaleString('pt-BR')}</span>
                </div>
              ))}
              <Link href="/queue" className="block mt-2 text-center text-xs text-primary-400 hover:text-primary-300 transition-colors py-2 rounded-lg bg-primary-500/5 border border-primary-500/10 hover:border-primary-500/20">
                Ver fila completa →
              </Link>
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
              {stats.recentEvents.slice(0, 8).map((event: any) => (
                <div key={event.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface-900/30 border border-surface-800/30 hover:border-primary-500/20 transition-all duration-200 group">
                  <StatusBadge status={event.eventType} label={event.eventType} size="sm" dot />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-surface-200 group-hover:text-surface-50 transition-colors">
                      {event.contact?.email || '—'}
                    </p>
                    <p className="text-[10px] text-surface-500 flex items-center gap-1.5 mt-0.5">
                      <Clock className="h-3 w-3" />
                      {formatDate(event.timestamp)}
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
    console.error("[Dashboard] Error:", error);
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center glass-card">
        <div className="mb-6 p-4 rounded-2xl bg-red-500/10 text-red-400">
          <Activity className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-surface-50">Erro ao carregar Analytics</h2>
        <p className="mt-2 max-w-md text-surface-400 text-sm">
          Não conseguimos carregar estas informações agora.
        </p>
        <Link href="/" className="btn btn-primary mt-4 inline-flex text-sm">Tentar novamente</Link>
      </div>
    );
  }
}
