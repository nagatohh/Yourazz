import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({ id: z.string().min(1) });

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "ID requis" }, { status: 400 });

  const key = await db.apiKey.findFirst({
    where: { id: parsed.data.id, userId: session.userId, revokedAt: null },
  });
  if (!key) return NextResponse.json({ error: "Clé introuvable" }, { status: 404 });

  await db.apiKey.update({
    where: { id: key.id },
    data: { revokedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
