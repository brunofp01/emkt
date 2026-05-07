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
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ funnelData, trendData }) => {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Funil de Conversão */}
      <div className="glass-card p-6 min-h-[400px]">
        <h2 className="mb-6 text-sm font-semibold uppercase tracking-wider text-surface-400">
          Funil de Conversão (Performance)
        </h2>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <FunnelChart>
              <Tooltip 
                contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #262626', borderRadius: '8px' }}
                itemStyle={{ color: '#e5e5e5' }}
              />
              <Funnel
                data={funnelData}
                dataKey="value"
              >
                <LabelList position="right" fill="#a3a3a3" stroke="none" dataKey="name" />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tendência de Engajamento */}
      <div className="glass-card p-6 min-h-[400px]">
        <h2 className="mb-6 text-sm font-semibold uppercase tracking-wider text-surface-400">
          Tendência de Engajamento (7 Dias)
        </h2>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
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
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#737373', fontSize: 12 }} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#737373', fontSize: 12 }} 
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #262626', borderRadius: '8px' }}
              />
              <Area 
                type="monotone" 
                dataKey="sent" 
                stroke="#3b82f6" 
                fillOpacity={1} 
                fill="url(#colorSent)" 
                strokeWidth={3}
              />
              <Area 
                type="monotone" 
                dataKey="opened" 
                stroke="#10b981" 
                fillOpacity={1} 
                fill="url(#colorOpened)" 
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
