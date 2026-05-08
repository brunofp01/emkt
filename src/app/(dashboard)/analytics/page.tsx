export const dynamic = "force-dynamic";

import { getDashboardStats } from "@/features/analytics/lib/queries";
import { calcPercentage } from "@/shared/lib/utils";
import { BarChart3, TrendingUp, Users, Mail, PieChart, Info } from "lucide-react";
import { DashboardCharts } from "@/features/analytics/components/dashboard-charts";

export default async function AnalyticsPage() {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-surface-50 tracking-tight">Analytics Global</h1>
          <p className="mt-1 text-xs sm:text-sm text-surface-500">Inteligência consolidada e análise de performance profunda.</p>
        </div>
        <div className="hidden sm:flex p-2 rounded-lg bg-surface-900 border border-surface-800">
          <PieChart className="h-6 w-6 text-primary-500" />
        </div>
      </div>

      {/* Grid de KPIs Secundários */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Base de Contatos", value: stats.totalContacts, icon: Users, color: "text-indigo-400" },
          { label: "Cliques Totais", value: stats.totalClicked, icon: TrendingUp, color: "text-cyan-400" },
          { label: "Bounces (Erros)", value: stats.totalBounced, icon: Info, color: "text-amber-400" },
          { label: "CTR (Click Rate)", value: `${stats.clickRate}%`, icon: BarChart3, color: "text-violet-400" },
        ].map((kpi) => (
          <div key={kpi.label} className="glass-card p-6">
            <div className="flex items-center gap-3 mb-2">
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              <h3 className="text-xs font-bold uppercase tracking-widest text-surface-500">{kpi.label}</h3>
            </div>
            <p className="text-3xl font-black text-surface-50">{kpi.value.toLocaleString('pt-BR')}</p>
          </div>
        ))}
      </div>

      {/* Visualizações de Gráficos (Reutilizando componentes premium) */}
      <DashboardCharts 
        funnelData={stats.funnelData} 
        trendData={stats.trendData} 
        growthData={stats.growthData}
        campaignPerformance={stats.campaignsPerformance}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Distribuição por Provedor */}
        <div className="glass-card p-6">
          <h2 className="mb-6 text-sm font-bold uppercase tracking-widest text-surface-400">Eficiência por Provedor</h2>
          <div className="space-y-5">
            {stats.providerCounts.map((p) => {
              const percentage = calcPercentage(p.count, stats.totalContacts);
              const providerColor = "#3b82f6";
              return (
                <div key={p.provider} className="group">
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="font-bold text-surface-300">
                      {p.provider}
                    </span>
                    <span className="text-surface-500 font-mono">{p.count} ({percentage}%)</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-900 border border-surface-800/50">
                    <div 
                      className="h-full rounded-full transition-all duration-1000" 
                      style={{ 
                        width: `${percentage}%`, 
                        backgroundColor: providerColor,
                        boxShadow: `0 0 8px ${providerColor}30`
                      }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Campanhas e Status */}
        <div className="glass-card p-6">
          <h2 className="mb-6 text-sm font-bold uppercase tracking-widest text-surface-400">Campanhas em Monitoramento</h2>
          <div className="space-y-3">
            {stats.campaignsPerformance.map((campaign) => (
              <div key={campaign.id} className="flex items-center justify-between p-4 rounded-xl bg-surface-900/30 border border-surface-800/50">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${campaign.status === 'ACTIVE' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-surface-600'}`} />
                  <span className="text-sm font-bold text-surface-200">{campaign.name}</span>
                </div>
                <span className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">{campaign.status}</span>
              </div>
            ))}
            {stats.campaignsPerformance.length === 0 && (
              <p className="text-center py-10 text-xs text-surface-600 uppercase tracking-widest italic">Nenhuma campanha encontrada</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
