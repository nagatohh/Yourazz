import { getSession } from "./index";
import { db } from "@/lib/db";

export async function getAdminSession() {
  const session = await getSession();
  if (!session) return null;
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, role: true, status: true, emailVerified: true },
  });
  if (!user || (user.role !== "ADMIN" && user.role !== "ADMIN_OWNER") || user.status !== "ACTIVE") return null;
  if (!user.emailVerified) return null;
  return { userId: user.id, role: user.role as "ADMIN" | "ADMIN_OWNER" };
}

export async function getOwnerSession() {
  const session = await getSession();
  if (!session) return null;
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, role: true, status: true, emailVerified: true },
  });
  if (!user || user.role !== "ADMIN_OWNER" || user.status !== "ACTIVE" || !user.emailVerified) return null;
  return { userId: user.id, role: user.role as "ADMIN_OWNER" };
}
