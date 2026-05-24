import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(2, "Minimum 2 caractères").max(100),
});

export async function PATCH(req: Request) {
  try {
    const s = await getSession();
    if (!s) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const body = await req.json();
    const { name } = updateSchema.parse(body);

    const user = await db.user.update({
      where: { id: s.userId },
      data: { name },
      select: { id: true, name: true, email: true },
    });

    return NextResponse.json({ user });
  } catch (e: any) {
    if (e?.name === "ZodError") return NextResponse.json({ error: e.errors[0]?.message || "Données invalides" }, { status: 400 });
    console.error("SETTINGS_UPDATE_ERROR:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
