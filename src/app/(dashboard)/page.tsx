/**
 * Dashboard Home — Página principal com overview de métricas.
 * Renderização: SSR (dados em tempo real)
 */
export const dynamic = "force-dynamic";

import {
  Users,
  Mail,
  MousePointerClick,
  AlertTriangle,
  TrendingUp,
  Send,
  Eye,
  BarChart3,
} from "lucide-react";
import { prisma } from "@/shared/lib/prisma";
import { PROVIDER_LABELS, PROVIDER_COLORS } from "@/shared/lib/constants";
import { calcPercentage } from "@/shared/lib/utils";
import { StatusBadge } from "@/shared/components/status-badge";

/** Busca estatísticas do dashboard direto do banco */
async function getDashboardStats() {
  const [
    totalContacts,
    activeCampaigns,
    eventCounts,
    providerCounts,
    recentEvents,
  ] = await Promise.all([
    prisma.contact.count(),
    prisma.campaign.count({ where: { status: "ACTIVE" } }),
    prisma.emailEvent.groupBy({
      by: ["eventType"],
      _count: { _all: true },
    }),
    prisma.contact.groupBy({
      by: ["provider"],
      _count: { _all: true },
    }),
    prisma.emailEvent.findMany({
      take: 10,
      orderBy: { timestamp: "desc" },
      include: { contact: { select: { email: true, name: true } } },
    }),
  ]);

  const eventMap = new Map(
    eventCounts.map((e) => [e.eventType, e._count._all])
  );

  const totalSent = (eventMap.get("SENT") ?? 0) + (eventMap.get("DELIVERED") ?? 0);
  const totalDelivered = eventMap.get("DELIVERED") ?? 0;
  const totalOpened = eventMap.get("OPENED") ?? 0;
  const totalClicked = eventMap.get("CLICKED") ?? 0;
  const totalBounced =
    (eventMap.get("BOUNCED_SOFT") ?? 0) + (eventMap.get("BOUNCED_HARD") ?? 0);
  const totalComplaints = eventMap.get("COMPLAINED") ?? 0;

  return {
    totalContacts,
    activeCampaigns,
    totalSent,
    totalDelivered,
    totalOpened,
    totalClicked,
    totalBounced,
    totalComplaints,
    openRate: calcPercentage(totalOpened, totalDelivered),
    clickRate: calcPercentage(totalClicked, totalOpened),
    bounceRate: calcPercentage(totalBounced, totalSent),
    providerCounts: providerCounts.map((p) => ({
      provider: p.provider,
      count: p._count._all,
    })),
    recentEvents,
  };
}

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  const metricCards = [
    {
      label: "Contatos",
      value: stats.totalContacts.toLocaleString("pt-BR"),
      icon: Users,
      color: "from-indigo-500 to-indigo-700",
      shadowColor: "shadow-indigo-500/20",
    },
    {
      label: "Campanhas Ativas",
      value: stats.activeCampaigns.toLocaleString("pt-BR"),
      icon: Mail,
      color: "from-cyan-500 to-cyan-700",
      shadowColor: "shadow-cyan-500/20",
    },
    {
      label: "Emails Enviados",
      value: stats.totalSent.toLocaleString("pt-BR"),
      icon: Send,
      color: "from-violet-500 to-violet-700",
      shadowColor: "shadow-violet-500/20",
    },
    {
      label: "Taxa de Abertura",
      value: `${stats.openRate}%`,
      icon: Eye,
      color: "from-emerald-500 to-emerald-700",
      shadowColor: "shadow-emerald-500/20",
    },
  ];

  const detailCards = [
    {
      label: "Entregues",
      value: stats.totalDelivered,
      icon: TrendingUp,
      color: "text-emerald-400",
    },
    {
      label: "Abertos",
      value: stats.totalOpened,
      icon: Eye,
      color: "text-violet-400",
    },
    {
      label: "Cliques",
      value: stats.totalClicked,
      icon: MousePointerClick,
      color: "text-cyan-400",
    },
    {
      label: "Bounces",
      value: stats.totalBounced,
      icon: AlertTriangle,
      color: "text-amber-400",
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-surface-50">
          Visão Geral
        </h1>
        <p className="mt-1 text-sm text-surface-500">
          Acompanhe o desempenho das suas campanhas de email marketing em tempo real.
        </p>
      </div>

      {/* Main Metric Cards */}
      <div className="dashboard-grid">
        {metricCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="glass-card p-5"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-surface-500">
                    {card.label}
                  </p>
                  <p className="mt-2 text-3xl font-bold text-surface-50">
                    {card.value}
                  </p>
                </div>
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${card.color} shadow-lg ${card.shadowColor}`}
                >
                  <Icon className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Cards + Provider Distribution */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Detail Stats */}
        <div className="glass-card p-6 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-surface-400">
            <BarChart3 className="mr-2 inline h-4 w-4" />
            Métricas Detalhadas
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {detailCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="rounded-lg border border-surface-800/50 bg-surface-900/50 p-4 text-center transition-colors hover:border-surface-700/50"
                >
                  <Icon className={`mx-auto h-5 w-5 ${card.color}`} />
                  <p className="mt-2 text-2xl font-bold text-surface-100">
                    {card.value.toLocaleString("pt-BR")}
                  </p>
                  <p className="mt-1 text-xs text-surface-500">{card.label}</p>
                </div>
              );
            })}
          </div>

          {/* Rate bars */}
          <div className="mt-6 space-y-3">
            {[
              { label: "Taxa de Abertura", value: stats.openRate, color: "bg-violet-500" },
              { label: "Taxa de Cliques", value: stats.clickRate, color: "bg-cyan-500" },
              { label: "Taxa de Bounce", value: stats.bounceRate, color: "bg-amber-500" },
            ].map((rate) => (
              <div key={rate.label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-surface-400">{rate.label}</span>
                  <span className="font-semibold text-surface-200">{rate.value}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-800">
                  <div
                    className={`h-full rounded-full ${rate.color} transition-all duration-1000`}
                    style={{ width: `${Math.min(rate.value, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Provider Distribution */}
        <div className="glass-card p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-surface-400">
            Distribuição por Provedor
          </h2>
          <div className="space-y-3">
            {stats.providerCounts.length === 0 ? (
              <p className="text-sm text-surface-500">
                Nenhum contato cadastrado ainda.
              </p>
            ) : (
              stats.providerCounts.map((p) => {
                const percentage = calcPercentage(p.count, stats.totalContacts);
                const providerColor =
                  PROVIDER_COLORS[p.provider as keyof typeof PROVIDER_COLORS] ??
                  "#6b7280";
                return (
                  <div key={p.provider}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: providerColor }}
                        />
                        <span className="font-medium text-surface-300">
                          {PROVIDER_LABELS[p.provider as keyof typeof PROVIDER_LABELS]}
                        </span>
                      </div>
                      <span className="text-surface-500">
                        {p.count} ({percentage}%)
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-800">
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: providerColor,
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Recent Events */}
      <div className="glass-card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-surface-400">
          Últimos Eventos
        </h2>
        {stats.recentEvents.length === 0 ? (
          <div className="py-12 text-center">
            <Mail className="mx-auto h-10 w-10 text-surface-700" />
            <p className="mt-3 text-sm text-surface-500">
              Nenhum evento registrado ainda. Envie sua primeira campanha!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {stats.recentEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-3 rounded-lg border border-surface-800/50 bg-surface-900/30 px-4 py-3 transition-colors hover:border-surface-700/50"
              >
                <StatusBadge status={event.eventType} label={event.eventType} size="sm" dot />
                <span className="flex-1 text-sm text-surface-300">
                  {event.contact.email}
                </span>
                <span className="text-xs text-surface-600">
                  {new Date(event.timestamp).toLocaleString("pt-BR")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
