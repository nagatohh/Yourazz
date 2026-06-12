import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const s = await getSession();
    if (!s) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const [notifications, unreadCount] = await Promise.all([
      db.notification.findMany({
        where: { userId: s.userId },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      db.notification.count({ where: { userId: s.userId, read: false } }),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch (e) {
    console.error("NOTIFICATIONS_GET:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

const readSchema = z.object({ ids: z.array(z.string()).max(50).optional() });

// Marque comme lues : les ids fournis, ou toutes si ids absent
export async function PATCH(req: Request) {
  try {
    const s = await getSession();
    if (!s) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { ids } = readSchema.parse(await req.json().catch(() => ({})));
    await db.notification.updateMany({
      where: { userId: s.userId, read: false, ...(ids ? { id: { in: ids } } : {}) },
      data: { read: true },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.name === "ZodError") return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    console.error("NOTIFICATIONS_PATCH:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
