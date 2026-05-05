/**
 * Dashboard Home — Página principal com overview de métricas.
 * Renderização: SSR (dados em tempo real)
 */
export const dynamic = "force-dynamic";

import {
  Users,
  Mail,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { prisma } from "@/shared/lib/prisma";
import { getDashboardStats } from "@/features/analytics/lib/queries";
import { cn, formatDate, calcPercentage } from "@/shared/lib/utils";
import { PROVIDER_LABELS, PROVIDER_COLORS } from "@/shared/lib/constants";
import { StatusBadge } from "@/shared/components/status-badge";

export default async function DashboardPage() {
  try {
    const stats = await getDashboardStats();

    const metricCards = [
      {
        label: "Total de Contatos",
        value: stats.totalContacts.toLocaleString("pt-BR"),
        icon: Users,
        color: "from-blue-500 to-indigo-600",
        shadowColor: "shadow-blue-500/20",
      },
      {
        label: "Emails Enviados",
        value: stats.totalSent.toLocaleString("pt-BR"),
        icon: Mail,
        color: "from-cyan-500 to-blue-600",
        shadowColor: "shadow-cyan-500/20",
      },
      {
        label: "Aberturas Reais",
        value: stats.totalOpened.toLocaleString("pt-BR"),
        icon: TrendingUp,
        color: "from-emerald-500 to-teal-600",
        shadowColor: "shadow-emerald-500/20",
      },
      {
        label: "Taxa de Abertura",
        value: `${stats.openRate}%`,
        icon: BarChart3,
        color: "from-violet-500 to-purple-600",
        shadowColor: "shadow-violet-500/20",
      },
    ] as const;

    const detailCards = [
      { label: "Entregues", value: stats.totalSent, icon: Mail, color: "text-blue-400" },
      { label: "Abertos", value: stats.totalOpened, icon: TrendingUp, color: "text-emerald-400" },
      { label: "Cliques", value: stats.totalClicked, icon: BarChart3, color: "text-cyan-400" },
      { label: "Bounces", value: stats.totalBounced, icon: Mail, color: "text-amber-400" },
    ] as const;

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
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm font-medium text-surface-200">
                      {event.contact.email}
                    </p>
                    <p className="text-[10px] text-surface-500">
                      {formatDate(event.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  } catch (error: any) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-red-500/10 text-red-500 shadow-xl shadow-red-500/10">
          <Mail className="h-10 w-10" />
        </div>
        <h2 className="text-xl font-bold text-surface-50">Erro de Conexão</h2>
        <p className="mt-2 max-w-md text-surface-400">
          Não conseguimos conectar ao banco de dados. Verifique se as credenciais na Vercel estão corretas.
        </p>
        <div className="mt-8 w-full max-w-2xl overflow-hidden rounded-xl border border-surface-800 bg-surface-950 p-4 text-left font-mono text-xs text-red-400">
          <p className="mb-2 font-bold text-red-500">Detalhes do erro:</p>
          <pre className="whitespace-pre-wrap">{error.message || String(error)}</pre>
        </div>
      </div>
    );
  }
}
