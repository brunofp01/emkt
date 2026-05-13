/**
 * Dashboard Analytics — Queries otimizadas com filtro por campanha.
 * 
 * getDashboardStats(campaignId?) retorna todas as métricas.
 * Quando campaignId é fornecido, filtra tudo por essa campanha.
 */
import { supabaseAdmin } from "@/shared/lib/supabase";

export interface DashboardStats {
  // Hero KPIs
  totalContacts: number;
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  totalFailed: number;
  totalUnsubscribed: number;
  // Rates
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  ctorRate: number; // Click-to-Open Rate
  bounceRate: number;
  unsubscribeRate: number;
  // Charts
  funnelData: { name: string; value: number; fill: string; pct: string }[];
  trendData: { date: string; sent: number; opened: number; clicked: number; bounced: number }[];
  growthData: { date: string; count: number }[];
  // Campaigns table
  campaignsPerformance: {
    id: string;
    name: string;
    status: string;
    total: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    openRate: number;
    ctorRate: number;
    bounceRate: number;
  }[];
  // Provider health
  providerHealth: {
    provider: string;
    isActive: boolean;
    sentToday: number;
    dailyLimit: number;
    accountTier: string;
    usagePct: number;
  }[];
  // Queue snapshot
  queueSnapshot: { queued: number; sending: number; sent: number; failed: number };
  // Recent events
  recentEvents: any[];
  // Campaign list for selector
  allCampaigns: { id: string; name: string; status: string }[];
  // Filter state
  filteredCampaignName: string | null;
}

export async function getDashboardStats(campaignId?: string): Promise<DashboardStats> {
  // ── 1. Campaign list (always unfiltered) ──
  const { data: allCampaigns } = await supabaseAdmin
    .from('Campaign')
    .select('id, name, status')
    .order('createdAt', { ascending: false });

  let filteredCampaignName: string | null = null;
  if (campaignId) {
    const match = (allCampaigns || []).find(c => c.id === campaignId);
    filteredCampaignName = match?.name || null;
  }

  // ── 2. CampaignContact data (filtered if campaignId provided) ──
  let ccQuery = supabaseAdmin.from('CampaignContact').select('campaignId, stepStatus');
  if (campaignId) ccQuery = ccQuery.eq('campaignId', campaignId);
  const { data: ccData } = await ccQuery;

  // Aggregate status counts
  const statusCounts: Record<string, number> = {};
  const campaignAgg = new Map<string, { total: number; sent: number; delivered: number; opened: number; clicked: number; bounced: number }>();

  if (ccData) {
    for (const cc of ccData) {
      const s = cc.stepStatus;
      statusCounts[s] = (statusCounts[s] || 0) + 1;

      // Per-campaign aggregation
      if (!campaignAgg.has(cc.campaignId)) {
        campaignAgg.set(cc.campaignId, { total: 0, sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0 });
      }
      const m = campaignAgg.get(cc.campaignId)!;
      m.total++;
      if (['SENT', 'DELIVERED', 'OPENED', 'CLICKED'].includes(s)) m.sent++;
      if (['DELIVERED', 'OPENED', 'CLICKED'].includes(s)) m.delivered++;
      if (['OPENED', 'CLICKED'].includes(s)) m.opened++;
      if (s === 'CLICKED') m.clicked++;
      if (s === 'BOUNCED' || s === 'FAILED') m.bounced++;
    }
  }

  const totalSent = (statusCounts['SENT'] || 0) + (statusCounts['DELIVERED'] || 0) + (statusCounts['OPENED'] || 0) + (statusCounts['CLICKED'] || 0);
  const totalDelivered = (statusCounts['DELIVERED'] || 0) + (statusCounts['OPENED'] || 0) + (statusCounts['CLICKED'] || 0);
  const totalOpened = (statusCounts['OPENED'] || 0) + (statusCounts['CLICKED'] || 0);
  const totalClicked = statusCounts['CLICKED'] || 0;
  const totalBounced = (statusCounts['BOUNCED'] || 0) + (statusCounts['FAILED'] || 0);

  // ── 3. Contacts + Unsubscribed ──
  const [
    { count: totalContacts },
    { count: totalUnsubscribed },
  ] = await Promise.all([
    supabaseAdmin.from('Contact').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('Contact').select('*', { count: 'exact', head: true }).eq('status', 'UNSUBSCRIBED'),
  ]);

  // ── 4. Rates ──
  const deliveryRate = pct(totalDelivered, totalSent);
  const openRate = pct(totalOpened, totalDelivered);
  const clickRate = pct(totalClicked, totalDelivered);
  const ctorRate = pct(totalClicked, totalOpened);
  const bounceRate = pct(totalBounced, totalSent);
  const unsubscribeRate = pct(totalUnsubscribed || 0, totalDelivered);

  // ── 5. Funnel data ──
  const funnelData = [
    { name: 'Enviados', value: totalSent, fill: '#3b82f6', pct: '100%' },
    { name: 'Entregues', value: totalDelivered, fill: '#10b981', pct: `${deliveryRate}%` },
    { name: 'Abertos', value: totalOpened, fill: '#f59e0b', pct: `${openRate}%` },
    { name: 'Clicados', value: totalClicked, fill: '#8b5cf6', pct: `${ctorRate}%` },
  ];

  // ── 6. Timeline (30 days) ──
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  let evQuery = supabaseAdmin
    .from('EmailEvent')
    .select('eventType, timestamp, campaignContactId')
    .gte('timestamp', thirtyDaysAgo.toISOString())
    .order('timestamp', { ascending: false })
    .limit(500);

  const { data: recentEvents } = await evQuery;

  const timelineMap: Record<string, { date: string; sent: number; opened: number; clicked: number; bounced: number }> = {};
  if (recentEvents) {
    for (const e of recentEvents) {
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

  // ── 7. Growth (7 days) ──
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
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
  const growthData = Object.entries(growthMap).map(([date, count]) => ({ date, count }))
    .sort((a, b) => {
      const [da, ma] = a.date.split('/');
      const [db, mb] = b.date.split('/');
      return new Date(year, parseInt(ma) - 1, parseInt(da)).getTime() - new Date(year, parseInt(mb) - 1, parseInt(db)).getTime();
    }).slice(-7);

  // ── 8. Campaigns performance table ──
  const campaignsPerformance = (allCampaigns || []).map(c => {
    const m = campaignAgg.get(c.id) || { total: 0, sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0 };
    return {
      ...c,
      total: m.total,
      sent: m.sent,
      delivered: m.delivered,
      opened: m.opened,
      clicked: m.clicked,
      bounced: m.bounced,
      openRate: pct(m.opened, m.delivered),
      ctorRate: pct(m.clicked, m.opened),
      bounceRate: pct(m.bounced, m.sent),
    };
  }).filter(c => c.total > 0).sort((a, b) => b.sent - a.sent);

  // ── 9. Provider health ──
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

  // ── 10. Queue snapshot ──
  const queueSnapshot = { queued: 0, sending: 0, sent: 0, failed: 0 };
  if (ccData) {
    for (const cc of ccData) {
      const s = cc.stepStatus;
      if (s === 'PENDING' || s === 'QUEUED') queueSnapshot.queued++;
      else if (s === 'SENDING') queueSnapshot.sending++;
      else if (['SENT', 'DELIVERED', 'OPENED', 'CLICKED'].includes(s)) queueSnapshot.sent++;
      else if (s === 'BOUNCED' || s === 'FAILED') queueSnapshot.failed++;
    }
  }

  // ── 11. Recent events feed ──
  const { data: feedEvents } = await supabaseAdmin
    .from('EmailEvent')
    .select('*, contact:Contact(email)')
    .order('timestamp', { ascending: false })
    .limit(8);

  return {
    totalContacts: totalContacts || 0,
    totalSent,
    totalDelivered,
    totalOpened,
    totalClicked,
    totalBounced,
    totalFailed: statusCounts['FAILED'] || 0,
    totalUnsubscribed: totalUnsubscribed || 0,
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
