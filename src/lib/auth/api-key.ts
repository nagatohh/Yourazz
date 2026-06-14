import { createHash } from "crypto";
import { db } from "@/lib/db";
import { hasFeature } from "@/lib/services/permissions";
import type { PlanTier } from "@prisma/client";

export interface ApiKeyAuth {
  userId: string;
  keyId: string;
  plan: PlanTier;
}

export async function authenticateApiKey(req: Request): Promise<ApiKeyAuth | null> {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer yz_")) return null;

  const token = header.slice(7);
  const hash = createHash("sha256").update(token).digest("hex");

  const key = await db.apiKey.findUnique({
    where: { keyHash: hash },
    select: { id: true, userId: true, revokedAt: true, expiresAt: true, user: { select: { plan: true, role: true } } },
  });

  if (!key || key.revokedAt) return null;
  if (key.expiresAt && key.expiresAt < new Date()) return null;

  const isAdmin = key.user.role === "ADMIN" || key.user.role === "ADMIN_OWNER";
  if (!hasFeature(key.user.plan as PlanTier, "apiAccess", { isAdmin })) return null;

  await db.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } }).catch(() => {});

  return { userId: key.userId, keyId: key.id, plan: key.user.plan as PlanTier };
}
