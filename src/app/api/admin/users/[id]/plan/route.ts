import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/auth/admin";
import { updateUserPlanSchema } from "@/lib/validators";
import { setUserPlan } from "@/lib/services/plans";
import { createNotification } from "@/lib/services/notifications";

export const dynamic = "force-dynamic";

// Modification manuelle du plan d'un utilisateur par un admin (geste de
// gestion : remboursement, geste commercial, correction). Tracé dans AuditLog.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminSession();
    if (!admin) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const { id } = await params;
    const { plan } = updateUserPlanSchema.parse(await req.json());

    const user = await db.user.findUnique({ where: { id }, select: { id: true, plan: true } });
    if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

    await setUserPlan(id, plan, `admin:${admin.userId}`);

    await createNotification({
      userId: id,
      type: "PAYMENT_RECEIVED",
      title: `Plan mis à jour : ${plan === "BUSINESS" ? "Business" : plan === "PRO" ? "Pro" : "Starter"}`,
      body: "Votre plan a été modifié par l'équipe Yourazz.",
      href: "/dashboard/plan",
    });

    return NextResponse.json({ ok: true, plan });
  } catch (e: unknown) {
    if ((e as { name?: string })?.name === "ZodError") {
      return NextResponse.json({ error: "Plan invalide" }, { status: 400 });
    }
    console.error("ADMIN_USER_PLAN_ERROR:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
