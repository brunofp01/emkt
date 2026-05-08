export const dynamic = "force-dynamic";

import { getDashboardStats } from "@/features/analytics/lib/queries";
import { calcPercentage } from "@/shared/lib/utils";
import { BarChart3, TrendingUp, Users, Mail, PieChart, Info } from "lucide-react";
import { DashboardCharts } from "@/features/analytics/components/dashboard-charts";

export default async function AnalyticsPage() {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-surface-50 tracking-tight">Analytics Global</h1>
        <p className="mt-1 text-sm text-surface-500">Inteligência consolidada e análise de performance.</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
        {[
          { label: "Base de Contatos", value: stats.totalContacts, icon: Users, gradient: "from-indigo-500 to-violet-600" },
          { label: "Cliques Totais", value: stats.totalClicked, icon: TrendingUp, gradient: "from-cyan-500 to-blue-600" },
          { label: "Bounces", value: stats.totalBounced, icon: Info, gradient: "from-amber-500 to-orange-600" },
          { label: "CTR", value: `${stats.clickRate}%`, icon: BarChart3, gradient: "from-violet-500 to-purple-600" },
        ].map((kpi) => (
          <div key={kpi.label} className="glass-card !p-5 relative overflow-hidden group">
            <div className={`absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r ${kpi.gradient} opacity-40 group-hover:opacity-80 transition-opacity`} />
            <div className="flex items-center gap-2.5 mb-3">
              <div className={`p-1.5 rounded-lg bg-gradient-to-br ${kpi.gradient}`}>
                <kpi.icon className="h-3.5 w-3.5 text-white" />
              </div>
              <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-surface-500">{kpi.label}</h3>
            </div>
            <p className="text-3xl font-black text-surface-50 tabular-nums tracking-tight">{typeof kpi.value === 'number' ? kpi.value.toLocaleString('pt-BR') : kpi.value}</p>
          </div>
        ))}
      </div>

      <DashboardCharts 
        funnelData={stats.funnelData} 
        trendData={stats.trendData} 
        growthData={stats.growthData}
        campaignPerformance={stats.campaignsPerformance}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Provider efficiency */}
        <div className="glass-card !p-6">
          <h2 className="mb-5 text-[11px] font-bold uppercase tracking-[0.15em] text-surface-500">Eficiência por Provedor</h2>
          <div className="space-y-4">
            {stats.providerCounts.map((p, i) => {
              const percentage = calcPercentage(p.count, stats.totalContacts);
              const colors = ["#6366f1", "#06b6d4", "#8b5cf6", "#10b981", "#f59e0b"];
              const color = colors[i % colors.length];
              return (
                <div key={p.provider}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-semibold text-surface-300">{p.provider}</span>
                    <span className="text-surface-500 font-mono tabular-nums text-[10px]">{p.count} ({percentage}%)</span>
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-surface-900 border border-surface-800/30">
                    <div 
                      className="h-full rounded-full transition-all duration-700" 
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
          </div>
        </div>

        {/* Campaign monitoring */}
        <div className="glass-card !p-6">
          <h2 className="mb-5 text-[11px] font-bold uppercase tracking-[0.15em] text-surface-500">Campanhas em Monitoramento</h2>
          <div className="space-y-2">
            {stats.campaignsPerformance.map((campaign) => (
              <div key={campaign.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-900/30 border border-surface-800/30">
                <div className="flex items-center gap-2.5">
                  <div className={`h-2 w-2 rounded-full ${campaign.status === 'ACTIVE' ? 'bg-emerald-500 animate-dot-pulse' : 'bg-surface-600'}`} />
                  <span className="text-xs font-semibold text-surface-200">{campaign.name}</span>
                </div>
                <span className="text-[10px] font-semibold text-surface-500 uppercase tracking-widest">{campaign.status}</span>
              </div>
            ))}
            {stats.campaignsPerformance.length === 0 && (
              <p className="text-center py-10 text-xs text-surface-600 italic">Nenhuma campanha</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
