import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

// Journal des activations (génération, validation, tentative invalide,
// suspension, expiration). Lecture seule pour l'admin.
export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const logs = await db.activationLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      action: true,
      success: true,
      ipAddress: true,
      metadata: true,
      createdAt: true,
      keyId: true,
      userId: true,
      key: { select: { key: true, plan: true } },
    },
  });

  return NextResponse.json({ logs });
}
