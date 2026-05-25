import { PrismaClient } from "@prisma/client";

const g = globalThis as unknown as { prisma: PrismaClient | undefined };

export const db =
  g.prisma ??
  new PrismaClient({
    log: ["error"],
    datasourceUrl: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") g.prisma = db;
