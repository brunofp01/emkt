/**
 * Provider Selector — Fila Ordenada Fixa: BREVO → RESEND → MAILGUN
 * Cada novo contato recebe o próximo provedor da fila, ciclicamente.
 */
import { supabaseAdmin } from "@/shared/lib/supabase";
import type { EmailProvider } from "@/shared/types";

/**
 * Ordem fixa dos provedores. O sistema percorre essa fila ciclicamente.
 * Para adicionar/remover um provedor, basta editar esta lista.
 */
const PROVIDER_ORDER: EmailProvider[] = ["BREVO", "RESEND", "MAILGUN"];

/**
 * Busca a lista de provedores ativos no banco e retorna apenas os que
 * estão na fila E estão ativos, preservando a ordem de PROVIDER_ORDER.
 */
async function getActiveOrderedProviders(): Promise<EmailProvider[]> {
  const { data: configs, error } = await supabaseAdmin
    .from('ProviderConfig')
    .select('provider')
    .eq('isActive', true);

  if (error) throw error;
  if (!configs || configs.length === 0) {
    throw new Error("Nenhum provedor de email ativo no banco (tabela ProviderConfig).");
  }

  const activeSet = new Set(configs.map(c => c.provider));
  return PROVIDER_ORDER.filter(p => activeSet.has(p));
}

/**
 * Conta quantos contatos já existem para cada provedor ativo.
 */
async function getProviderCounts(providers: EmailProvider[]): Promise<Map<string, number>> {
  const countMap = new Map<string, number>();
  
  // Inicializa todos com 0
  providers.forEach(p => countMap.set(p, 0));

  // Tenta usar RPC primeiro (mais rápido)
  const { data: distribution, error } = await supabaseAdmin.rpc('get_provider_distribution');
  
  if (!error && distribution) {
    distribution.forEach((item: any) => {
      if (countMap.has(item.provider)) {
        countMap.set(item.provider, Number(item.count));
      }
    });
  }

  return countMap;
}

/**
 * Seleciona o próximo provedor da fila ordenada.
 * Conta quantos contatos existem no total e pega o próximo da fila.
 * Ex: Se temos 5 contatos e 3 provedores, o próximo é o índice 5 % 3 = 2 (MAILGUN).
 */
export async function selectProviderForNewContact(): Promise<EmailProvider> {
  const orderedProviders = await getActiveOrderedProviders();
  const countMap = await getProviderCounts(orderedProviders);

  // Total de contatos já distribuídos
  let totalContacts = 0;
  countMap.forEach(count => totalContacts += count);

  // O próximo provedor é o que está na posição (totalContacts % numProviders)
  const nextIndex = totalContacts % orderedProviders.length;
  const selected = orderedProviders[nextIndex];

  console.log(`[ProviderSelector] Total contatos: ${totalContacts}, Próximo índice: ${nextIndex}, Selecionado: ${selected}`);
  console.log(`[ProviderSelector] Distribuição atual:`, Object.fromEntries(countMap));

  return selected;
}

/**
 * Distribui N provedores para um lote de contatos em fila ordenada.
 * Ex: Para 6 contatos: BREVO, RESEND, MAILGUN, BREVO, RESEND, MAILGUN
 */
export async function assignProvidersToContacts(count: number): Promise<EmailProvider[]> {
  const orderedProviders = await getActiveOrderedProviders();
  const countMap = await getProviderCounts(orderedProviders);

  let totalContacts = 0;
  countMap.forEach(c => totalContacts += c);

  const results: EmailProvider[] = [];
  for (let i = 0; i < count; i++) {
    const index = (totalContacts + i) % orderedProviders.length;
    results.push(orderedProviders[index]);
  }

  console.log(`[ProviderSelector] Lote de ${count} contatos distribuído:`, results);
  return results;
}

/**
 * Verifica limites diários com reset automático.
 */
export async function canProviderSendToday(provider: EmailProvider): Promise<boolean> {
  const { data: config, error } = await supabaseAdmin
    .from('ProviderConfig')
    .select('*')
    .eq('provider', provider)
    .single();

  if (error || !config) {
    console.error("[canProviderSendToday] Error or config not found:", error, "Provider:", provider);
    return false;
  }
  
  if (!config.isActive) {
    console.log(`[canProviderSendToday] Provider ${provider} is not active.`);
    return false;
  }

  const now = new Date();
  const lastReset = new Date(config.lastResetAt);
  const isNewDay = now.toDateString() !== lastReset.toDateString();

  if (isNewDay) {
    await supabaseAdmin
      .from('ProviderConfig')
      .update({ sentToday: 0, lastResetAt: now.toISOString() })
      .eq('provider', provider);
    return true;
  }

  return config.sentToday < config.dailyLimit;
}

/**
 * Incremento ATÔMICO via RPC (Evita Race Conditions).
 */
export async function incrementProviderSendCount(provider: EmailProvider): Promise<void> {
  const { error } = await supabaseAdmin.rpc('increment_provider_count', { 
    provider_name: provider 
  });

  // Fallback caso o RPC não exista
  if (error) {
    console.warn("RPC increment_provider_count não encontrado, usando fallback não-atômico.");
    const { data: config } = await supabaseAdmin
      .from('ProviderConfig')
      .select('sentToday')
      .eq('provider', provider)
      .single();

    if (config) {
      await supabaseAdmin
        .from('ProviderConfig')
        .update({ sentToday: config.sentToday + 1 })
        .eq('provider', provider);
    }
  }
}
