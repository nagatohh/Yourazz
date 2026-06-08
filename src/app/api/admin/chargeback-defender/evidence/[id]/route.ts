import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/admin";
import { generateEvidenceDossier } from "@/lib/services/chargeback-defender";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const dossier = await generateEvidenceDossier(id);
  if (!dossier) return NextResponse.json({ error: "Evidence introuvable" }, { status: 404 });

  return NextResponse.json(dossier);
}
