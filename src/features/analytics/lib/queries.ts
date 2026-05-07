import { supabase } from "@/shared/lib/supabase";

/**
 * Dashboard Statistics Query - Refatorado para o Advanced Analytics (Fase 5).
 */
export async function getDashboardStats() {
  // 1. Coleta de dados via HTTPS/REST (Padrão Ouro de Estabilidade)
  const [
    { count: totalContacts },
    { count: activeCampaigns },
    { data: events },
    { data: providers },
    { data: recentEventsData },
    { data: campaignsPerformance }
  ] = await Promise.all([
    supabase.from('Contact').select('*', { count: 'exact', head: true }),
    supabase.from('Campaign').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
    supabase.from('EmailEvent').select('eventType, timestamp'),
    supabase.from('Contact').select('provider'),
    supabase.from('EmailEvent').select('*, contact:Contact(*)').order('timestamp', { ascending: false }).limit(10),
    supabase.from('Campaign').select('id, name, status')
  ]);

  // 2. Processamento de Eventos (Funil e Tendências)
  const eventMap: Record<string, number> = {};
  const timelineMap: Record<string, any> = {};
  
  if (events) {
    events.forEach(e => {
      eventMap[e.eventType] = (eventMap[e.eventType] || 0) + 1;
      
      // Agrupamento por data para o gráfico de tendência (últimos 7 dias)
      const date = new Date(e.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (!timelineMap[date]) {
        timelineMap[date] = { date, sent: 0, opened: 0, clicked: 0 };
      }
      if (e.eventType === 'SENT' || e.eventType === 'DELIVERED') timelineMap[date].sent++;
      if (e.eventType === 'OPENED') timelineMap[date].opened++;
      if (e.eventType === 'CLICKED') timelineMap[date].clicked++;
    });
  }

  // 3. Processamento de Provedores
  const providerMap: Record<string, number> = {};
  if (providers) {
    providers.forEach(p => {
      providerMap[p.provider] = (providerMap[p.provider] || 0) + 1;
    });
  }

  const totalSent = (eventMap["SENT"] ?? 0) + (eventMap["DELIVERED"] ?? 0);
  const totalDelivered = eventMap["DELIVERED"] ?? 0;
  const totalOpened = eventMap["OPENED"] ?? 0;
  const totalClicked = eventMap["CLICKED"] ?? 0;
  const totalBounced = (eventMap["BOUNCED_SOFT"] ?? 0) + (eventMap["BOUNCED_HARD"] ?? 0);

  // 4. Estruturação dos Dados para os Gráficos
  const funnelData = [
    { name: 'Enviados', value: totalSent, fill: '#3b82f6' },
    { name: 'Entregues', value: totalDelivered, fill: '#10b981' },
    { name: 'Abertos', value: totalOpened, fill: '#f59e0b' },
    { name: 'Clicados', value: totalClicked, fill: '#8b5cf6' },
  ];

  const trendData = Object.values(timelineMap).sort((a, b) => {
    const [da, ma] = a.date.split('/');
    const [db, mb] = b.date.split('/');
    return new Date(2026, parseInt(ma)-1, parseInt(da)).getTime() - new Date(2026, parseInt(mb)-1, parseInt(db)).getTime();
  }).slice(-7);

  return {
    totalContacts: totalContacts || 0,
    activeCampaigns: activeCampaigns || 0,
    totalSent,
    totalDelivered,
    totalOpened,
    totalClicked,
    totalBounced,
    openRate: calcPercentage(totalOpened, totalDelivered),
    clickRate: calcPercentage(totalClicked, totalOpened),
    bounceRate: calcPercentage(totalBounced, totalSent),
    funnelData,
    trendData,
    providerCounts: Object.entries(providerMap).map(([provider, count]) => ({
      provider,
      count,
    })),
    recentEvents: (recentEventsData || []).map((event: any) => ({
      ...event,
      contact: event.contact
    })),
    campaignsPerformance: campaignsPerformance || []
  };
}

function calcPercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 1000) / 10;
}
