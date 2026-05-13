'use client';

import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Cell,
} from 'recharts';
import { BarChart3, Activity, Users, TrendingUp } from 'lucide-react';

interface FunnelItem { name: string; value: number; fill: string; pct: string }
interface TrendItem { date: string; sent: number; opened: number; clicked: number; bounced: number }
interface GrowthItem { date: string; count: number }
interface CampaignPerf {
  id: string; name: string; status: string;
  total: number; sent: number; delivered: number; opened: number; clicked: number; bounced: number;
  openRate: number; ctorRate: number; bounceRate: number;
}

interface DashboardChartsProps {
  funnelData: FunnelItem[];
  trendData: TrendItem[];
  growthData: GrowthItem[];
  campaignsPerformance: CampaignPerf[];
}

const tooltipStyle = {
  backgroundColor: 'rgba(15, 23, 42, 0.95)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(148, 163, 184, 0.1)',
  borderRadius: '12px',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
  padding: '8px 12px',
};
const tooltipItemStyle = { color: '#e2e8f0', fontSize: '11px', fontWeight: 500 };
const axisTickStyle = { fill: '#475569', fontSize: 10, fontWeight: 600 };

function rateColor(rate: number, good: number, warn: number): string {
  if (rate >= good) return 'text-emerald-400';
  if (rate >= warn) return 'text-amber-400';
  return 'text-red-400';
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ funnelData, trendData, growthData, campaignsPerformance }) => {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Funil de Conversão — Horizontal Bar */}
        <div className="glass-card !p-6 min-h-[380px]">
          <h2 className="mb-5 text-[11px] font-bold uppercase tracking-[0.15em] text-surface-500 flex items-center gap-2">
            <BarChart3 className="h-3.5 w-3.5 text-primary-400" />
            Funil de Conversão
          </h2>
          <div className="space-y-4">
            {funnelData.map((item, i) => {
              const maxVal = funnelData[0]?.value || 1;
              const widthPct = maxVal > 0 ? Math.max((item.value / maxVal) * 100, 2) : 2;
              return (
                <div key={item.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-surface-300">{item.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-surface-400 tabular-nums">{item.value.toLocaleString('pt-BR')}</span>
                      {i > 0 && <span className="text-[10px] font-bold text-surface-500">({item.pct})</span>}
                    </div>
                  </div>
                  <div className="h-3 w-full bg-surface-900 rounded-full overflow-hidden border border-surface-800/30">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: item.fill,
                        boxShadow: `0 0 12px ${item.fill}40`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tendência de Engajamento — 14 dias */}
        <div className="glass-card !p-6 min-h-[380px]">
          <h2 className="mb-5 text-[11px] font-bold uppercase tracking-[0.15em] text-surface-500 flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-emerald-400" />
            Engajamento (14 Dias)
          </h2>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="gSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gOpened" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gClicked" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={axisTickStyle} />
                <YAxis axisLine={false} tickLine={false} tick={axisTickStyle} width={30} />
                <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} />
                <Area type="monotone" dataKey="sent" name="Enviados" stroke="#3b82f6" fillOpacity={1} fill="url(#gSent)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="opened" name="Abertos" stroke="#10b981" fillOpacity={1} fill="url(#gOpened)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="clicked" name="Clicados" stroke="#8b5cf6" fillOpacity={1} fill="url(#gClicked)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Performance por Campanha — Tabela profissional */}
      <div className="glass-card !p-6">
        <h2 className="mb-5 text-[11px] font-bold uppercase tracking-[0.15em] text-surface-500 flex items-center gap-2">
          <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
          Performance por Campanha
        </h2>
        {campaignsPerformance.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-surface-800/40 text-[10px] font-bold uppercase tracking-[0.15em] text-surface-600">
                  <th className="py-3 px-3">Campanha</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-right">Enviados</th>
                  <th className="py-3 px-3 text-right">Entregues</th>
                  <th className="py-3 px-3 text-right">Abertos</th>
                  <th className="py-3 px-3 text-right">Clicados</th>
                  <th className="py-3 px-3 text-right">Open Rate</th>
                  <th className="py-3 px-3 text-right">CTOR</th>
                  <th className="py-3 px-3 text-right">Bounce</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800/20">
                {campaignsPerformance.map(c => (
                  <tr key={c.id} className="hover:bg-surface-800/15 transition-colors">
                    <td className="py-2.5 px-3">
                      <a href={`/campaigns/${c.id}`} className="text-xs font-semibold text-primary-400 hover:text-primary-300 transition-colors">
                        {c.name}
                      </a>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${c.status === 'ACTIVE' ? 'text-emerald-400 bg-emerald-500/10' : c.status === 'PAUSED' ? 'text-amber-400 bg-amber-500/10' : 'text-surface-500 bg-surface-800'}`}>
                        {c.status === 'ACTIVE' ? 'Ativa' : c.status === 'PAUSED' ? 'Pausada' : c.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-xs text-surface-300 tabular-nums">{c.sent.toLocaleString('pt-BR')}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-xs text-surface-300 tabular-nums">{c.delivered.toLocaleString('pt-BR')}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-xs text-surface-300 tabular-nums">{c.opened.toLocaleString('pt-BR')}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-xs text-surface-300 tabular-nums">{c.clicked.toLocaleString('pt-BR')}</td>
                    <td className={`py-2.5 px-3 text-right font-mono text-xs font-bold tabular-nums ${rateColor(c.openRate, 20, 10)}`}>{c.openRate}%</td>
                    <td className={`py-2.5 px-3 text-right font-mono text-xs font-bold tabular-nums ${rateColor(c.ctorRate, 10, 3)}`}>{c.ctorRate}%</td>
                    <td className={`py-2.5 px-3 text-right font-mono text-xs font-bold tabular-nums ${c.bounceRate > 5 ? 'text-red-400' : c.bounceRate > 2 ? 'text-amber-400' : 'text-emerald-400'}`}>{c.bounceRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center">
            <p className="text-xs text-surface-600">Sem dados de campanha</p>
          </div>
        )}
      </div>

      {/* Crescimento de Audiência */}
      <div className="glass-card !p-6">
        <h2 className="mb-5 text-[11px] font-bold uppercase tracking-[0.15em] text-surface-500 flex items-center gap-2">
          <Users className="h-3.5 w-3.5 text-indigo-400" />
          Crescimento da Audiência (7 Dias)
        </h2>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <BarChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={axisTickStyle} />
              <YAxis axisLine={false} tickLine={false} tick={axisTickStyle} width={30} />
              <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} />
              <Bar dataKey="count" name="Novos contatos" radius={[6, 6, 0, 0]} barSize={24}>
                {growthData.map((_, i) => (
                  <Cell key={i} fill={i === growthData.length - 1 ? '#6366f1' : '#4f46e5'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
