/**
 * Provider Selector — Lógica de Weighted Round-Robin.
 * Refatorado para usar o SDK oficial do Supabase (HTTPS).
 */
import { supabase } from "@/shared/lib/supabase";
import type { EmailProvider } from "@/shared/types";

/**
 * Seleciona o melhor provedor para um novo contato usando Weighted Round-Robin.
 * 
 * Algoritmo:
 * 1. Busca todos os ProviderConfig ativos
 * 2. Conta quantos contatos cada provedor já possui
 * 3. Calcula ratio = contatos_atuais / peso_configurado
 * 4. Seleciona o provedor com menor ratio (mais "disponível")
 * 
 * @returns O EmailProvider selecionado para o novo contato
 * @throws Error se nenhum provedor estiver disponível
 */
export async function selectProviderForNewContact(): Promise<EmailProvider> {
  // 1. Busca provedores ativos via HTTPS
  const { data: activeProviders, error: configError } = await supabase
    .from('ProviderConfig')
    .select('*')
    .eq('isActive', true);

  if (configError) throw configError;

  if (!activeProviders || activeProviders.length === 0) {
    throw new Error("Nenhum provedor de email está ativo. Configure pelo menos um provedor.");
  }

  // 2. Conta contatos por provedor
  const { data: contactData, error: contactError } = await supabase
    .from('Contact')
    .select('provider');

  if (contactError) throw contactError;

  const countMap = new Map<string, number>();
  if (contactData) {
    contactData.forEach(c => {
      countMap.set(c.provider, (countMap.get(c.provider) || 0) + 1);
    });
  }

  // 3. Calcula ratio e seleciona o menor
  const candidates = activeProviders.map((config) => ({
    provider: config.provider as EmailProvider,
    weight: config.weight,
    currentCount: countMap.get(config.provider) ?? 0,
    ratio: (countMap.get(config.provider) ?? 0) / Math.max(config.weight, 1),
  }));

  // Ordena por ratio crescente (menor ratio = mais disponível)
  candidates.sort((a, b) => a.ratio - b.ratio);

  const selected = candidates[0];
  if (!selected) {
    throw new Error("Falha ao selecionar provedor.");
  }

  return selected.provider;
}

/**
 * Verifica se um provedor pode enviar mais emails hoje.
 * Reseta o contador diário se necessário.
 */
export async function canProviderSendToday(provider: EmailProvider): Promise<boolean> {
  const { data: config, error } = await supabase
    .from('ProviderConfig')
    .select('*')
    .eq('provider', provider)
    .single();

  if (error || !config || !config.isActive) return false;

  // Verifica se precisa resetar o contador diário
  const now = new Date();
  const lastReset = new Date(config.lastResetAt);
  const isNewDay = now.toDateString() !== lastReset.toDateString();

  if (isNewDay) {
    await supabase
      .from('ProviderConfig')
      .update({ sentToday: 0, lastResetAt: now.toISOString() })
      .eq('provider', provider);
    return true;
  }

  return config.sentToday < config.dailyLimit;
}

/**
 * Incrementa o contador diário de envios de um provedor.
 */
export async function incrementProviderSendCount(provider: EmailProvider): Promise<void> {
  // Nota: O Supabase não tem um comando 'increment' atômico via REST 
  // tão simples quanto o Prisma sem RPC, mas para este volume, 
  // podemos buscar e salvar ou usar um RPC. Vamos usar RPC se possível, 
  // mas como não temos certeza se o RPC existe, faremos via select + update.
  
  const { data: config } = await supabase
    .from('ProviderConfig')
    .select('sentToday')
    .eq('provider', provider)
    .single();

  if (config) {
    await supabase
      .from('ProviderConfig')
      .update({ sentToday: config.sentToday + 1 })
      .eq('provider', provider);
  }
}
