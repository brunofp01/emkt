/**
 * Provider Selector — Lógica de Weighted Round-Robin Otimizada (Auditada).
 */
import { supabaseAdmin } from "@/shared/lib/supabase";
import type { EmailProvider } from "@/shared/types";

/**
 * Seleciona o melhor provedor usando agregação nativa do banco (O(1)).
 */
export async function selectProviderForNewContact(): Promise<EmailProvider> {
  console.log('[Diagnostic] Iniciando seleção de provedor...');
  // 1. Busca provedores ativos
  const { data: activeProviders, error: configError } = await supabaseAdmin
    .from('ProviderConfig')
    .select('*')
    .eq('isActive', true);

  if (configError) {
    console.error('[Diagnostic] Erro ao buscar ProviderConfig:', configError);
    throw configError;
  }
  
  console.log('[Diagnostic] Provedores ativos encontrados:', activeProviders?.length ?? 0);
  
  if (!activeProviders || activeProviders.length === 0) {
    throw new Error("Nenhum provedor de email ativo no banco (tabela ProviderConfig).");
  }

  // 2. Busca distribuição via RPC (Agregação no Postgres - Alta Performance)
  console.log('[Diagnostic] Buscando distribuição via RPC get_provider_distribution...');
  const { data: distribution, error: distError } = await supabaseAdmin
    .rpc('get_provider_distribution');

  if (distError) {
    console.warn('[Diagnostic] RPC get_provider_distribution falhou ou não existe. Usando fallback.', distError);
  }

  // Fallback caso o RPC não tenha sido criado ainda
  const countMap = new Map<string, number>();
  if (!distError && distribution) {
    distribution.forEach((item: any) => countMap.set(item.provider, Number(item.count)));
  }

  // 3. Calcula ratio e seleciona o menor
  const candidates = activeProviders.map((config) => {
    const currentCount = countMap.get(config.provider) ?? 0;
    const ratio = currentCount / Math.max(config.weight, 1);
    console.log(`[Diagnostic] Provedor: ${config.provider}, Peso: ${config.weight}, Atual: ${currentCount}, Ratio: ${ratio}`);
    return {
      provider: config.provider as EmailProvider,
      ratio: ratio,
    };
  });

  candidates.sort((a, b) => a.ratio - b.ratio);
  console.log('[Diagnostic] Vencedor selecionado:', candidates[0].provider);
  return candidates[0].provider;
}

/**
 * Distribui N provedores para um lote de contatos simulando o balanceamento localmente.
 */
export async function assignProvidersToContacts(count: number): Promise<EmailProvider[]> {
  console.log(`[Diagnostic] Distribuindo provedores para ${count} contatos...`);
  
  const { data: activeProviders, error: configError } = await supabaseAdmin
    .from('ProviderConfig')
    .select('*')
    .eq('isActive', true);

  if (configError) throw configError;
  if (!activeProviders || activeProviders.length === 0) {
    throw new Error("Nenhum provedor de email ativo no banco.");
  }

  const { data: distribution, error: distError } = await supabaseAdmin.rpc('get_provider_distribution');
  
  const countMap = new Map<string, number>();
  if (!distError && distribution) {
    distribution.forEach((item: any) => countMap.set(item.provider, Number(item.count)));
  }

  const results: EmailProvider[] = [];
  
  // Simula a adição ao banco localmente para balancear o lote perfeitamente
  for (let i = 0; i < count; i++) {
    const candidates = activeProviders.map((config) => {
      const currentCount = countMap.get(config.provider) ?? 0;
      const ratio = currentCount / Math.max(config.weight, 1);
      return {
        provider: config.provider as EmailProvider,
        ratio: ratio,
      };
    });

    candidates.sort((a, b) => a.ratio - b.ratio);
    const winner = candidates[0].provider;
    results.push(winner);
    
    // Atualiza o contador local para que o próximo laço veja a mudança
    countMap.set(winner, (countMap.get(winner) ?? 0) + 1);
  }

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
  // Chama o SQL RPC para garantir que o incremento aconteça no banco
  const { error } = await supabaseAdmin.rpc('increment_provider_count', { 
    provider_name: provider 
  });

  // Fallback caso o RPC não exista (para manter compatibilidade imediata)
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
