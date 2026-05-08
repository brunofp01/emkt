'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  FunnelChart,
  Funnel,
  LabelList,
} from 'recharts';
import { BarChart3, Activity, Users, TrendingUp } from 'lucide-react';

interface DashboardChartsProps {
  funnelData: any[];
  trendData: any[];
  growthData: any[];
  campaignPerformance: any[];
}

const tooltipStyle = {
  backgroundColor: 'rgba(15, 23, 42, 0.95)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(148, 163, 184, 0.1)',
  borderRadius: '12px',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
  padding: '8px 12px',
};

const tooltipItemStyle = {
  color: '#e2e8f0',
  fontSize: '11px',
  fontWeight: 500,
};

const axisTickStyle = {
  fill: '#475569',
  fontSize: 10,
  fontWeight: 600,
};

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ funnelData, trendData, growthData, campaignPerformance }) => {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Funil de Performance */}
        <div className="glass-card !p-6 min-h-[380px]">
          <h2 className="mb-5 text-[11px] font-bold uppercase tracking-[0.15em] text-surface-500 flex items-center gap-2">
            <BarChart3 className="h-3.5 w-3.5 text-primary-400" />
            Funil de Conversão
          </h2>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <FunnelChart>
                <Tooltip 
                  contentStyle={tooltipStyle}
                  itemStyle={tooltipItemStyle}
                />
                <Funnel data={funnelData} dataKey="value">
                  <LabelList position="right" fill="#64748b" stroke="none" dataKey="name" fontSize={10} fontWeight="600" />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tendência de Engajamento */}
        <div className="glass-card !p-6 min-h-[380px]">
          <h2 className="mb-5 text-[11px] font-bold uppercase tracking-[0.15em] text-surface-500 flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-emerald-400" />
            Engajamento (7 Dias)
          </h2>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOpened" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={axisTickStyle} />
                <YAxis axisLine={false} tickLine={false} tick={axisTickStyle} width={30} />
                <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} />
                <Area type="monotone" dataKey="sent" stroke="#6366f1" fillOpacity={1} fill="url(#colorSent)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="opened" stroke="#10b981" fillOpacity={1} fill="url(#colorOpened)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Crescimento da Audiência */}
        <div className="glass-card !p-6 min-h-[340px]">
          <h2 className="mb-5 text-[11px] font-bold uppercase tracking-[0.15em] text-surface-500 flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-indigo-400" />
            Crescimento (Net New)
          </h2>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={axisTickStyle} />
                <YAxis axisLine={false} tickLine={false} tick={axisTickStyle} width={30} />
                <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} />
                <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Performance por Campanha */}
        <div className="glass-card !p-6 min-h-[340px]">
          <h2 className="mb-5 text-[11px] font-bold uppercase tracking-[0.15em] text-surface-500 flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
            Performance por Campanha
          </h2>
          <div className="space-y-3 overflow-y-auto max-h-[240px] pr-1 custom-scrollbar">
            {campaignPerformance.map((c, i) => (
              <div key={c.id || i} className="p-3 rounded-xl bg-surface-900/30 border border-surface-800/30 hover:border-surface-700/50 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-surface-200 truncate max-w-[200px]">{c.name}</span>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    {c.openRate}% open
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1 flex-1 bg-surface-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all duration-700" style={{ width: `${c.openRate}%` }} />
                  </div>
                  <span className="text-[10px] font-mono text-surface-500 tabular-nums">{c.clickRate}% click</span>
                </div>
              </div>
            ))}
            {campaignPerformance.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 opacity-40">
                <p className="text-xs text-surface-500">Sem dados de campanha</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
