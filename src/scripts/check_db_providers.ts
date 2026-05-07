import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const providers = await prisma.providerConfig.findMany();
  console.log(providers);
  const contacts = await prisma.contact.findMany({ take: 5 });
  console.log("Contacts providers:", contacts.map(c => c.provider));
  const ccs = await prisma.campaignContact.findMany({ take: 5, include: { contact: true } });
  console.log("CampaignContacts steps:", ccs.map(cc => ({ status: cc.stepStatus, provider: cc.contact.provider, step: cc.currentStepId })));
}
run().finally(() => prisma.$disconnect());
