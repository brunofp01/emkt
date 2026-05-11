/**
 * Campaign queries — Busca de campanhas usando supabaseAdmin (bypass RLS).
 * 
 * IMPORTANTE: Todas as queries server-side DEVEM usar supabaseAdmin.
 * O cliente anon (supabase) não consegue ler dados gravados pelo Inngest
 * quando RLS está habilitado, resultando em contagens zeradas.
 */
import { supabaseAdmin } from "@/shared/lib/supabase";

export async function getCampaigns() {
  // 1. Buscar campanhas
  const { data: campaigns, error } = await supabaseAdmin
    .from('Campaign')
    .select(`
      *,
      steps:CampaignStep(id, stepOrder, subject)
    `)
    .order('createdAt', { ascending: false });

  if (error || !campaigns) {
    console.error('Erro ao buscar campanhas:', error);
    return [];
  }

  // 2. Para cada campanha, buscar contagens via COUNT (instantâneo, sem baixar dados)
  const campaignsWithCounts = await Promise.all(
    campaigns.map(async (campaign) => {
      const [
        { count: totalContacts },
        { count: sentCount }
      ] = await Promise.all([
        supabaseAdmin
          .from('CampaignContact')
          .select('*', { count: 'exact', head: true })
          .eq('campaignId', campaign.id),
        supabaseAdmin
          .from('CampaignContact')
          .select('*', { count: 'exact', head: true })
          .eq('campaignId', campaign.id)
          .in('stepStatus', ['SENT', 'DELIVERED', 'OPENED', 'CLICKED']),
      ]);

      return {
        ...campaign,
        _count: {
          campaignContacts: totalContacts || 0,
          sent: sentCount || 0
        }
      };
    })
  );

  return campaignsWithCounts;
}

export async function getCampaignById(id: string) {
  const { data, error } = await supabaseAdmin
    .from('Campaign')
    .select(`
      *,
      steps:CampaignStep(*)
    `)
    .eq('id', id)
    .single();

  if (error || !data) {
    console.error(`Erro ao buscar campanha ${id}:`, error);
    return null;
  }

  if (data?.steps) {
    data.steps.sort((a: any, b: any) => a.stepOrder - b.stepOrder);
  }

  return data;
}

export async function getCampaignAnalytics(campaignId: string) {
  // 1. Buscar contagens por status via SQL COUNT (sem baixar dados)
  const [
    { count: totalContacts },
    { count: sentCount },
    { count: deliveredCount },
    { count: openedCount },
    { count: clickedCount },
    { count: bouncedCount },
    { count: failedCount },
    { count: queuedCount },
  ] = await Promise.all([
    supabaseAdmin.from('CampaignContact').select('*', { count: 'exact', head: true }).eq('campaignId', campaignId),
    supabaseAdmin.from('CampaignContact').select('*', { count: 'exact', head: true }).eq('campaignId', campaignId).eq('stepStatus', 'SENT'),
    supabaseAdmin.from('CampaignContact').select('*', { count: 'exact', head: true }).eq('campaignId', campaignId).eq('stepStatus', 'DELIVERED'),
    supabaseAdmin.from('CampaignContact').select('*', { count: 'exact', head: true }).eq('campaignId', campaignId).eq('stepStatus', 'OPENED'),
    supabaseAdmin.from('CampaignContact').select('*', { count: 'exact', head: true }).eq('campaignId', campaignId).eq('stepStatus', 'CLICKED'),
    supabaseAdmin.from('CampaignContact').select('*', { count: 'exact', head: true }).eq('campaignId', campaignId).eq('stepStatus', 'BOUNCED'),
    supabaseAdmin.from('CampaignContact').select('*', { count: 'exact', head: true }).eq('campaignId', campaignId).eq('stepStatus', 'FAILED'),
    supabaseAdmin.from('CampaignContact').select('*', { count: 'exact', head: true }).eq('campaignId', campaignId).in('stepStatus', ['QUEUED', 'PENDING']),
  ]);

  const statusCounts: Record<string, number> = {
    QUEUED: queuedCount || 0,
    SENT: sentCount || 0,
    DELIVERED: deliveredCount || 0,
    OPENED: openedCount || 0,
    CLICKED: clickedCount || 0,
    BOUNCED: bouncedCount || 0,
    FAILED: failedCount || 0,
  };

  // 2. Buscar contagens de eventos via SQL COUNT
  const [
    { count: eventSent },
    { count: eventDelivered },
    { count: eventOpened },
    { count: eventClicked },
  ] = await Promise.all([
    supabaseAdmin.from('EmailEvent').select('*', { count: 'exact', head: true }).eq('eventType', 'SENT'),
    supabaseAdmin.from('EmailEvent').select('*', { count: 'exact', head: true }).eq('eventType', 'DELIVERED'),
    supabaseAdmin.from('EmailEvent').select('*', { count: 'exact', head: true }).eq('eventType', 'OPENED'),
    supabaseAdmin.from('EmailEvent').select('*', { count: 'exact', head: true }).eq('eventType', 'CLICKED'),
  ]);

  const eventCounts: Record<string, number> = {
    SENT: eventSent || 0,
    DELIVERED: eventDelivered || 0,
    OPENED: eventOpened || 0,
    CLICKED: eventClicked || 0,
  };

  return { statusCounts, eventCounts, totalContacts: totalContacts || 0 };
}
