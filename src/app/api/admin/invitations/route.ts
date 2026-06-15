import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminSession, getOwnerSession } from "@/lib/auth/admin";
import { sendInvitationEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import crypto from "crypto";

const createSchema = z.object({
  email: z.string().email(),
  role: z.enum(["USER", "ADMIN"]),
});

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const { allowed } = await rateLimit(`admin-invite:${ip}`, 10, 60000);
    if (!allowed) return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });

    const body = await req.json();
    const { email, role } = createSchema.parse(body);

    if (role === "ADMIN") {
      const owner = await getOwnerSession();
      if (!owner) return NextResponse.json({ error: "Seul le propriétaire peut inviter des admins" }, { status: 403 });
    } else {
      const admin = await getAdminSession();
      if (!admin) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const session = (await getOwnerSession()) || (await getAdminSession());
    if (!session) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) return NextResponse.json({ error: "Cet email a déjà un compte" }, { status: 409 });

    const pendingInvite = await db.invitation.findFirst({
      where: { email, usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (pendingInvite) return NextResponse.json({ error: "Une invitation active existe déjà pour cet email" }, { status: 409 });

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const invitation = await db.invitation.create({
      data: {
        email,
        role: role as any,
        tokenHash,
        invitedBy: session.userId,
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      },
    });

    const inviter = await db.user.findUnique({ where: { id: session.userId }, select: { name: true } });
    await sendInvitationEmail(email, token, inviter?.name || "L'administrateur");

    await db.auditLog.create({
      data: { userId: session.userId, action: "INVITATION_CREATED", target: invitation.id, metadata: { email, role } },
    });

    return NextResponse.json({ invitation: { id: invitation.id, email, role, expiresAt: invitation.expiresAt } });
  } catch (e: any) {
    if (e?.name === "ZodError") return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    console.error("INVITATION_CREATE_ERROR:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const invitations = await db.invitation.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { inviter: { select: { name: true, email: true } } },
  });

  return NextResponse.json({ invitations });
}
