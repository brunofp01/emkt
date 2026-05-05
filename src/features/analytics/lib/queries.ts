import { prisma } from "@/shared/lib/prisma";

export async function getDashboardStats() {
  const [
    totalContacts,
    activeCampaigns,
    eventCounts,
    providerCounts,
  ] = await Promise.all([
    prisma.contact.count(),
    prisma.campaign.count({ where: { status: "ACTIVE" } }),
    prisma.emailEvent.groupBy({
      by: ["eventType"],
      _count: { _all: true },
    }),
    prisma.contact.groupBy({
      by: ["provider"],
      _count: { _all: true },
    }),
  ]);

  const eventMap: Record<string, number> = {};
  let totalEvents = 0;
  
  for (const e of eventCounts) {
    eventMap[e.eventType] = e._count._all;
    totalEvents += e._count._all;
  }

  const totalSent = (eventMap["SENT"] ?? 0) + (eventMap["DELIVERED"] ?? 0);
  const totalDelivered = eventMap["DELIVERED"] ?? 0;
  const totalOpened = eventMap["OPENED"] ?? 0;
  const totalClicked = eventMap["CLICKED"] ?? 0;
  const totalBounced = (eventMap["BOUNCED_SOFT"] ?? 0) + (eventMap["BOUNCED_HARD"] ?? 0);
  const totalComplaints = eventMap["COMPLAINED"] ?? 0;

  return {
    totalContacts,
    activeCampaigns,
    totalSent,
    totalDelivered,
    totalOpened,
    totalClicked,
    totalBounced,
    totalComplaints,
    openRate: calcPercentage(totalOpened, totalDelivered),
    clickRate: calcPercentage(totalClicked, totalOpened),
    bounceRate: calcPercentage(totalBounced, totalSent),
    providerCounts: providerCounts.map((p) => ({
      provider: p.provider,
      count: p._count._all,
    })),
    recentEvents: await prisma.emailEvent.findMany({
      take: 10,
      orderBy: { timestamp: "desc" },
      include: { contact: true },
    }),
    eventMap,
    totalEvents,
  };
}

function calcPercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 1000) / 10;
}
