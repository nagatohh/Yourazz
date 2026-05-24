import { PrismaClient } from "@prisma/client";

const g = globalThis as unknown as { prisma: PrismaClient | undefined };

export const db =
  g.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    log: process.env.NODE_ENV === "development" ? ["error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") g.prisma = db;
