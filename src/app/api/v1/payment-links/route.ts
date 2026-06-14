import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/auth/api-key";
import { db } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await authenticateApiKey(req);
  if (!auth) return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });

  const links = await db.paymentLink.findMany({
    where: { userId: auth.userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, slug: true, label: true, description: true, fixedAmount: true, isActive: true, createdAt: true },
  });

  return NextResponse.json({ links });
}

const createSchema = z.object({
  label: z.string().min(2).max(60),
  description: z.string().max(280).optional(),
  fixedAmount: z.number().int().positive().optional(),
});

export async function POST(req: Request) {
  const auth = await authenticateApiKey(req);
  if (!auth) return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });

  const slug = `${auth.userId.slice(-6)}-${Date.now().toString(36)}`;

  const link = await db.paymentLink.create({
    data: {
      userId: auth.userId,
      slug,
      label: parsed.data.label,
      description: parsed.data.description || null,
      fixedAmount: parsed.data.fixedAmount || null,
    },
    select: { id: true, slug: true, label: true, description: true, fixedAmount: true, isActive: true, createdAt: true },
  });

  const base = process.env.NEXT_PUBLIC_APP_URL || "https://yourazz.xyz";
  return NextResponse.json({ link, url: `${base}/pay/${link.slug}` }, { status: 201 });
}
