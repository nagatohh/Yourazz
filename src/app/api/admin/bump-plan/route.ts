import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { setUserPlan } from "@/lib/services/plans";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  userId: z.string().min(1),
  plan: z.enum(["PRO", "BUSINESS"]),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "ADMIN_OWNER")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides", details: parsed.error.flatten() }, { status: 400 });
  }

  const target = await db.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, plan: true, username: true, email: true },
  });
  if (!target) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  await setUserPlan(target.id, parsed.data.plan, `admin_bump:${session.userId}`);

  return NextResponse.json({
    ok: true,
    user: target.username || target.email,
    from: target.plan,
    to: parsed.data.plan,
  });
}
