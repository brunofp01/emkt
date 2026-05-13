/**
 * Dashboard Statistics — Queries otimizadas para alto volume.
 * 
 * IMPORTANTE: Usa supabaseAdmin para bypass de RLS.
 * Usa COUNT queries em vez de fetchAll para evitar baixar
 * milhares de registros na memória.
 */
import { supabaseAdmin } from "@/shared/lib/supabase";

export async function getDashboardStats() {
  // 1. Contadores rápidos via SQL COUNT (sem baixar dados)
  const [
    { count: totalContacts },
    { count: activeCampaigns },
    { count: totalSent },
    { count: totalDelivered },
    { count: totalOpened },
    { count: totalClicked },
    { count: totalBounced },
    { data: recentEventsData },
    { data: campaignsData },
    { data: providers },
  ] = await Promise.all([
    // Contadores instantâneos
    supabaseAdmin.from('Contact').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('Campaign').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
    supabaseAdmin.from('CampaignContact').select('*', { count: 'exact', head: true }).in('stepStatus', ['SENT', 'DELIVERED', 'OPENED', 'CLICKED']),
    supabaseAdmin.from('CampaignContact').select('*', { count: 'exact', head: true }).in('stepStatus', ['DELIVERED', 'OPENED', 'CLICKED']),
    supabaseAdmin.from('CampaignContact').select('*', { count: 'exact', head: true }).in('stepStatus', ['OPENED', 'CLICKED']),
    supabaseAdmin.from('CampaignContact').select('*', { count: 'exact', head: true }).eq('stepStatus', 'CLICKED'),
    supabaseAdmin.from('CampaignContact').select('*', { count: 'exact', head: true }).in('stepStatus', ['BOUNCED', 'FAILED']),
    // Dados leves (apenas 10 registros)
    supabaseAdmin.from('EmailEvent').select('*, contact:Contact(email)').order('timestamp', { ascending: false }).limit(10),
    supabaseAdmin.from('Campaign').select('id, name, status'),
    supabaseAdmin.from('Contact').select('provider'),
  ]);

  // 2. Métricas por campanha via COUNT (paralelo)
  const campaignMetrics = new Map<string, { sent: number; delivered: number; opened: number; clicked: number; total: number }>();
  
  if (campaignsData && campaignsData.length > 0) {
    const metricsPromises = campaignsData.map(async (campaign) => {
      const [
        { count: cTotal },
        { count: cSent },
        { count: cDelivered },
        { count: cOpened },
        { count: cClicked },
      ] = await Promise.all([
        supabaseAdmin.from('CampaignContact').select('*', { count: 'exact', head: true }).eq('campaignId', campaign.id),
        supabaseAdmin.from('CampaignContact').select('*', { count: 'exact', head: true }).eq('campaignId', campaign.id).in('stepStatus', ['SENT', 'DELIVERED', 'OPENED', 'CLICKED']),
        supabaseAdmin.from('CampaignContact').select('*', { count: 'exact', head: true }).eq('campaignId', campaign.id).in('stepStatus', ['DELIVERED', 'OPENED', 'CLICKED']),
        supabaseAdmin.from('CampaignContact').select('*', { count: 'exact', head: true }).eq('campaignId', campaign.id).in('stepStatus', ['OPENED', 'CLICKED']),
        supabaseAdmin.from('CampaignContact').select('*', { count: 'exact', head: true }).eq('campaignId', campaign.id).eq('stepStatus', 'CLICKED'),
      ]);
      
      campaignMetrics.set(campaign.id, {
        total: cTotal || 0,
        sent: cSent || 0,
        delivered: cDelivered || 0,
        opened: cOpened || 0,
        clicked: cClicked || 0,
      });
    });
    
    await Promise.all(metricsPromises);
  }

  // 3. Timeline de eventos (últimos 7 dias apenas, com limite)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const { data: recentEvents } = await supabaseAdmin
    .from('EmailEvent')
    .select('eventType, timestamp')
    .gte('timestamp', sevenDaysAgo.toISOString())
    .order('timestamp', { ascending: false })
    .limit(500);

  const timelineMap: Record<string, any> = {};
  if (recentEvents) {
    recentEvents.forEach((e: any) => {
      const date = new Date(e.timestamp).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' });
      if (!timelineMap[date]) {
        timelineMap[date] = { date, sent: 0, opened: 0, clicked: 0, bounced: 0 };
      }
      if (e.eventType === 'SENT' || e.eventType === 'DELIVERED') timelineMap[date].sent++;
      if (e.eventType === 'OPENED') timelineMap[date].opened++;
      if (e.eventType === 'CLICKED') timelineMap[date].clicked++;
      if (e.eventType === 'BOUNCED') timelineMap[date].bounced++;
    });
  }

  // 4. Crescimento de audiência (últimos 7 dias)
  const growthMap: Record<string, number> = {};
  const { data: recentContacts } = await supabaseAdmin
    .from('Contact')
    .select('createdAt')
    .gte('createdAt', sevenDaysAgo.toISOString());

  if (recentContacts) {
    recentContacts.forEach((c: any) => {
      const date = new Date(c.createdAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' });
      growthMap[date] = (growthMap[date] || 0) + 1;
    });
  }

  // 5. Provedores
  const providerMap: Record<string, number> = {};
  if (providers) {
    providers.forEach((p: any) => {
      providerMap[p.provider] = (providerMap[p.provider] || 0) + 1;
    });
  }

  // 6. Estruturar dados
  const safeSent = totalSent || 0;
  const safeOpened = totalOpened || 0;

  const funnelData = [
    { name: 'Enviados', value: totalSent || 0, fill: '#3b82f6' },
    { name: 'Entregues', value: totalDelivered || 0, fill: '#10b981' },
    { name: 'Abertos', value: totalOpened || 0, fill: '#f59e0b' },
    { name: 'Clicados', value: totalClicked || 0, fill: '#8b5cf6' },
  ];

  const trendData = Object.values(timelineMap).sort((a: any, b: any) => {
    const [da, ma] = a.date.split('/');
    const [db, mb] = b.date.split('/');
    const year = new Date().getFullYear(); return new Date(year, parseInt(ma)-1, parseInt(da)).getTime() - new Date(year, parseInt(mb)-1, parseInt(db)).getTime();
  }).slice(-7);

  const growthData = Object.entries(growthMap).map(([date, count]) => ({ date, count }))
    .sort((a, b) => {
      const [da, ma] = a.date.split('/');
      const [db, mb] = b.date.split('/');
      const year = new Date().getFullYear(); return new Date(year, parseInt(ma)-1, parseInt(da)).getTime() - new Date(year, parseInt(mb)-1, parseInt(db)).getTime();
    }).slice(-7);

  const campaignsPerformance = (campaignsData || []).map((c: any) => {
    const metrics = campaignMetrics.get(c.id) || { sent: 0, delivered: 0, opened: 0, clicked: 0, total: 0 };
    return {
      ...c,
      openRate: metrics.sent > 0 ? Math.round((metrics.opened / metrics.sent) * 100) : 0,
      clickRate: metrics.opened > 0 ? Math.round((metrics.clicked / metrics.opened) * 100) : 0,
    };
  }).sort((a: any, b: any) => b.openRate - a.openRate).slice(0, 5);

  return {
    totalContacts: totalContacts || 0,
    activeCampaigns: activeCampaigns || 0,
    totalSent: totalSent || 0,
    totalDelivered: totalDelivered || 0,
    totalOpened: totalOpened || 0,
    totalClicked: totalClicked || 0,
    totalBounced: totalBounced || 0,
    openRate: calcPercentage(safeOpened, safeSent),
    clickRate: calcPercentage(totalClicked || 0, safeOpened),
    bounceRate: calcPercentage(totalBounced || 0, safeSent),
    deliveryRate: calcPercentage(totalDelivered || 0, safeSent),
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
