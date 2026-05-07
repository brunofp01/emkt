import { supabase } from "@/shared/lib/supabase";

/**
 * Dashboard Statistics Query - Refatorado para usar o SDK oficial do Supabase.
 * O uso de HTTPS/REST elimina 100% dos problemas de rede (IPv6/Networking) 
 * que ocorrem com o protocolo direto do PostgreSQL em plataformas serverless.
 */
export async function getDashboardStats() {
  // Executamos as consultas via HTTPS/REST para máxima estabilidade
  const [
    { count: totalContacts },
    { count: activeCampaigns },
    { data: events },
    { data: providers },
    { data: recentEventsData }
  ] = await Promise.all([
    supabase.from('Contact').select('*', { count: 'exact', head: true }),
    supabase.from('Campaign').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
    supabase.from('EmailEvent').select('eventType'),
    supabase.from('Contact').select('provider'),
    supabase.from('EmailEvent').select('*, contact:Contact(*)').order('timestamp', { ascending: false }).limit(10)
  ]);

  const eventMap: Record<string, number> = {};
  let totalEvents = 0;
  
  if (events) {
    events.forEach(e => {
      eventMap[e.eventType] = (eventMap[e.eventType] || 0) + 1;
      totalEvents++;
    });
  }

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
  const totalComplaints = eventMap["COMPLAINED"] ?? 0;

  return {
    totalContacts: totalContacts || 0,
    activeCampaigns: activeCampaigns || 0,
    totalSent,
    totalDelivered,
    totalOpened,
    totalClicked,
    totalBounced,
    totalComplaints,
    openRate: calcPercentage(totalOpened, totalDelivered),
    clickRate: calcPercentage(totalClicked, totalOpened),
    bounceRate: calcPercentage(totalBounced, totalSent),
    providerCounts: Object.entries(providerMap).map(([provider, count]) => ({
      provider,
      count,
    })),
    recentEvents: (recentEventsData || []).map((event: any) => ({
      ...event,
      contact: event.contact
    })),
    eventMap,
    totalEvents,
  };
}

function calcPercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 1000) / 10;
}
