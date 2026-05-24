import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/auth/admin";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;
  const invitation = await db.invitation.findUnique({ where: { id } });
  if (!invitation) return NextResponse.json({ error: "Invitation introuvable" }, { status: 404 });
  if (invitation.usedAt) return NextResponse.json({ error: "Invitation déjà utilisée, impossible de supprimer" }, { status: 400 });

  await db.invitation.delete({ where: { id } });

  await db.auditLog.create({
    data: { userId: admin.userId, action: "INVITATION_DELETED", target: id, metadata: { email: invitation.email } },
  });

  return NextResponse.json({ success: true });
}
