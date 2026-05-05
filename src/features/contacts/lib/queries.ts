/**
 * Contact queries — Busca de contatos no banco de dados.
 * Usado por Server Components para renderização SSR.
 */
import { prisma } from "@/shared/lib/prisma";
import type { EmailProvider, ContactStatus } from "@prisma/client";

export interface ContactFilters {
  search?: string;
  provider?: EmailProvider;
  status?: ContactStatus;
  page?: number;
  perPage?: number;
}

const DEFAULT_PER_PAGE = 20;

/**
 * Lista contatos com filtros, paginação e busca.
 */
export async function getContacts(filters: ContactFilters = {}) {
  const {
    search,
    provider,
    status,
    page = 1,
    perPage = DEFAULT_PER_PAGE,
  } = filters;

  const where = {
    ...(search && {
      OR: [
        { email: { contains: search, mode: "insensitive" as const } },
        { name: { contains: search, mode: "insensitive" as const } },
        { company: { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(provider && { provider }),
    ...(status && { status }),
  };

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        campaignContacts: {
          include: {
            campaign: { select: { name: true } },
            currentStep: { select: { stepOrder: true } },
          },
          take: 1,
          orderBy: { updatedAt: "desc" },
        },
        emailEvents: {
          take: 1,
          orderBy: { timestamp: "desc" },
          select: { eventType: true, timestamp: true },
        },
      },
    }),
    prisma.contact.count({ where }),
  ]);

  return {
    contacts,
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  };
}

/**
 * Busca um contato pelo ID com todos os relacionamentos.
 */
export async function getContactById(id: string) {
  return prisma.contact.findUnique({
    where: { id },
    include: {
      campaignContacts: {
        include: {
          campaign: true,
          currentStep: true,
        },
        orderBy: { createdAt: "desc" },
      },
      emailEvents: {
        orderBy: { timestamp: "desc" },
        take: 50,
      },
    },
  });
}

/**
 * Conta contatos por provedor (para analytics).
 */
export async function getContactCountsByProvider() {
  return prisma.contact.groupBy({
    by: ["provider"],
    _count: { _all: true },
  });
}
