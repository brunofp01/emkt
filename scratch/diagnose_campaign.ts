
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnose() {
  console.log('--- Diagnóstico de Envio ---');

  // 1. Verificar Provedores
  const providers = await prisma.providerConfig.findMany();
  console.log('\n--- Provedores ---');
  providers.forEach(p => {
    console.log(`[${p.provider}] Active: ${p.isActive}, SentToday: ${p.sentToday}/${p.dailyLimit}, Tier: ${p.accountTier}`);
  });

  // 2. Verificar Campanhas Ativas
  const activeCampaigns = await prisma.campaign.findMany({
    where: { status: 'ACTIVE' }
  });
  console.log('\n--- Campanhas Ativas ---');
  if (activeCampaigns.length === 0) {
    console.log('Nenhuma campanha ativa encontrada.');
  }

  for (const campaign of activeCampaigns) {
    const stats = await prisma.campaignContact.groupBy({
      by: ['stepStatus'],
      where: { campaignId: campaign.id },
      _count: true
    });
    console.log(`Campanha: ${campaign.name} (${campaign.id})`);
    stats.forEach(s => {
      console.log(`  - ${s.stepStatus}: ${s._count}`);
    });
  }

  // 3. Verificar Contatos em Fila (QUEUED ou PENDING que deveriam ser processados)
  // Nota: O processamento depende do Inngest e do delayHours.
  
  // 4. Verificar se há erros recentes em EmailEvent
  const recentErrors = await prisma.emailEvent.findMany({
    where: {
      eventType: { in: ['FAILED', 'BOUNCED_HARD', 'REJECTED'] },
      timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    },
    take: 5,
    orderBy: { timestamp: 'desc' }
  });

  console.log('\n--- Erros Recentes (últimas 24h) ---');
  recentErrors.forEach(e => {
    console.log(`[${e.timestamp.toISOString()}] ${e.provider} - ${e.eventType}: ${e.bounceReason || 'No reason'}`);
  });
}

diagnose()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
