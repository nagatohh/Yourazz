import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request, context: any) {
  try {
    const { slug } = await context.params;
    const link = await db.paymentLink.findUnique({
      where: { slug },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            createdAt: true,
            _count: { select: { transactions: { where: { type: "PAYIN", status: "SUCCEEDED" } } } },
          },
        },
      },
    });
    if (!link || !link.isActive) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({
      link: {
        id: link.id,
        slug: link.slug,
        label: link.label,
        fixedAmount: link.fixedAmount,
        userId: link.userId,
        user: {
          name: link.user.name,
          username: link.user.username,
          memberSince: link.user.createdAt,
          completedPayments: link.user._count.transactions,
        },
      },
    });
  } catch (e) {
    console.error("PAY_SLUG:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
