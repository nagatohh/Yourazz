import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const link = await db.paymentLink.findFirst({ where: { userId: s.userId } });
  return NextResponse.json({ link });
}

const updateSchema = z.object({
  label: z.string().min(2, "Minimum 2 caractères").max(60, "Maximum 60 caractères").optional(),
  description: z.string().max(280, "Maximum 280 caractères").nullable().optional(),
  brandColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide (format #RRGGBB)")
    .nullable()
    .optional(),
  logoUrl: z
    .string()
    .url("URL invalide")
    .max(500)
    .refine((u) => u.startsWith("https://"), "L'URL du logo doit être en https")
    .nullable()
    .optional(),
});

// Personnalisation de la page de paiement publique (/pay/[slug])
export async function PATCH(req: Request) {
  try {
    const s = await getSession();
    if (!s) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const v = updateSchema.parse(await req.json());
    if (Object.keys(v).length === 0) {
      return NextResponse.json({ error: "Aucune modification" }, { status: 400 });
    }

    const existing = await db.paymentLink.findFirst({ where: { userId: s.userId }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Lien introuvable" }, { status: 404 });

    const link = await db.paymentLink.update({
      where: { id: existing.id },
      data: {
        ...(v.label !== undefined ? { label: v.label } : {}),
        ...(v.description !== undefined ? { description: v.description } : {}),
        ...(v.brandColor !== undefined ? { brandColor: v.brandColor } : {}),
        ...(v.logoUrl !== undefined ? { logoUrl: v.logoUrl } : {}),
      },
    });

    await db.auditLog.create({
      data: { userId: s.userId, action: "PAYMENT_LINK_CUSTOMIZED", target: link.id, metadata: v },
    });

    return NextResponse.json({ link });
  } catch (e: any) {
    if (e?.name === "ZodError") {
      return NextResponse.json({ error: e.errors?.[0]?.message || "Données invalides" }, { status: 400 });
    }
    console.error("PAYMENT_LINK_PATCH:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
