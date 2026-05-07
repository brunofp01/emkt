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
  Cell,
} from 'recharts';

interface DashboardChartsProps {
  funnelData: any[];
  trendData: any[];
  growthData: any[];
  campaignPerformance: any[];
}


export const DashboardCharts: React.FC<DashboardChartsProps> = ({ funnelData, trendData, growthData, campaignPerformance }) => {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Funil de Performance */}
        <div className="glass-card p-6 min-h-[400px]">
          <h2 className="mb-6 text-sm font-semibold uppercase tracking-wider text-surface-400 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary-500" />
            Funil de Performance (Conversão)
          </h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <FunnelChart>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #262626', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  itemStyle={{ color: '#e5e5e5', fontSize: '12px' }}
                />
                <Funnel data={funnelData} dataKey="value">
                  <LabelList position="right" fill="#737373" stroke="none" dataKey="name" fontSize={10} fontWeight="bold" />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tendência de Engajamento */}
        <div className="glass-card p-6 min-h-[400px]">
          <h2 className="mb-6 text-sm font-semibold uppercase tracking-wider text-surface-400 flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-500" />
            Engajamento Temporal (7 Dias)
          </h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOpened" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#171717" vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#525252', fontSize: 10, fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#525252', fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #262626', borderRadius: '12px' }} />
                <Area type="monotone" dataKey="sent" stroke="#3b82f6" fillOpacity={1} fill="url(#colorSent)" strokeWidth={3} />
                <Area type="monotone" dataKey="opened" stroke="#10b981" fillOpacity={1} fill="url(#colorOpened)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Crescimento da Audiência */}
        <div className="glass-card p-6 min-h-[350px]">
          <h2 className="mb-6 text-sm font-semibold uppercase tracking-wider text-surface-400 flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-500" />
            Crescimento da Audiência (Net New)
          </h2>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#171717" vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#525252', fontSize: 10, fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#525252', fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #262626', borderRadius: '12px' }} />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Benchmarking de Campanhas */}
        <div className="glass-card p-6 min-h-[350px]">
          <h2 className="mb-6 text-sm font-semibold uppercase tracking-wider text-surface-400 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-amber-500" />
            Top Performance por Campanha
          </h2>
          <div className="space-y-4 overflow-y-auto max-h-[250px] pr-2 custom-scrollbar">
            {campaignPerformance.map((c, i) => (
              <div key={c.id || i} className="p-3 rounded-xl bg-surface-900/30 border border-surface-800/50 hover:bg-surface-800/40 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-surface-200 truncate max-w-[200px]">{c.name}</span>
                  <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded uppercase tracking-tighter">
                    {c.openRate}% Open
                  </span>
                </div>
                <div className="flex items-center gap-2">
                   <div className="h-1.5 flex-1 bg-surface-800 rounded-full overflow-hidden">
                      <div className="h-full bg-primary-500 rounded-full" style={{ width: `${c.openRate}%` }} />
                   </div>
                   <span className="text-[10px] font-mono text-surface-500">{c.clickRate}% Click</span>
                </div>
              </div>
            ))}
            {campaignPerformance.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 opacity-30">
                 <p className="text-xs uppercase tracking-widest">Sem dados de campanha</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

import { BarChart3, Activity, Users, TrendingUp } from 'lucide-react';
