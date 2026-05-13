/**
 * Dashboard Statistics — Queries otimizadas para performance.
 * 
 * OTIMIZAÇÕES APLICADAS:
 *   - Contagens de campanha consolidadas (elimina N+5 queries por campanha)
 *   - Timeline calculada no servidor com agregação eficiente
 *   - Growth contado via HEAD (sem download de registros)
 *   - Provedores via ProviderConfig (sem scan de Contact)
 *   - Total de queries: ~12 (antes: 30-60+)
 */
import { supabaseAdmin } from "@/shared/lib/supabase";

export async function getDashboardStats() {
  // ── 1. Contadores globais (7 queries HEAD — sem dados trafegados) ──
  const [
    { count: totalContacts },
    { count: activeCampaigns },
    { count: totalSent },
    { count: totalDelivered },
    { count: totalOpened },
    { count: totalClicked },
    { count: totalBounced },
  ] = await Promise.all([
    supabaseAdmin.from('Contact').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('Campaign').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
    supabaseAdmin.from('CampaignContact').select('*', { count: 'exact', head: true }).in('stepStatus', ['SENT', 'DELIVERED', 'OPENED', 'CLICKED']),
    supabaseAdmin.from('CampaignContact').select('*', { count: 'exact', head: true }).in('stepStatus', ['DELIVERED', 'OPENED', 'CLICKED']),
    supabaseAdmin.from('CampaignContact').select('*', { count: 'exact', head: true }).in('stepStatus', ['OPENED', 'CLICKED']),
    supabaseAdmin.from('CampaignContact').select('*', { count: 'exact', head: true }).eq('stepStatus', 'CLICKED'),
    supabaseAdmin.from('CampaignContact').select('*', { count: 'exact', head: true }).in('stepStatus', ['BOUNCED', 'FAILED']),
  ]);

  // ── 2. Dados leves: eventos recentes, campanhas, provedores (3 queries) ──
  const [
    { data: recentEventsData },
    { data: campaignsData },
    { data: providerConfigs },
  ] = await Promise.all([
    supabaseAdmin.from('EmailEvent')
      .select('*, contact:Contact(email)')
      .order('timestamp', { ascending: false })
      .limit(6),
    supabaseAdmin.from('Campaign')
      .select('id, name, status')
      .order('createdAt', { ascending: false })
      .limit(10),
    // Usar ProviderConfig em vez de escanear todos os Contact
    supabaseAdmin.from('ProviderConfig')
      .select('provider, sentToday, dailyLimit, isActive, totalSent')
      .order('provider'),
  ]);

  // ── 3. Métricas por campanha — 1 query com CampaignContact + groupBy manual ──
  // Em vez de 5 queries por campanha, buscamos todos os CampaignContacts das top 10 campanhas
  const campaignIds = (campaignsData || []).map(c => c.id);
  const campaignMetrics = new Map<string, { sent: number; delivered: number; opened: number; clicked: number; total: number }>();

  if (campaignIds.length > 0) {
    const { data: ccData } = await supabaseAdmin
      .from('CampaignContact')
      .select('campaignId, stepStatus')
      .in('campaignId', campaignIds);

    // Agregar no servidor (muito mais rápido que N queries)
    if (ccData) {
      for (const cc of ccData) {
        const metrics = campaignMetrics.get(cc.campaignId) || { sent: 0, delivered: 0, opened: 0, clicked: 0, total: 0 };
        metrics.total++;
        const s = cc.stepStatus;
        if (['SENT', 'DELIVERED', 'OPENED', 'CLICKED'].includes(s)) metrics.sent++;
        if (['DELIVERED', 'OPENED', 'CLICKED'].includes(s)) metrics.delivered++;
        if (['OPENED', 'CLICKED'].includes(s)) metrics.opened++;
        if (s === 'CLICKED') metrics.clicked++;
        campaignMetrics.set(cc.campaignId, metrics);
      }
    }
  }

  // ── 4. Timeline (últimos 7 dias) — 1 query com dados mínimos ──
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: recentEvents } = await supabaseAdmin
    .from('EmailEvent')
    .select('eventType, timestamp')
    .gte('timestamp', sevenDaysAgo.toISOString())
    .order('timestamp', { ascending: false })
    .limit(200); // Reduzido de 500 para 200 — suficiente para timeline de 7 dias

  const timelineMap: Record<string, { date: string; sent: number; opened: number; clicked: number; bounced: number }> = {};
  if (recentEvents) {
    for (const e of recentEvents) {
      const date = new Date(e.timestamp).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' });
      if (!timelineMap[date]) {
        timelineMap[date] = { date, sent: 0, opened: 0, clicked: 0, bounced: 0 };
      }
      if (e.eventType === 'SENT' || e.eventType === 'DELIVERED') timelineMap[date].sent++;
      if (e.eventType === 'OPENED') timelineMap[date].opened++;
      if (e.eventType === 'CLICKED') timelineMap[date].clicked++;
      if (e.eventType === 'BOUNCED' || e.eventType === 'BOUNCED_HARD') timelineMap[date].bounced++;
    }
  }

  // ── 5. Growth (últimos 7 dias) — COUNT HEAD por dia é mais pesado, fazer 1 query leve ──
  const { data: recentContacts } = await supabaseAdmin
    .from('Contact')
    .select('createdAt')
    .gte('createdAt', sevenDaysAgo.toISOString())
    .limit(500);

  const growthMap: Record<string, number> = {};
  if (recentContacts) {
    for (const c of recentContacts) {
      const date = new Date(c.createdAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' });
      growthMap[date] = (growthMap[date] || 0) + 1;
    }
  }

  // ── 6. Estruturar resposta ──
  const safeSent = totalSent || 0;
  const safeOpened = totalOpened || 0;

  const funnelData = [
    { name: 'Enviados', value: totalSent || 0, fill: '#3b82f6' },
    { name: 'Entregues', value: totalDelivered || 0, fill: '#10b981' },
    { name: 'Abertos', value: totalOpened || 0, fill: '#f59e0b' },
    { name: 'Clicados', value: totalClicked || 0, fill: '#8b5cf6' },
  ];

  const year = new Date().getFullYear();
  const trendData = Object.values(timelineMap).sort((a, b) => {
    const [da, ma] = a.date.split('/');
    const [db, mb] = b.date.split('/');
    return new Date(year, parseInt(ma)-1, parseInt(da)).getTime() - new Date(year, parseInt(mb)-1, parseInt(db)).getTime();
  }).slice(-7);

  const growthData = Object.entries(growthMap).map(([date, count]) => ({ date, count }))
    .sort((a, b) => {
      const [da, ma] = a.date.split('/');
      const [db, mb] = b.date.split('/');
      return new Date(year, parseInt(ma)-1, parseInt(da)).getTime() - new Date(year, parseInt(mb)-1, parseInt(db)).getTime();
    }).slice(-7);

  const campaignsPerformance = (campaignsData || []).map((c) => {
    const metrics = campaignMetrics.get(c.id) || { sent: 0, delivered: 0, opened: 0, clicked: 0, total: 0 };
    return {
      ...c,
      openRate: metrics.sent > 0 ? Math.round((metrics.opened / metrics.sent) * 100) : 0,
      clickRate: metrics.opened > 0 ? Math.round((metrics.clicked / metrics.opened) * 100) : 0,
    };
  }).sort((a, b) => b.openRate - a.openRate).slice(0, 5);

  // Provedores — usar ProviderConfig (1 row cada) em vez de escanear Contact inteiro
  const providerCounts = (providerConfigs || []).map(p => ({
    provider: p.provider,
    count: p.totalSent || 0,
  }));

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
    providerCounts,
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
