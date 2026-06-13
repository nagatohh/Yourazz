import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/auth/admin";
import { updateKeySchema } from "@/lib/validators";
import { logActivation } from "@/lib/services/crypto-access";

export const dynamic = "force-dynamic";

// Révocation / réactivation d'une clé.
//   revoke     : ACTIVE → REVOKED (la clé ne pourra plus être utilisée).
//   reactivate : REVOKED → ACTIVE (impossible sur une clé déjà USED).
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
      if (key.status === "REVOKED") return NextResponse.json({ error: "Clé déjà révoquée" }, { status: 400 });
      const updated = await db.activationKey.update({
        where: { id },
        data: { status: "REVOKED", revokedAt: new Date(), revokedBy: admin.userId },
        select: { id: true, status: true },
      });
      await logActivation({ action: "KEY_REVOKED", keyId: id, userId: key.userId });
      await db.auditLog.create({
        data: { userId: admin.userId, action: "ACTIVATION_KEY_REVOKED", target: id },
      });
      return NextResponse.json({ key: updated });
    }

    // action === "reactivate"
    if (key.status === "ACTIVE") return NextResponse.json({ error: "Clé déjà active" }, { status: 400 });
    const updated = await db.activationKey.update({
      where: { id },
      data: { status: "ACTIVE", revokedAt: null, revokedBy: null },
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
