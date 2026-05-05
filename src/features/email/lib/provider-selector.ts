/**
 * Provider Selector — Lógica de Weighted Round-Robin.
 * 
 * REGRA CHAVE: Cada contato recebe um provedor PERMANENTE no cadastro.
 * O algoritmo seleciona o provedor com menor "carga relativa" (ratio = contatos / peso).
 * Provedores inativos ou com limite diário atingido são excluídos.
 */
import { prisma } from "@/shared/lib/prisma";
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
  // 1. Busca provedores ativos
  const activeProviders = await prisma.providerConfig.findMany({
    where: { isActive: true },
  });

  if (activeProviders.length === 0) {
    throw new Error("Nenhum provedor de email está ativo. Configure pelo menos um provedor.");
  }

  // 2. Conta contatos por provedor
  const contactCounts = await prisma.contact.groupBy({
    by: ["provider"],
    _count: { _all: true },
  });

  const countMap = new Map(
    contactCounts.map((c) => [c.provider, c._count._all])
  );

  // 3. Calcula ratio e seleciona o menor
  const candidates = activeProviders.map((config) => ({
    provider: config.provider,
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
  const config = await prisma.providerConfig.findUnique({
    where: { provider },
  });

  if (!config || !config.isActive) return false;

  // Verifica se precisa resetar o contador diário
  const now = new Date();
  const lastReset = new Date(config.lastResetAt);
  const isNewDay = now.toDateString() !== lastReset.toDateString();

  if (isNewDay) {
    await prisma.providerConfig.update({
      where: { provider },
      data: { sentToday: 0, lastResetAt: now },
    });
    return true;
  }

  return config.sentToday < config.dailyLimit;
}

/**
 * Incrementa o contador diário de envios de um provedor.
 */
export async function incrementProviderSendCount(provider: EmailProvider): Promise<void> {
  await prisma.providerConfig.update({
    where: { provider },
    data: { sentToday: { increment: 1 } },
  });
}
