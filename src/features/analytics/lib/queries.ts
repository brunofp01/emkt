import { supabase } from "@/shared/lib/supabase";
import { supabaseAdmin } from "@/shared/lib/supabase";

/**
 * Dashboard Statistics Query - Usa CampaignContact.stepStatus como fonte primária
 * para o funil (não depende de webhooks).
 */
export async function getDashboardStats() {
  // 1. Coleta de dados em paralelo
  const [
    { count: totalContacts },
    { count: activeCampaigns },
    { data: events },
    { data: providers },
    { data: recentEventsData },
    { data: campaignsData },
    { data: campaignContacts }
  ] = await Promise.all([
    supabase.from('Contact').select('*', { count: 'exact', head: true }),
    supabase.from('Campaign').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
    supabase.from('EmailEvent').select('eventType, timestamp'),
    supabase.from('Contact').select('provider'),
    supabase.from('EmailEvent').select('*, contact:Contact(*)').order('timestamp', { ascending: false }).limit(10),
    supabase.from('Campaign').select('id, name, status'),
    supabaseAdmin.from('CampaignContact').select('stepStatus, campaignId')
  ]);

  // 2. Funil de Performance REAL baseado em CampaignContact.stepStatus
  const statusHierarchy: Record<string, number> = {
    'QUEUED': 0, 'SENDING': 1, 'SENT': 2, 'DELIVERED': 3, 'OPENED': 4, 'CLICKED': 5,
    'BOUNCED': -1, 'FAILED': -1,
  };

  let totalSent = 0;
  let totalDelivered = 0;
  let totalOpened = 0;
  let totalClicked = 0;
  let totalBounced = 0;

  // Métricas por campanha
  const campaignMetrics = new Map<string, { sent: number; delivered: number; opened: number; clicked: number; total: number }>();

  if (campaignContacts) {
    campaignContacts.forEach(cc => {
      const level = statusHierarchy[cc.stepStatus] ?? 0;
      
      if (level >= 2) totalSent++;
      if (level >= 3) totalDelivered++;
      if (level >= 4) totalOpened++;
      if (level >= 5) totalClicked++;
      if (level < 0) totalBounced++;

      // Agregar por campanha
      if (!campaignMetrics.has(cc.campaignId)) {
        campaignMetrics.set(cc.campaignId, { sent: 0, delivered: 0, opened: 0, clicked: 0, total: 0 });
      }
      const cm = campaignMetrics.get(cc.campaignId)!;
      cm.total++;
      if (level >= 2) cm.sent++;
      if (level >= 3) cm.delivered++;
      if (level >= 4) cm.opened++;
      if (level >= 5) cm.clicked++;
    });
  }

  // 3. Processamento de Timeline a partir de EmailEvent (para gráficos de tendência)
  const timelineMap: Record<string, any> = {};
  if (events) {
    events.forEach(e => {
      const date = new Date(e.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (!timelineMap[date]) {
        timelineMap[date] = { date, sent: 0, opened: 0, clicked: 0, bounced: 0 };
      }
      if (e.eventType === 'SENT' || e.eventType === 'DELIVERED') timelineMap[date].sent++;
      if (e.eventType === 'OPENED') timelineMap[date].opened++;
      if (e.eventType === 'CLICKED') timelineMap[date].clicked++;
      if (e.eventType.includes('BOUNCED')) timelineMap[date].bounced++;
    });
  }

  // 4. Processamento de Crescimento (Audiência)
  const growthMap: Record<string, number> = {};
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const { data: recentContacts } = await supabase
    .from('Contact')
    .select('createdAt')
    .gte('createdAt', sevenDaysAgo.toISOString());

  if (recentContacts) {
    recentContacts.forEach(c => {
      const date = new Date(c.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      growthMap[date] = (growthMap[date] || 0) + 1;
    });
  }

  // 5. Processamento de Provedores
  const providerMap: Record<string, number> = {};
  if (providers) {
    providers.forEach(p => {
      providerMap[p.provider] = (providerMap[p.provider] || 0) + 1;
    });
  }

  // 6. Estruturação dos Dados
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

  const growthData = Object.entries(growthMap).map(([date, count]) => ({ date, count }))
    .sort((a, b) => {
      const [da, ma] = a.date.split('/');
      const [db, mb] = b.date.split('/');
      return new Date(2026, parseInt(ma)-1, parseInt(da)).getTime() - new Date(2026, parseInt(mb)-1, parseInt(db)).getTime();
    }).slice(-7);

  // 7. Performance real por campanha
  const campaignsPerformance = (campaignsData || []).map(c => {
    const metrics = campaignMetrics.get(c.id) || { sent: 0, delivered: 0, opened: 0, clicked: 0, total: 0 };
    return {
      ...c,
      openRate: metrics.sent > 0 ? Math.round((metrics.opened / metrics.sent) * 100) : 0,
      clickRate: metrics.opened > 0 ? Math.round((metrics.clicked / metrics.opened) * 100) : 0,
    };
  }).sort((a, b) => b.openRate - a.openRate).slice(0, 5);

  return {
    totalContacts: totalContacts || 0,
    activeCampaigns: activeCampaigns || 0,
    totalSent,
    totalDelivered,
    totalOpened,
    totalClicked,
    totalBounced,
    openRate: calcPercentage(totalOpened, totalSent),
    clickRate: calcPercentage(totalClicked, totalOpened),
    bounceRate: calcPercentage(totalBounced, totalSent),
    deliveryRate: calcPercentage(totalDelivered, totalSent),
    funnelData,
    trendData,
    growthData,
    providerCounts: Object.entries(providerMap).map(([provider, count]) => ({
      provider,
      count,
    })),
    recentEvents: (recentEventsData || []).map((event: any) => ({
      ...event,
      contact: event.contact
    })),
    campaignsPerformance,
  };
}

function calcPercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 1000) / 10;
}
