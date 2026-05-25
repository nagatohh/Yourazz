import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/admin";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const s = await getAdminSession();
    if (!s) return NextResponse.json({ error: "Acces refuse" }, { status: 403 });

    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "security";
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);

    if (type === "security") {
      const logs = await db.securityLog.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        include: { user: { select: { email: true, name: true } } },
      });
      return NextResponse.json({ logs });
    }

    if (type === "audit") {
      const logs = await db.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        include: { user: { select: { email: true, name: true } } },
      });
      return NextResponse.json({ logs });
    }

    if (type === "webhooks") {
      const events = await db.webhookEvent.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return NextResponse.json({ events });
    }

    return NextResponse.json({ error: "Type invalide" }, { status: 400 });
  } catch (e: any) {
    console.error("ADMIN_LOGS_ERROR:", e?.message || e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
