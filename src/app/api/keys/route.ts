import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasFeature } from "@/lib/services/permissions";
import { randomBytes, createHash } from "crypto";
import { z } from "zod";
import type { PlanTier } from "@prisma/client";

export const dynamic = "force-dynamic";

function generateApiKey(): { full: string; prefix: string; hash: string } {
  const raw = randomBytes(32).toString("base64url");
  const full = `yz_${raw}`;
  const prefix = full.slice(0, 11);
  const hash = createHash("sha256").update(full).digest("hex");
  return { full, prefix, hash };
}

const createSchema = z.object({
  name: z.string().min(1).max(50).optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const user = await db.user.findUnique({ where: { id: session.userId }, select: { plan: true, role: true } });
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  if (!hasFeature(user.plan as PlanTier, "apiAccess", { isAdmin: user.role === "ADMIN" || user.role === "ADMIN_OWNER" })) {
    return NextResponse.json({ error: "Plan Business requis pour les clés API" }, { status: 403 });
  }

  const keys = await db.apiKey.findMany({
    where: { userId: session.userId, revokedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, prefix: true, lastUsedAt: true, createdAt: true },
  });

  return NextResponse.json({ keys });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const user = await db.user.findUnique({ where: { id: session.userId }, select: { plan: true, role: true } });
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  if (!hasFeature(user.plan as PlanTier, "apiAccess", { isAdmin: user.role === "ADMIN" || user.role === "ADMIN_OWNER" })) {
    return NextResponse.json({ error: "Plan Business requis" }, { status: 403 });
  }

  const existing = await db.apiKey.count({ where: { userId: session.userId, revokedAt: null } });
  if (existing >= 5) {
    return NextResponse.json({ error: "Maximum 5 clés actives" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  const name = parsed.success ? (parsed.data.name || "Default") : "Default";

  const { full, prefix, hash } = generateApiKey();

  await db.apiKey.create({
    data: { userId: session.userId, name, prefix, keyHash: hash },
  });

  return NextResponse.json({ key: full, prefix, name }, { status: 201 });
}
