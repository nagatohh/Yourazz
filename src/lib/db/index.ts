import { PrismaClient } from "@prisma/client";

const g = globalThis as unknown as { prisma: PrismaClient | undefined };

export const db =
  g.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") g.prisma = db;
