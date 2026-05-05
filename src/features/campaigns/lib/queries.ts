import { prisma } from "@/shared/lib/prisma";

export async function getCampaigns() {
  return prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      steps: { orderBy: { stepOrder: "asc" }, select: { id: true, stepOrder: true, subject: true } },
      _count: { select: { campaignContacts: true } },
    },
  });
}

export async function getCampaignById(id: string) {
  return prisma.campaign.findUnique({
    where: { id },
    include: {
      steps: { orderBy: { stepOrder: "asc" } },
      campaignContacts: {
        include: {
          contact: { select: { id: true, email: true, name: true, provider: true, status: true } },
          currentStep: { select: { stepOrder: true, subject: true } },
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });
}

export async function getCampaignAnalytics(campaignId: string) {
  const contacts = await prisma.campaignContact.findMany({
    where: { campaignId },
    select: { stepStatus: true },
  });

  const statusCounts: Record<string, number> = {};
  for (const c of contacts) {
    statusCounts[c.stepStatus] = (statusCounts[c.stepStatus] ?? 0) + 1;
  }

  const events = await prisma.emailEvent.findMany({
    where: {
      contact: { campaignContacts: { some: { campaignId } } },
    },
    select: { eventType: true },
  });

  const eventCounts: Record<string, number> = {};
  for (const e of events) {
    eventCounts[e.eventType] = (eventCounts[e.eventType] ?? 0) + 1;
  }

  return { statusCounts, eventCounts, totalContacts: contacts.length };
}
