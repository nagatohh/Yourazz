import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { setUserPlan } from "@/lib/services/plans";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  userId: z.string().min(1),
  plan: z.enum(["PRO", "BUSINESS"]),
});

export async function POST(req: Request) {
  // Sécurité : rôle relu en DB (getAdminSession), jamais depuis le JWT — un
  // admin révoqué porte encore un JWT valide jusqu'à 7 jours.
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides", details: parsed.error.flatten() }, { status: 400 });
  }

  const target = await db.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, plan: true, username: true, email: true },
  });
  if (!target) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  await setUserPlan(target.id, parsed.data.plan, `admin_bump:${admin.userId}`);

  // Trace l'action admin (qui a changé quel plan, pour quel user).
  await db.auditLog.create({
    data: {
      userId: admin.userId,
      action: "ADMIN_PLAN_BUMP",
      target: target.id,
      metadata: { from: target.plan, to: parsed.data.plan, targetEmail: target.email },
    },
  });

  return NextResponse.json({
    ok: true,
    user: target.username || target.email,
    from: target.plan,
    to: parsed.data.plan,
  });
}
