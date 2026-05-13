/**
 * Dashboard Analytics — Queries usando COUNT HEAD (sem limite de 1000 linhas).
 * 
 * REGRA: NUNCA baixar linhas para contar. Sempre usar { count: 'exact', head: true }.
 * O Supabase retorna max 1000 rows por query. COUNT HEAD não tem limite.
 */
import { supabaseAdmin } from "@/shared/lib/supabase";

export interface DashboardStats {
  // Audiência
  totalContacts: number;
  totalActive: number;
  totalUnsubscribed: number;
  // Envio
  totalInCampaign: number;
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  totalQueued: number;
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
  // Campaign list
  allCampaigns: { id: string; name: string; status: string }[];
  filteredCampaignName: string | null;
}

/**
 * Busca todas as métricas do dashboard.
 * campaignId opcional filtra TUDO por essa campanha.
 */
export async function getDashboardStats(campaignId?: string): Promise<DashboardStats> {
  // ── 1. Campanhas (sempre sem filtro, para o seletor) ──
  const { data: allCampaigns } = await supabaseAdmin
    .from('Campaign')
    .select('id, name, status')
    .order('createdAt', { ascending: false });

  let filteredCampaignName: string | null = null;
  if (campaignId) {
    filteredCampaignName = (allCampaigns || []).find(c => c.id === campaignId)?.name || null;
  }

  // ── 2. Contadores via COUNT HEAD (sem limite de 1000) ──
  // Nota: .in('stepStatus', [...]) conta contacts cujo status está nessa lista.
  // SENT inclui SENT+DELIVERED+OPENED+CLICKED (emails que saíram)
  // DELIVERED inclui DELIVERED+OPENED+CLICKED (confirmados pelo servidor de destino)
  // OPENED inclui OPENED+CLICKED (abriram o email)
  // CLICKED = clicaram em um link

  function ccCount(filter?: { status?: string[]; eq?: string }) {
    let q = supabaseAdmin.from('CampaignContact').select('*', { count: 'exact', head: true });
    if (campaignId) q = q.eq('campaignId', campaignId);
    if (filter?.status) q = q.in('stepStatus', filter.status);
    if (filter?.eq) q = q.eq('stepStatus', filter.eq);
    return q;
  }

  const [
    { count: totalInCampaign },
    { count: totalSent },
    { count: totalDelivered },
    { count: totalOpened },
    { count: totalClicked },
    { count: totalBounced },
    { count: totalQueued },
    { count: totalSending },
  ] = await Promise.all([
    ccCount(),
    ccCount({ status: ['SENT', 'DELIVERED', 'OPENED', 'CLICKED'] }),
    ccCount({ status: ['DELIVERED', 'OPENED', 'CLICKED'] }),
    ccCount({ status: ['OPENED', 'CLICKED'] }),
    ccCount({ eq: 'CLICKED' }),
    ccCount({ status: ['BOUNCED', 'FAILED'] }),
    ccCount({ status: ['QUEUED', 'PENDING'] }),
    ccCount({ eq: 'SENDING' }),
  ]);

  // ── 3. Audiência ──
  // Global: todos os contatos da plataforma
  // Filtrada: contatos na campanha selecionada
  let totalContacts: number, totalActive: number, totalUnsubscribed: number;

  if (campaignId) {
    // Quando filtrando por campanha, audiência = contatos DESSA campanha
    totalContacts = totalInCampaign || 0;
    totalActive = totalContacts;
    totalUnsubscribed = 0;
  } else {
    const [
      { count: cTotal },
      { count: cActive },
      { count: cUnsub },
    ] = await Promise.all([
      supabaseAdmin.from('Contact').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('Contact').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
      supabaseAdmin.from('Contact').select('*', { count: 'exact', head: true }).eq('status', 'UNSUBSCRIBED'),
    ]);
    totalContacts = cTotal || 0;
    totalActive = cActive || 0;
    totalUnsubscribed = cUnsub || 0;
  }

  // ── 4. Rates ──
  const s = totalSent || 0;
  const d = totalDelivered || 0;
  const o = totalOpened || 0;
  const c = totalClicked || 0;
  const b = totalBounced || 0;

  const deliveryRate = pct(d, s);
  const openRate = pct(o, s);
  const clickRate = pct(c, s);
  const ctorRate = pct(c, o);
  const bounceRate = pct(b, s);
  const unsubscribeRate = campaignId ? 0 : pct(totalUnsubscribed, totalContacts);

  // ── 5. Funnel ──
  const funnelData = [
    { name: 'Enviados', value: s, fill: '#3b82f6', pct: '100%' },
    { name: 'Entregues', value: d, fill: '#10b981', pct: `${deliveryRate}%` },
    { name: 'Abertos', value: o, fill: '#f59e0b', pct: `${openRate}%` },
    { name: 'Clicados', value: c, fill: '#8b5cf6', pct: `${ctorRate}%` },
  ];

  // ── 6. Timeline (últimos 14 dias — limit adequado) ──
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const { data: recentEvents } = await supabaseAdmin
    .from('EmailEvent')
    .select('eventType, timestamp')
    .gte('timestamp', fourteenDaysAgo.toISOString())
    .order('timestamp', { ascending: false })
    .limit(1000);

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

  // ── 7. Growth (7 dias) ──
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const { data: recentContacts } = await supabaseAdmin
    .from('Contact')
    .select('createdAt')
    .gte('createdAt', sevenDaysAgo.toISOString())
    .limit(1000);

  const growthMap: Record<string, number> = {};
  if (recentContacts) {
    for (const ct of recentContacts) {
      const date = new Date(ct.createdAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' });
      growthMap[date] = (growthMap[date] || 0) + 1;
    }
  }
  const growthData = Object.entries(growthMap).map(([date, count]) => ({ date, count }))
    .sort((a, b) => {
      const [da, ma] = a.date.split('/');
      const [db, mb] = b.date.split('/');
      return new Date(year, parseInt(ma) - 1, parseInt(da)).getTime() - new Date(year, parseInt(mb) - 1, parseInt(db)).getTime();
    }).slice(-7);

  // ── 8. Performance por campanha (COUNT HEAD por campanha) ──
  const campaignList = campaignId
    ? (allCampaigns || []).filter(c => c.id === campaignId)
    : (allCampaigns || []);

  const campaignsPerformance = await Promise.all(
    campaignList.map(async (camp) => {
      const [
        { count: cTotal },
        { count: cSent },
        { count: cDelivered },
        { count: cOpened },
        { count: cClicked },
        { count: cBounced },
      ] = await Promise.all([
        supabaseAdmin.from('CampaignContact').select('*', { count: 'exact', head: true }).eq('campaignId', camp.id),
        supabaseAdmin.from('CampaignContact').select('*', { count: 'exact', head: true }).eq('campaignId', camp.id).in('stepStatus', ['SENT', 'DELIVERED', 'OPENED', 'CLICKED']),
        supabaseAdmin.from('CampaignContact').select('*', { count: 'exact', head: true }).eq('campaignId', camp.id).in('stepStatus', ['DELIVERED', 'OPENED', 'CLICKED']),
        supabaseAdmin.from('CampaignContact').select('*', { count: 'exact', head: true }).eq('campaignId', camp.id).in('stepStatus', ['OPENED', 'CLICKED']),
        supabaseAdmin.from('CampaignContact').select('*', { count: 'exact', head: true }).eq('campaignId', camp.id).eq('stepStatus', 'CLICKED'),
        supabaseAdmin.from('CampaignContact').select('*', { count: 'exact', head: true }).eq('campaignId', camp.id).in('stepStatus', ['BOUNCED', 'FAILED']),
      ]);

      const sent = cSent || 0;
      const opened = cOpened || 0;
      const clicked = cClicked || 0;

      return {
        id: camp.id,
        name: camp.name,
        status: camp.status,
        total: cTotal || 0,
        sent,
        delivered: cDelivered || 0,
        opened,
        clicked,
        bounced: cBounced || 0,
        openRate: pct(opened, sent),
        ctorRate: pct(clicked, opened),
        bounceRate: pct(cBounced || 0, sent),
      };
    })
  );

  // Ordenar por enviados (desc) e filtrar campanhas com pelo menos 1 contato
  const sortedPerformance = campaignsPerformance
    .filter(c => c.total > 0)
    .sort((a, b) => b.sent - a.sent);

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
  const queueSnapshot = {
    queued: totalQueued || 0,
    sending: totalSending || 0,
    sent: s,
    failed: b,
  };

  // ── 11. Recent events ──
  const { data: feedEvents } = await supabaseAdmin
    .from('EmailEvent')
    .select('*, contact:Contact(email)')
    .order('timestamp', { ascending: false })
    .limit(8);

  return {
    totalContacts,
    totalActive,
    totalUnsubscribed,
    totalInCampaign: totalInCampaign || 0,
    totalSent: s,
    totalDelivered: d,
    totalOpened: o,
    totalClicked: c,
    totalBounced: b,
    totalQueued: totalQueued || 0,
    deliveryRate,
    openRate,
    clickRate,
    ctorRate,
    bounceRate,
    unsubscribeRate,
    funnelData,
    trendData,
    growthData,
    campaignsPerformance: sortedPerformance,
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
