import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request, context: any) {
  try {
    const { slug } = await context.params;
    const link = await db.paymentLink.findUnique({
      where: { slug },
      include: { user: { select: { name: true } } },
    });
    if (!link || !link.isActive) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ link });
  } catch (e) {
    console.error("PAY_SLUG:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
