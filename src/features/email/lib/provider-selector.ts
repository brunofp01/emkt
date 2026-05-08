/**
 * Provider Selector — Balanceador Dinâmico (Fase 8)
 * O sistema busca os provedores ativos no banco de dados e distribui contatos
 * de forma circular entre eles. Suporta contas infinitas (ex: múltiplos Gmails).
 */
import { supabaseAdmin } from "@/shared/lib/supabase";

/**
 * Busca a lista de IDs dos provedores ativos no banco.
 * A ordem é determinada pelo ID ou Data de Criação, garantindo determinismo.
 */
async function getActiveOrderedProviders(): Promise<string[]> {
  const { data: configs, error } = await supabaseAdmin
    .from('ProviderConfig')
    .select('provider')
    .eq('isActive', true)
    .order('createdAt', { ascending: true });

  if (error) throw error;
  if (!configs || configs.length === 0) {
    throw new Error("Nenhum provedor de email ativo no banco (tabela ProviderConfig).");
  }

  return configs.map(c => c.provider);
}

/**
 * Conta quantos contatos já existem para cada provedor ativo.
 */
async function getProviderCounts(providers: string[]): Promise<Map<string, number>> {
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
 */
export async function selectProviderForNewContact(): Promise<string> {
  const orderedProviders = await getActiveOrderedProviders();
  const countMap = await getProviderCounts(orderedProviders);

  let totalContacts = 0;
  countMap.forEach(count => totalContacts += count);

  const nextIndex = totalContacts % orderedProviders.length;
  const selected = orderedProviders[nextIndex];

  console.log(`[ProviderSelector] Total contatos: ${totalContacts}, Próximo: ${nextIndex}, Selecionado: ${selected}`);
  return selected;
}

/**
 * Distribui N provedores para um lote de contatos em fila ordenada.
 */
export async function assignProvidersToContacts(count: number): Promise<string[]> {
  const orderedProviders = await getActiveOrderedProviders();
  const countMap = await getProviderCounts(orderedProviders);

  let totalContacts = 0;
  countMap.forEach(c => totalContacts += c);

  const results: string[] = [];
  for (let i = 0; i < count; i++) {
    const index = (totalContacts + i) % orderedProviders.length;
    results.push(orderedProviders[index]);
  }

  console.log(`[ProviderSelector] Lote de ${count} contatos distribuído.`);
  return results;
}

/**
 * Verifica limites diários com reset automático.
 */
export async function canProviderSendToday(provider: string): Promise<boolean> {
  const { data: config, error } = await supabaseAdmin
    .from('ProviderConfig')
    .select('*')
    .eq('provider', provider)
    .single();

  if (error || !config) return false;
  if (!config.isActive) return false;

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
export async function incrementProviderSendCount(provider: string): Promise<void> {
  const { error } = await supabaseAdmin.rpc('increment_provider_count', { 
    provider_name: provider 
  });

  if (error) {
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
