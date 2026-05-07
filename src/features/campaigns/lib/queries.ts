/**
 * Campaign queries — Busca de campanhas usando o SDK oficial do Supabase.
 * Refatorado para máxima estabilidade via HTTPS.
 */
import { supabase } from "@/shared/lib/supabase";

export async function getCampaigns() {
  const { data: campaigns, error } = await supabase
    .from('Campaign')
    .select(`
      *,
      steps:CampaignStep(id, stepOrder, subject),
      campaignContacts:CampaignContact(count)
    `)
    .order('createdAt', { ascending: false });

  if (error) {
    console.error('Erro ao buscar campanhas:', error);
    return [];
  }

  return (campaigns || []).map(campaign => ({
    ...campaign,
    _count: {
      campaignContacts: campaign.campaignContacts?.[0]?.count || 0
    }
  }));
}

export async function getCampaignById(id: string) {
  const { data, error } = await supabase
    .from('Campaign')
    .select(`
      *,
      steps:CampaignStep(*),
      campaignContacts:CampaignContact(
        *,
        contact:Contact(id, email, name, provider, status),
        currentStep:CampaignStep(stepOrder, subject)
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Erro ao buscar campanha ${id}:`, error);
    return null;
  }

  if (data?.steps) {
    data.steps.sort((a: any, b: any) => a.stepOrder - b.stepOrder);
  }

  return data;
}

export async function getCampaignAnalytics(campaignId: string) {
  const [
    { data: contacts, error: contactError },
    { data: events, error: eventError }
  ] = await Promise.all([
    supabase.from('CampaignContact').select('stepStatus').eq('campaignId', campaignId),
    supabase.from('EmailEvent').select('eventType').eq('contact:Contact(campaignContacts!inner(campaignId))', campaignId)
  ]);

  if (contactError || eventError) {
    console.error('Erro ao buscar analytics da campanha:', contactError || eventError);
    return { statusCounts: {}, eventCounts: {}, totalContacts: 0 };
  }

  const statusCounts: Record<string, number> = {};
  if (contacts) {
    for (const c of contacts) {
      statusCounts[c.stepStatus] = (statusCounts[c.stepStatus] ?? 0) + 1;
    }
  }

  const eventCounts: Record<string, number> = {};
  if (events) {
    for (const e of events) {
      eventCounts[e.eventType] = (eventCounts[e.eventType] ?? 0) + 1;
    }
  }

  return { statusCounts, eventCounts, totalContacts: contacts?.length || 0 };
}
