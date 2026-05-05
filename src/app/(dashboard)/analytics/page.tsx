import { getDashboardStats } from "@/features/analytics/lib/queries";
import { PROVIDER_LABELS, PROVIDER_COLORS, EVENT_TYPE_LABELS, EVENT_TYPE_COLORS } from "@/shared/lib/constants";
import { calcPercentage } from "@/shared/lib/utils";
import { BarChart3, TrendingUp, Users, Mail } from "lucide-react";

export default async function AnalyticsPage() {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-surface-50">Analytics Global</h1>
        <p className="mt-1 text-sm text-surface-500">Métricas consolidadas de todas as campanhas e provedores.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="glass-card p-6 border-l-4 border-indigo-500">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-surface-400">Total de Contatos</h3>
            <Users className="h-5 w-5 text-indigo-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-surface-50">{stats.totalContacts}</p>
        </div>
        <div className="glass-card p-6 border-l-4 border-cyan-500">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-surface-400">Campanhas Ativas</h3>
            <Mail className="h-5 w-5 text-cyan-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-surface-50">{stats.activeCampaigns}</p>
        </div>
        <div className="glass-card p-6 border-l-4 border-emerald-500">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-surface-400">Total de Emails Enviados</h3>
            <TrendingUp className="h-5 w-5 text-emerald-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-surface-50">{stats.totalSent}</p>
        </div>
        <div className="glass-card p-6 border-l-4 border-violet-500">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-surface-400">Aberturas Globais</h3>
            <BarChart3 className="h-5 w-5 text-violet-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-surface-50">{stats.totalOpened}</p>
          <p className="mt-1 text-xs text-surface-500">{stats.openRate}% de taxa de abertura</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-surface-400">Distribuição por Provedor</h2>
          <div className="space-y-4">
            {stats.providerCounts.map((p) => {
              const percentage = calcPercentage(p.count, stats.totalContacts);
              const providerColor = PROVIDER_COLORS[p.provider as keyof typeof PROVIDER_COLORS] ?? "#6b7280";
              return (
                <div key={p.provider}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-surface-300">
                      {PROVIDER_LABELS[p.provider as keyof typeof PROVIDER_LABELS] ?? p.provider}
                    </span>
                    <span className="text-surface-400">{p.count} ({percentage}%)</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-800">
                    <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: providerColor }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass-card p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-surface-400">Distribuição de Eventos</h2>
          <div className="space-y-4">
             {Object.entries(stats.eventMap).sort(([, a], [, b]) => b - a).map(([event, count]) => {
                const percentage = calcPercentage(count, stats.totalEvents);
                const color = EVENT_TYPE_COLORS[event as keyof typeof EVENT_TYPE_COLORS] ?? "#6b7280";
                return (
                  <div key={event}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-surface-300">
                        {EVENT_TYPE_LABELS[event as keyof typeof EVENT_TYPE_LABELS] ?? event}
                      </span>
                      <span className="text-surface-400">{count} ({percentage}%)</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-800">
                      <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
             })}
          </div>
        </div>
      </div>
    </div>
  );
}
