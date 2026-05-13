/**
 * Provider Selector — Roleta de Provedores na Saída
 * 
 * O sistema seleciona o melhor provedor ATIVO no momento do envio,
 * distribuindo emails de forma inteligente entre todas as contas.
 * 
 * Critérios de seleção:
 *   - Score de reputação (menos bounces = mais prioridade)
 *   - Peso configurado por conta
 *   - Capacidade disponível (limite diário com warmup)
 *   - Rotação para evitar concentração
 */
import { supabaseAdmin } from "@/shared/lib/supabase";
import { getEffectiveDailyLimit, type AccountTier } from "@/features/email/lib/warmup-engine";

/**
 * Calcula o score de reputação de um provedor (0-100).
 * Score mais alto = conta mais saudável = deve receber mais envios.
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
 * Seleciona o próximo provedor para envio usando roleta ponderada.
 * Verifica capacidade disponível (limite diário) antes de selecionar.
 * 
 * Esta é a função principal chamada pelo send-email no momento do disparo.
 */
export async function selectProviderForSend(): Promise<{
  providerId: string;
  providerConfig: any;
}> {
  const { data: configs, error } = await supabaseAdmin
    .from('ProviderConfig')
    .select('*')
    .eq('isActive', true)
    .order('createdAt', { ascending: true });

  if (error) throw error;
  if (!configs || configs.length === 0) {
    throw new Error("Nenhum provedor de email ativo.");
  }

  // Filtrar provedores que ainda têm capacidade hoje
  const now = new Date();
  const available: typeof configs = [];

  for (const config of configs) {
    const lastReset = new Date(config.lastResetAt);
    const isNewDay = now.toDateString() !== lastReset.toDateString();
    
    let currentSent = config.sentToday || 0;
    if (isNewDay) {
      currentSent = 0; // Será resetado no envio
    }

    const effectiveLimit = getEffectiveDailyLimit(
      config.dailyLimit,
      (config.accountTier || 'NOVA') as AccountTier,
      new Date(config.warmupStartedAt || config.createdAt)
    );

    if (currentSent < effectiveLimit) {
      available.push(config);
    }
  }

  if (available.length === 0) {
    // Nenhum provedor com capacidade — lançar erro para Inngest reagendar
    // NUNCA forçar envio além do limite (causa bloqueio de conta)
    throw new Error("ALL_PROVIDERS_EXHAUSTED: Todos os provedores atingiram o limite diário. Inngest vai reagendar automaticamente.");
  }

  // Round-robin DETERMINÍSTICO: selecionar o provedor com menor sentToday
  // Garante distribuição perfeitamente igual (1:1:1) entre provedores
  available.sort((a, b) => (a.sentToday || 0) - (b.sentToday || 0));
  const selected = available[0];
  
  console.log(`[ProviderSelector] Round-robin: ${selected.provider} (sentToday=${selected.sentToday}, ${available.length} disponíveis)`);
  return { providerId: selected.provider, providerConfig: selected };
}

/**
 * Legacy: Seleciona provedor para um novo contato.
 * Mantido para compatibilidade mas agora retorna "AUTO" por padrão.
 */
export async function selectProviderForNewContact(): Promise<string> {
  return "AUTO";
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
