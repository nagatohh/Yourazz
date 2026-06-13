import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/auth/admin";
import { updateKeySchema } from "@/lib/validators";
import { logActivation } from "@/lib/services/crypto-access";

export const dynamic = "force-dynamic";

// Suspension / réactivation d'une clé.
//   revoke     : ACTIVE/EXPIRED → SUSPENDED (la clé ne pourra plus être utilisée).
//   reactivate : SUSPENDED/REVOKED/EXPIRED → ACTIVE (impossible sur une clé USED).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminSession();
    if (!admin) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const { id } = await params;
    const { action } = updateKeySchema.parse(await req.json());

    const key = await db.activationKey.findUnique({ where: { id } });
    if (!key) return NextResponse.json({ error: "Clé introuvable" }, { status: 404 });

    if (key.status === "USED") {
      return NextResponse.json({ error: "Une clé déjà utilisée ne peut pas être modifiée." }, { status: 400 });
    }

    if (action === "revoke") {
      if (key.status === "SUSPENDED" || key.status === "REVOKED") {
        return NextResponse.json({ error: "Clé déjà suspendue" }, { status: 400 });
      }
      const updated = await db.activationKey.update({
        where: { id },
        data: { status: "SUSPENDED", revokedAt: new Date(), revokedBy: admin.userId },
        select: { id: true, status: true },
      });
      await logActivation({ action: "KEY_SUSPENDED", keyId: id, userId: key.userId });
      await db.auditLog.create({
        data: { userId: admin.userId, action: "ACTIVATION_KEY_SUSPENDED", target: id },
      });
      return NextResponse.json({ key: updated });
    }

    // action === "reactivate"
    if (key.status === "ACTIVE") return NextResponse.json({ error: "Clé déjà active" }, { status: 400 });
    const expiredPast = key.expiresAt && key.expiresAt.getTime() < Date.now();
    const updated = await db.activationKey.update({
      where: { id },
      data: {
        status: "ACTIVE",
        revokedAt: null,
        revokedBy: null,
        // une clé expirée réactivée sans nouvelle échéance redeviendrait
        // immédiatement inutilisable → on lève l'expiration.
        expiresAt: expiredPast ? null : key.expiresAt,
      },
      select: { id: true, status: true },
    });
    await logActivation({ action: "KEY_REACTIVATED", keyId: id, userId: key.userId });
    await db.auditLog.create({
      data: { userId: admin.userId, action: "ACTIVATION_KEY_REACTIVATED", target: id },
    });
    return NextResponse.json({ key: updated });
  } catch (e: unknown) {
    if ((e as { name?: string })?.name === "ZodError") {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    console.error("KEY_UPDATE_ERROR:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
