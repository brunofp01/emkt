/**
 * Campaign queries — Busca de campanhas usando o SDK oficial do Supabase.
 * Refatorado para máxima estabilidade via HTTPS.
 */
import { supabase } from "@/shared/lib/supabase";
import { fetchAll } from "@/shared/lib/supabase-utils";

export async function getCampaigns() {
  // 1. Buscar todas as campanhas
  const { data: campaigns, error } = await supabase
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

  // 2. Buscar todos os contatos vinculados a campanhas para calcular métricas reais
  // Usamos fetchAll para garantir que pegamos todos (bypassing o limite de 1000)
  const allCampaignContacts = await fetchAll<any>(
    supabase.from('CampaignContact').select('campaignId, stepStatus')
  );

  // 3. Mapear métricas para cada campanha
  return campaigns.map(campaign => {
    const myContacts = allCampaignContacts.filter((cc: any) => cc.campaignId === campaign.id);
    const sentCount = myContacts.filter((cc: any) => 
      ['SENT', 'DELIVERED', 'OPENED', 'CLICKED'].includes(cc.stepStatus)
    ).length;

    return {
      ...campaign,
      _count: {
        campaignContacts: myContacts.length,
        sent: sentCount
      }
    };
  });
}

export async function getCampaignById(id: string) {
  const { data, error } = await supabase
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

  // Buscar contatos da campanha separadamente para evitar o limite de 1000 e erros de tipos
  const campaignContacts = await fetchAll<any>(
    supabase
      .from('CampaignContact')
      .select(`
        *,
        contact:Contact(id, email, name, provider, status),
        currentStep:CampaignStep(stepOrder, subject)
      `)
      .eq('campaignId', id)
  );

  data.campaignContacts = campaignContacts || [];


  if (data?.steps) {
    data.steps.sort((a: any, b: any) => a.stepOrder - b.stepOrder);
  }

  return data;
}

export async function getCampaignAnalytics(campaignId: string) {
  // 1. Buscar IDs dos contatos nesta campanha
  const campaignContacts = await fetchAll<any>(
    supabase
      .from('CampaignContact')
      .select('contactId, stepStatus')
      .eq('campaignId', campaignId)
  );

  if (!campaignContacts || campaignContacts.length === 0) {
    return { statusCounts: {}, eventCounts: {}, totalContacts: 0 };
  }

  const contactIds = campaignContacts.map((c: any) => c.contactId);

  // 2. Calcular status counts
  const statusCounts: Record<string, number> = {};
  for (const c of campaignContacts as any[]) {
    statusCounts[c.stepStatus] = (statusCounts[c.stepStatus] ?? 0) + 1;
  }

  // 3. Buscar eventos apenas dos contatos desta campanha
  const eventCounts: Record<string, number> = {};
  if (contactIds.length > 0) {
    const events = await fetchAll<any>(
      supabase
        .from('EmailEvent')
        .select('eventType')
        .in('contactId', contactIds)
    );

    if (events) {
      for (const e of events as any[]) {
        eventCounts[e.eventType] = (eventCounts[e.eventType] ?? 0) + 1;
      }
    }
  }

  return { statusCounts, eventCounts, totalContacts: campaignContacts.length };
}
