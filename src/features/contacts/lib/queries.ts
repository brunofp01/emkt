/**
 * Contact queries — Busca de contatos usando o SDK oficial do Supabase.
 * Refatorado para máxima estabilidade em ambiente Serverless (Vercel).
 */
import { supabase } from "@/shared/lib/supabase";
import type { EmailProvider, ContactStatus } from "@prisma/client";

export interface ContactFilters {
  search?: string;
  provider?: EmailProvider;
  status?: ContactStatus;
  page?: number;
  perPage?: number;
}

const DEFAULT_PER_PAGE = 20;

/**
 * Lista contatos com filtros, paginação e busca via HTTPS.
 */
export async function getContacts(filters: ContactFilters = {}) {
  const {
    search,
    provider,
    status,
    page = 1,
    perPage = DEFAULT_PER_PAGE,
  } = filters;

  let query = supabase.from('Contact').select('*, campaignContacts:CampaignContact(*, campaign:Campaign(name), currentStep:CampaignStep(stepOrder)), emailEvents:EmailEvent(eventType, timestamp)', { count: 'exact' });

  if (search) {
    query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%,company.ilike.%${search}%`);
  }

  if (provider) {
    query = query.eq('provider', provider);
  }

  if (status) {
    query = query.eq('status', status);
  }

  const start = (page - 1) * perPage;
  const end = start + perPage - 1;

  const { data: contacts, count: total, error } = await query
    .order('createdAt', { ascending: false })
    .range(start, end);

  if (error) {
    console.error('Erro ao buscar contatos:', error);
    return { contacts: [], total: 0, page, perPage, totalPages: 0 };
  }

  return {
    contacts: contacts || [],
    total: total || 0,
    page,
    perPage,
    totalPages: Math.ceil((total || 0) / perPage),
  };
}

/**
 * Busca um contato pelo ID com todos os relacionamentos via HTTPS.
 */
export async function getContactById(id: string) {
  const { data, error } = await supabase
    .from('Contact')
    .select(`
      *,
      campaignContacts:CampaignContact(
        *,
        campaign:Campaign(*),
        currentStep:CampaignStep(*)
      ),
      emailEvents:EmailEvent(*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Erro ao buscar contato ${id}:`, error);
    return null;
  }

  return data;
}

/**
 * Conta contatos por provedor (para analytics).
 */
export async function getContactCountsByProvider() {
  const { data, error } = await supabase
    .from('Contact')
    .select('provider');

  if (error) {
    console.error('Erro ao contar contatos por provedor:', error);
    return [];
  }

  const counts: Record<string, number> = {};
  data.forEach(p => {
    counts[p.provider] = (counts[p.provider] || 0) + 1;
  });

  return Object.entries(counts).map(([provider, count]) => ({
    provider,
    _count: { _all: count }
  }));
}
