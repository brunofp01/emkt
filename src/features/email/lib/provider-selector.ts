/**
 * Provider Selector — Balanceador Dinâmico com Score de Reputação
 * 
 * O sistema busca os provedores ativos no banco de dados e distribui contatos
 * de forma inteligente, priorizando contas com melhor reputação.
 * 
 * Melhorias de deliverability:
 *   - Rotação ponderada por score de reputação (menos bounces = mais prioridade)
 *   - Integração com warmup engine para limites diários efetivos
 *   - Reset automático com tracking de tier
 */
import { supabaseAdmin } from "@/shared/lib/supabase";
import { getEffectiveDailyLimit, type AccountTier } from "@/features/email/lib/warmup-engine";

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
 * Calcula o score de reputação de um provedor (0-100).
 * Score mais alto = conta mais saudável = deve receber mais contatos.
 */
function calculateReputationScore(config: {
  totalSent: number;
  totalBounces: number;
  totalComplaints: number;
  accountTier: string;
}): number {
  let score = 100;

  // Penalizar por bounces (até -40 pontos)
  if (config.totalSent > 0) {
    const bounceRate = (config.totalBounces / config.totalSent) * 100;
    score -= Math.min(bounceRate * 4, 40);
  }

  // Penalizar por complaints (cada um vale -15 pontos)
  score -= config.totalComplaints * 15;

  // Bônus por tier: contas veteranas têm vantagem
  if (config.accountTier === "VETERANA") score += 10;
  if (config.accountTier === "AQUECIDA") score += 5;

  return Math.max(0, Math.min(100, score));
}

/**
 * Seleciona o próximo provedor usando rotação ponderada por reputação.
 * Contas com melhor score recebem mais contatos.
 */
export async function selectProviderForNewContact(): Promise<string> {
  const { data: configs, error } = await supabaseAdmin
    .from('ProviderConfig')
    .select('provider, totalSent, totalBounces, totalComplaints, accountTier, weight')
    .eq('isActive', true)
    .order('createdAt', { ascending: true });

  if (error) throw error;
  if (!configs || configs.length === 0) {
    throw new Error("Nenhum provedor de email ativo.");
  }

  // Para uma única conta, retornar direto
  if (configs.length === 1) return configs[0].provider;

  // Calcular peso ponderado (weight configurado × score de reputação)
  const weighted = configs.map(c => ({
    provider: c.provider,
    score: calculateReputationScore(c),
    weight: c.weight || 25,
    effectiveWeight: 0,
  }));

  // Peso efetivo = weight × (score/100)
  weighted.forEach(w => {
    w.effectiveWeight = w.weight * (w.score / 100);
  });

  const totalWeight = weighted.reduce((sum, w) => sum + w.effectiveWeight, 0);

  if (totalWeight === 0) {
    // Fallback: round-robin simples se todos os scores são 0
    const countMap = await getProviderCounts(configs.map(c => c.provider));
    let totalContacts = 0;
    countMap.forEach(count => totalContacts += count);
    const nextIndex = totalContacts % configs.length;
    return configs[nextIndex].provider;
  }

  // Seleção aleatória ponderada
  const random = Math.random() * totalWeight;
  let cumulative = 0;
  for (const w of weighted) {
    cumulative += w.effectiveWeight;
    if (random <= cumulative) {
      console.log(`[ProviderSelector] Selecionado: ${w.provider} (score: ${w.score}, weight: ${w.effectiveWeight.toFixed(1)})`);
      return w.provider;
    }
  }

  // Fallback improvável
  return weighted[weighted.length - 1].provider;
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
 * Verifica limites diários com reset automático e suporte a warmup.
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
      .update({ sentToday: 0, lastResetAt: now.toISOString(), updatedAt: now.toISOString() })
      .eq('provider', provider);
    return true;
  }

  // Usar limite efetivo do warmup
  const effectiveLimit = getEffectiveDailyLimit(
    config.dailyLimit,
    (config.accountTier || 'NOVA') as AccountTier,
    new Date(config.warmupStartedAt || config.createdAt)
  );

  return config.sentToday < effectiveLimit;
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
        .update({ sentToday: config.sentToday + 1, updatedAt: new Date().toISOString() })
        .eq('provider', provider);
    }
  }
}
