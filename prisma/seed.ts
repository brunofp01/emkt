import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // 1. Criar Configurações dos Provedores
  await prisma.providerConfig.upsert({
    where: { provider: 'RESEND' },
    update: {},
    create: {
      provider: 'RESEND',
      weight: 25,
      fromEmail: 'oi@seuapp.com',
      fromName: 'Equipe Marketing',
    },
  })

  await prisma.providerConfig.upsert({
    where: { provider: 'BREVO' },
    update: {},
    create: {
      provider: 'BREVO',
      weight: 25,
      fromEmail: 'marketing@seuapp.com',
      fromName: 'Equipe Marketing',
    },
  })

  await prisma.providerConfig.upsert({
    where: { provider: 'MAILGUN' },
    update: {},
    create: {
      provider: 'MAILGUN',
      weight: 25,
      fromEmail: 'newsletter@seuapp.com',
      fromName: 'Equipe Marketing',
    },
  })

  await prisma.providerConfig.upsert({
    where: { provider: 'USESEND' },
    update: {},
    create: {
      provider: 'USESEND',
      weight: 25,
      fromEmail: 'promos@seuapp.com',
      fromName: 'Equipe Marketing',
    },
  })

  // 2. Criar uma Campanha
  const campaign = await prisma.campaign.create({
    data: {
      name: 'Boas-vindas Q3',
      description: 'Sequência de onboarding para novos leads.',
      status: 'ACTIVE',
      steps: {
        create: [
          {
            stepOrder: 1,
            subject: 'Bem-vindo à nossa plataforma, {{contactName}}!',
            htmlBody: '<h1>Olá {{contactName}}</h1><p>Estamos muito felizes em ter você conosco.</p>',
            delayHours: 0,
          },
          {
            stepOrder: 2,
            subject: 'Seu próximo passo...',
            htmlBody: '<h1>Pronto para começar?</h1><p>Acesse o painel e configure seu perfil.</p>',
            delayHours: 24,
          },
        ],
      },
    },
    include: { steps: true },
  })

  // 3. Criar Contatos com Eventos Fictícios
  const providers = ['RESEND', 'BREVO', 'MAILGUN', 'USESEND'] as const;
  
  for (let i = 1; i <= 20; i++) {
    const contact = await prisma.contact.create({
      data: {
        email: `lead${i}@empresa.com`,
        name: `Lead ${i}`,
        company: `Empresa ${i} Ltda`,
        provider: providers[i % 4],
        status: 'ACTIVE',
      },
    })

    // Inscrever na campanha
    const campaignContact = await prisma.campaignContact.create({
      data: {
        contactId: contact.id,
        campaignId: campaign.id,
        currentStepId: campaign.steps[0].id,
        stepStatus: i % 3 === 0 ? 'OPENED' : 'DELIVERED',
        lastSentAt: new Date(Date.now() - Math.random() * 86400000 * 2), // 0 a 2 dias atrás
      },
    })

    // Criar eventos de webhook para os contatos
    await prisma.emailEvent.create({
      data: {
        contactId: contact.id,
        externalId: `ext_sent_${i}`,
        messageId: `msg_${i}`,
        provider: contact.provider,
        eventType: 'DELIVERED',
        timestamp: new Date(Date.now() - Math.random() * 86400000),
      },
    })

    if (i % 3 === 0) {
      await prisma.emailEvent.create({
        data: {
          contactId: contact.id,
          externalId: `ext_opened_${i}`,
          messageId: `msg_${i}`,
          provider: contact.provider,
          eventType: 'OPENED',
          timestamp: new Date(),
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        },
      })
    }
  }

  console.log('Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
