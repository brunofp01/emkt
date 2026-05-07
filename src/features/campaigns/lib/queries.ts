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
  // 1. Buscar IDs dos contatos nesta campanha
  const { data: campaignContacts, error: ccError } = await supabase
    .from('CampaignContact')
    .select('contactId, stepStatus')
    .eq('campaignId', campaignId);

  if (ccError || !campaignContacts) {
    console.error('Erro ao buscar contacts da campanha:', ccError);
    return { statusCounts: {}, eventCounts: {}, totalContacts: 0 };
  }

  const contactIds = campaignContacts.map(c => c.contactId);

  // 2. Calcular status counts
  const statusCounts: Record<string, number> = {};
  for (const c of campaignContacts) {
    statusCounts[c.stepStatus] = (statusCounts[c.stepStatus] ?? 0) + 1;
  }

  // 3. Buscar eventos apenas dos contatos desta campanha
  const eventCounts: Record<string, number> = {};
  if (contactIds.length > 0) {
    const { data: events, error: eventError } = await supabase
      .from('EmailEvent')
      .select('eventType')
      .in('contactId', contactIds);

    if (!eventError && events) {
      for (const e of events) {
        eventCounts[e.eventType] = (eventCounts[e.eventType] ?? 0) + 1;
      }
    }
  }

  return { statusCounts, eventCounts, totalContacts: campaignContacts.length };
}
