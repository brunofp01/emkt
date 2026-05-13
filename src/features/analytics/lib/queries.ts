/**
 * Dashboard Analytics — Queries corrigidas com dados reais.
 * 
 * IMPORTANTE: Opens e Clicks vêm da tabela EmailEvent, NÃO de CampaignContact.stepStatus.
 * CampaignContact.stepStatus pode não ser atualizado para OPENED/CLICKED se o webhook
 * registra o evento mas não atualiza o status do contato.
 */
import { supabaseAdmin } from "@/shared/lib/supabase";

export interface DashboardStats {
  // Audiência
  totalContacts: number;
  totalActive: number;
  totalUnsubscribed: number;
  // Envio (de CampaignContact)
  totalSent: number;
  totalDelivered: number;
  totalBounced: number;
  totalFailed: number;
  totalQueued: number;
  // Engajamento (de EmailEvent — dados reais)
  totalOpened: number;
  totalClicked: number;
  // Rates
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  ctorRate: number;
  bounceRate: number;
  unsubscribeRate: number;
  // Charts
  funnelData: { name: string; value: number; fill: string; pct: string }[];
  trendData: { date: string; sent: number; opened: number; clicked: number; bounced: number }[];
  growthData: { date: string; count: number }[];
  // Campaigns table
  campaignsPerformance: {
    id: string; name: string; status: string;
    total: number; sent: number; delivered: number;
    opened: number; clicked: number; bounced: number;
    openRate: number; ctorRate: number; bounceRate: number;
  }[];
  // Provider health
  providerHealth: {
    provider: string; isActive: boolean; sentToday: number;
    dailyLimit: number; accountTier: string; usagePct: number;
  }[];
  // Queue snapshot
  queueSnapshot: { queued: number; sending: number; sent: number; failed: number };
  // Recent events
  recentEvents: any[];
  // Campaign list for selector
  allCampaigns: { id: string; name: string; status: string }[];
  filteredCampaignName: string | null;
}

export async function getDashboardStats(campaignId?: string): Promise<DashboardStats> {
  // ── 1. Todas as campanhas (para o seletor — sempre sem filtro) ──
  const { data: allCampaigns } = await supabaseAdmin
    .from('Campaign')
    .select('id, name, status')
    .order('createdAt', { ascending: false });

  let filteredCampaignName: string | null = null;
  if (campaignId) {
    filteredCampaignName = (allCampaigns || []).find(c => c.id === campaignId)?.name || null;
  }

  // ── 2. CampaignContact (filtrado se campaignId) — para envios e fila ──
  let ccQuery = supabaseAdmin.from('CampaignContact').select('id, campaignId, stepStatus');
  if (campaignId) ccQuery = ccQuery.eq('campaignId', campaignId);
  const { data: ccData } = await ccQuery;

  // Mapear IDs de CampaignContact para filtrar EmailEvents por campanha
  const ccIds = new Set((ccData || []).map(cc => cc.id));

  // Agregar status por campanha
  const campaignAgg = new Map<string, { total: number; sent: number; delivered: number; bounced: number; queued: number }>();
  const queueSnapshot = { queued: 0, sending: 0, sent: 0, failed: 0 };

  let totalSent = 0, totalDelivered = 0, totalBounced = 0, totalFailed = 0, totalQueued = 0;

  if (ccData) {
    for (const cc of ccData) {
      const s = cc.stepStatus;

      // Global counts
      if (['SENT', 'DELIVERED', 'OPENED', 'CLICKED'].includes(s)) totalSent++;
      if (['DELIVERED', 'OPENED', 'CLICKED'].includes(s)) totalDelivered++;
      if (s === 'BOUNCED') totalBounced++;
      if (s === 'FAILED') totalFailed++;
      if (s === 'QUEUED' || s === 'PENDING') totalQueued++;

      // Queue snapshot
      if (s === 'PENDING' || s === 'QUEUED') queueSnapshot.queued++;
      else if (s === 'SENDING') queueSnapshot.sending++;
      else if (['SENT', 'DELIVERED', 'OPENED', 'CLICKED'].includes(s)) queueSnapshot.sent++;
      else if (s === 'BOUNCED' || s === 'FAILED') queueSnapshot.failed++;

      // Per-campaign
      if (!campaignAgg.has(cc.campaignId)) {
        campaignAgg.set(cc.campaignId, { total: 0, sent: 0, delivered: 0, bounced: 0, queued: 0 });
      }
      const m = campaignAgg.get(cc.campaignId)!;
      m.total++;
      if (['SENT', 'DELIVERED', 'OPENED', 'CLICKED'].includes(s)) m.sent++;
      if (['DELIVERED', 'OPENED', 'CLICKED'].includes(s)) m.delivered++;
      if (s === 'BOUNCED' || s === 'FAILED') m.bounced++;
      if (s === 'QUEUED' || s === 'PENDING') m.queued++;
    }
  }

  // ── 3. EmailEvents — FONTE REAL de opens e clicks ──
  let evQuery = supabaseAdmin.from('EmailEvent').select('eventType, campaignContactId');
  // Não filtramos por campaignId diretamente; filtraremos pelos ccIds
  const { data: allEvents } = await evQuery;

  let totalOpened = 0, totalClicked = 0;
  const campaignEventAgg = new Map<string, { opened: number; clicked: number }>();

  // Mapear ccId → campaignId para agregar por campanha
  const ccToCampaign = new Map<string, string>();
  if (ccData) {
    for (const cc of ccData) {
      ccToCampaign.set(cc.id, cc.campaignId);
    }
  }

  if (allEvents) {
    for (const ev of allEvents) {
      // Se filtro por campanha, ignorar events de outras campanhas
      if (campaignId && !ccIds.has(ev.campaignContactId)) continue;

      if (ev.eventType === 'OPENED') totalOpened++;
      if (ev.eventType === 'CLICKED') totalClicked++;

      // Per-campaign aggregation
      const cId = ccToCampaign.get(ev.campaignContactId);
      if (cId) {
        if (!campaignEventAgg.has(cId)) campaignEventAgg.set(cId, { opened: 0, clicked: 0 });
        const m = campaignEventAgg.get(cId)!;
        if (ev.eventType === 'OPENED') m.opened++;
        if (ev.eventType === 'CLICKED') m.clicked++;
      }
    }
  }

  // ── 4. Contatos — Audiência ──
  const [
    { count: totalContacts },
    { count: totalUnsubscribed },
    { count: totalActive },
  ] = await Promise.all([
    supabaseAdmin.from('Contact').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('Contact').select('*', { count: 'exact', head: true }).eq('status', 'UNSUBSCRIBED'),
    supabaseAdmin.from('Contact').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
  ]);

  // ── 5. Rates ──
  const deliveryRate = pct(totalDelivered, totalSent);
  const openRate = pct(totalOpened, totalSent);
  const clickRate = pct(totalClicked, totalSent);
  const ctorRate = pct(totalClicked, totalOpened);
  const bounceRate = pct(totalBounced + totalFailed, totalSent);
  const unsubscribeRate = pct(totalUnsubscribed || 0, totalContacts || 0);

  // ── 6. Funnel — números reais ──
  const funnelData = [
    { name: 'Enviados', value: totalSent, fill: '#3b82f6', pct: '100%' },
    { name: 'Entregues', value: totalDelivered, fill: '#10b981', pct: `${deliveryRate}%` },
    { name: 'Abertos', value: totalOpened, fill: '#f59e0b', pct: `${openRate}%` },
    { name: 'Clicados', value: totalClicked, fill: '#8b5cf6', pct: `${ctorRate}%` },
  ];

  // ── 7. Timeline (30 dias) ──
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: recentEvents } = await supabaseAdmin
    .from('EmailEvent')
    .select('eventType, timestamp, campaignContactId')
    .gte('timestamp', thirtyDaysAgo.toISOString())
    .order('timestamp', { ascending: false })
    .limit(1000);

  const timelineMap: Record<string, { date: string; sent: number; opened: number; clicked: number; bounced: number }> = {};
  if (recentEvents) {
    for (const e of recentEvents) {
      if (campaignId && !ccIds.has(e.campaignContactId)) continue;
      const date = new Date(e.timestamp).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' });
      if (!timelineMap[date]) timelineMap[date] = { date, sent: 0, opened: 0, clicked: 0, bounced: 0 };
      if (e.eventType === 'SENT' || e.eventType === 'DELIVERED') timelineMap[date].sent++;
      if (e.eventType === 'OPENED') timelineMap[date].opened++;
      if (e.eventType === 'CLICKED') timelineMap[date].clicked++;
      if (e.eventType === 'BOUNCED' || e.eventType === 'BOUNCED_HARD') timelineMap[date].bounced++;
    }
  }

  const year = new Date().getFullYear();
  const trendData = Object.values(timelineMap).sort((a, b) => {
    const [da, ma] = a.date.split('/');
    const [db, mb] = b.date.split('/');
    return new Date(year, parseInt(ma) - 1, parseInt(da)).getTime() - new Date(year, parseInt(mb) - 1, parseInt(db)).getTime();
  }).slice(-14);

  // ── 8. Growth (7 dias) ──
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const { data: recentContacts } = await supabaseAdmin
    .from('Contact')
    .select('createdAt')
    .gte('createdAt', sevenDaysAgo.toISOString())
    .limit(1000);

  const growthMap: Record<string, number> = {};
  if (recentContacts) {
    for (const c of recentContacts) {
      const date = new Date(c.createdAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' });
      growthMap[date] = (growthMap[date] || 0) + 1;
    }
  }
  const growthData = Object.entries(growthMap).map(([date, count]) => ({ date, count }))
    .sort((a, b) => {
      const [da, ma] = a.date.split('/');
      const [db, mb] = b.date.split('/');
      return new Date(year, parseInt(ma) - 1, parseInt(da)).getTime() - new Date(year, parseInt(mb) - 1, parseInt(db)).getTime();
    }).slice(-7);

  // ── 9. Performance por campanha (merge CC + Events) ──
  const campaignsPerformance = (allCampaigns || []).map(c => {
    const ccMetrics = campaignAgg.get(c.id) || { total: 0, sent: 0, delivered: 0, bounced: 0, queued: 0 };
    const evMetrics = campaignEventAgg.get(c.id) || { opened: 0, clicked: 0 };
    return {
      ...c,
      total: ccMetrics.total,
      sent: ccMetrics.sent,
      delivered: ccMetrics.delivered,
      opened: evMetrics.opened,
      clicked: evMetrics.clicked,
      bounced: ccMetrics.bounced,
      openRate: pct(evMetrics.opened, ccMetrics.sent),
      ctorRate: pct(evMetrics.clicked, evMetrics.opened),
      bounceRate: pct(ccMetrics.bounced, ccMetrics.sent),
    };
  }).filter(c => c.total > 0).sort((a, b) => b.sent - a.sent);

  // ── 10. Provider health ──
  const { data: providerConfigs } = await supabaseAdmin
    .from('ProviderConfig')
    .select('provider, isActive, sentToday, dailyLimit, accountTier')
    .order('provider');

  const providerHealth = (providerConfigs || []).map(p => ({
    provider: p.provider,
    isActive: p.isActive,
    sentToday: p.sentToday || 0,
    dailyLimit: p.dailyLimit || 0,
    accountTier: p.accountTier || 'NOVA',
    usagePct: p.dailyLimit > 0 ? Math.round(((p.sentToday || 0) / p.dailyLimit) * 100) : 0,
  }));

  // ── 11. Recent events feed ──
  const { data: feedEvents } = await supabaseAdmin
    .from('EmailEvent')
    .select('*, contact:Contact(email)')
    .order('timestamp', { ascending: false })
    .limit(8);

  return {
    totalContacts: totalContacts || 0,
    totalActive: totalActive || 0,
    totalUnsubscribed: totalUnsubscribed || 0,
    totalSent,
    totalDelivered,
    totalOpened,
    totalClicked,
    totalBounced,
    totalFailed,
    totalQueued,
    deliveryRate,
    openRate,
    clickRate,
    ctorRate,
    bounceRate,
    unsubscribeRate,
    funnelData,
    trendData,
    growthData,
    campaignsPerformance,
    providerHealth,
    queueSnapshot,
    recentEvents: (feedEvents || []).map((e: any) => ({ ...e, contact: e.contact })),
    allCampaigns: allCampaigns || [],
    filteredCampaignName,
  };
}

function pct(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 1000) / 10;
}
