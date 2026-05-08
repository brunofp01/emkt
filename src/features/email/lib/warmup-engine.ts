/**
 * Warmup Engine — Sistema de Aquecimento Progressivo por Conta
 * 
 * O Gmail monitora o volume de envio de cada conta. Uma conta nova que
 * envia centenas de emails de uma vez é instantaneamente marcada como spam.
 * 
 * Este módulo implementa um sistema de 3 níveis (tiers) com limites
 * progressivos que imitam o comportamento de um remetente legítimo
 * construindo reputação gradualmente.
 * 
 * Níveis:
 *   NOVA       → Conta recém-cadastrada (warmup ativo, limites conservadores)
 *   AQUECIDA   → Conta com 2+ semanas de envio saudável (limites médios)
 *   VETERANA   → Conta com 4+ semanas e boa reputação (limites máximos)
 */

import { supabaseAdmin } from "@/shared/lib/supabase";

/** Definição dos tiers e seus limites diários */
export const ACCOUNT_TIERS = {
  NOVA: {
    label: "Nova",
    description: "Em warmup — limites conservadores",
    /** Limites por semana desde a criação: [semana1, semana2, ...] */
    weeklyLimits: [20, 35, 50, 75],
    /** Delay mínimo entre emails (segundos) */
    minDelaySec: 60,
    /** Delay máximo entre emails (segundos) */
    maxDelaySec: 120,
    /** Semanas necessárias para promover ao próximo tier */
    weeksToPromote: 2,
    /** Taxa máxima de bounce antes de desativar (%) */
    maxBounceRate: 5,
  },
  AQUECIDA: {
    label: "Aquecida",
    description: "Intermediária — volume moderado",
    weeklyLimits: [100, 150, 200, 300],
    minDelaySec: 30,
    maxDelaySec: 90,
    weeksToPromote: 4,
    maxBounceRate: 8,
  },
  VETERANA: {
    label: "Veterana",
    description: "Conta estabelecida — volume total",
    weeklyLimits: [500], // Usa o dailyLimit configurado
    minDelaySec: 15,
    maxDelaySec: 45,
    weeksToPromote: Infinity,
    maxBounceRate: 10,
  },
} as const;

export type AccountTier = keyof typeof ACCOUNT_TIERS;

/**
 * Calcula o limite diário efetivo de uma conta considerando o tier e 
 * o tempo desde o início do warmup.
 */
export function getEffectiveDailyLimit(
  configuredLimit: number,
  tier: AccountTier,
  warmupStartedAt: Date
): number {
  const tierConfig = ACCOUNT_TIERS[tier];
  
  // Veterana usa o limite configurado pelo usuário
  if (tier === "VETERANA") {
    return configuredLimit;
  }

  const now = new Date();
  const msSinceStart = now.getTime() - warmupStartedAt.getTime();
  const weeksSinceStart = Math.floor(msSinceStart / (7 * 24 * 60 * 60 * 1000));

  const limits = tierConfig.weeklyLimits;
  const weekIndex = Math.min(weeksSinceStart, limits.length - 1);
  const warmupLimit = limits[weekIndex];

  // Nunca exceder o limite configurado pelo usuário
  return Math.min(warmupLimit, configuredLimit);
}

/**
 * Calcula o delay aleatório (jitter) entre envios para uma conta,
 * baseado no seu tier. Retorna o delay em segundos.
 */
export function getSendDelay(tier: AccountTier): number {
  const config = ACCOUNT_TIERS[tier];
  const range = config.maxDelaySec - config.minDelaySec;
  return config.minDelaySec + Math.floor(Math.random() * range);
}

/**
 * Calcula a taxa de bounce de uma conta.
 */
export function getBounceRate(totalSent: number, totalBounces: number): number {
  if (totalSent === 0) return 0;
  return (totalBounces / totalSent) * 100;
}

/**
 * Verifica se uma conta deve ser automaticamente desativada por problemas de reputação.
 * Critérios:
 *   - Taxa de bounce acima do máximo permitido para o tier
 *   - Mais de 3 complaints
 *   - Mínimo de 10 envios para não desativar por falsos positivos
 */
export function shouldDeactivateAccount(
  tier: AccountTier,
  totalSent: number,
  totalBounces: number,
  totalComplaints: number
): { deactivate: boolean; reason?: string } {
  // Não avaliar contas com menos de 10 envios
  if (totalSent < 10) return { deactivate: false };

  const bounceRate = getBounceRate(totalSent, totalBounces);
  const maxRate = ACCOUNT_TIERS[tier].maxBounceRate;

  if (bounceRate > maxRate) {
    return { 
      deactivate: true, 
      reason: `Taxa de bounce ${bounceRate.toFixed(1)}% excede o limite de ${maxRate}% para conta ${tier}` 
    };
  }

  if (totalComplaints >= 3) {
    return { 
      deactivate: true, 
      reason: `${totalComplaints} complaints recebidos — conta comprometida` 
    };
  }

  return { deactivate: false };
}

/**
 * Determina o novo tier de uma conta baseado no tempo e desempenho.
 * Chamada periodicamente para promover contas saudáveis.
 */
export function determineAccountTier(
  currentTier: AccountTier,
  warmupStartedAt: Date,
  totalSent: number,
  totalBounces: number,
  totalComplaints: number
): AccountTier {
  if (currentTier === "VETERANA") return "VETERANA";

  const now = new Date();
  const msSinceStart = now.getTime() - warmupStartedAt.getTime();
  const weeksSinceStart = Math.floor(msSinceStart / (7 * 24 * 60 * 60 * 1000));

  const bounceRate = getBounceRate(totalSent, totalBounces);

  // Condições para promoção:
  // 1. Tempo mínimo cumprido
  // 2. Taxa de bounce abaixo de 3% (saudável)
  // 3. Sem complaints
  // 4. Pelo menos alguns envios realizados
  const isHealthy = bounceRate < 3 && totalComplaints === 0 && totalSent >= 5;

  if (currentTier === "NOVA" && weeksSinceStart >= 2 && isHealthy) {
    return "AQUECIDA";
  }

  if (currentTier === "AQUECIDA" && weeksSinceStart >= 4 && isHealthy) {
    return "VETERANA";
  }

  return currentTier;
}

/**
 * Verifica e atualiza o tier de uma conta se necessário.
 * Retorna o tier atualizado.
 */
export async function checkAndUpdateTier(providerId: string): Promise<AccountTier> {
  const { data: config } = await supabaseAdmin
    .from('ProviderConfig')
    .select('accountTier, warmupStartedAt, totalSent, totalBounces, totalComplaints')
    .eq('provider', providerId)
    .single();

  if (!config) return "NOVA";

  const currentTier = config.accountTier as AccountTier;
  const newTier = determineAccountTier(
    currentTier,
    new Date(config.warmupStartedAt),
    config.totalSent,
    config.totalBounces,
    config.totalComplaints
  );

  if (newTier !== currentTier) {
    await supabaseAdmin
      .from('ProviderConfig')
      .update({ 
        accountTier: newTier,
        updatedAt: new Date().toISOString()
      })
      .eq('provider', providerId);
    
    console.log(`[WarmupEngine] Conta ${providerId} promovida: ${currentTier} → ${newTier}`);
  }

  return newTier;
}

/**
 * Incrementa contadores de reputação para uma conta.
 */
export async function recordSendResult(
  providerId: string, 
  outcome: "sent" | "bounced" | "complained"
): Promise<void> {
  const updates: Record<string, any> = {
    updatedAt: new Date().toISOString(),
  };

  if (outcome === "sent") {
    // Usamos RPC para incremento atômico, com fallback
    const { error } = await supabaseAdmin.rpc('increment_total_sent', { provider_name: providerId });
    if (error) {
      const { data } = await supabaseAdmin
        .from('ProviderConfig')
        .select('totalSent')
        .eq('provider', providerId)
        .single();
      if (data) {
        await supabaseAdmin
          .from('ProviderConfig')
          .update({ totalSent: data.totalSent + 1, ...updates })
          .eq('provider', providerId);
      }
    }
    return;
  }

  if (outcome === "bounced") {
    const { data } = await supabaseAdmin
      .from('ProviderConfig')
      .select('totalBounces')
      .eq('provider', providerId)
      .single();
    if (data) {
      updates.totalBounces = data.totalBounces + 1;
    }
  }

  if (outcome === "complained") {
    const { data } = await supabaseAdmin
      .from('ProviderConfig')
      .select('totalComplaints')
      .eq('provider', providerId)
      .single();
    if (data) {
      updates.totalComplaints = data.totalComplaints + 1;
    }
  }

  await supabaseAdmin
    .from('ProviderConfig')
    .update(updates)
    .eq('provider', providerId);
}
