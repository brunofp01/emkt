/**
 * Prisma Client Singleton
 * 
 * Previne múltiplas instâncias do PrismaClient em desenvolvimento
 * (hot-reloading do Next.js cria novas conexões a cada reload).
 */
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query"] : [],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
