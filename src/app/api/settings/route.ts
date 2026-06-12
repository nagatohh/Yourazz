import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

// Noms interdits : routes existantes du site + termes sensibles,
// sinon /@admin ou /@yourazz deviendraient des profils usurpables
const RESERVED_USERNAMES = [
  "admin", "yourazz", "support", "api", "pay", "u", "dashboard",
  "login", "register", "settings", "payment", "payments", "bank-auth",
  "verify-email", "cgv", "confidentialite", "mentions-legales", "official",
];

const updateSchema = z.object({
  name: z.string().min(2, "Minimum 2 caractères").max(100).optional(),
  username: z
    .string()
    .min(3, "Minimum 3 caractères")
    .max(30, "Maximum 30 caractères")
    .regex(/^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/, "Lettres minuscules, chiffres, points, tirets et underscores uniquement")
    .refine((u) => !RESERVED_USERNAMES.includes(u), "Ce nom d'utilisateur est réservé")
    .optional(),
});

export async function PATCH(req: Request) {
  try {
    const s = await getSession();
    if (!s) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const body = await req.json();
    const { name, username } = updateSchema.parse(body);

    if (name === undefined && username === undefined) {
      return NextResponse.json({ error: "Aucune modification" }, { status: 400 });
    }

    if (username !== undefined) {
      const taken = await db.user.findFirst({
        where: { username, id: { not: s.userId } },
        select: { id: true },
      });
      if (taken) return NextResponse.json({ error: "Ce nom d'utilisateur est déjà pris" }, { status: 409 });
    }

    const user = await db.user.update({
      where: { id: s.userId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(username !== undefined ? { username } : {}),
      },
      select: { id: true, name: true, username: true, email: true },
    });

    return NextResponse.json({ user });
  } catch (e: any) {
    if (e?.name === "ZodError") return NextResponse.json({ error: e.errors[0]?.message || "Données invalides" }, { status: 400 });
    console.error("SETTINGS_UPDATE_ERROR:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
