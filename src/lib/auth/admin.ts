import { getSession } from "./index";
import { db } from "@/lib/db";

export async function getAdminSession() {
  const session = await getSession();
  if (!session) return null;

  // Fast path: check role from JWT first
  if (session.role === "ADMIN" || session.role === "ADMIN_OWNER") {
    // Verify against DB (role could have been revoked)
    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { id: true, role: true, status: true },
    });

    if (!user) return null;
    if (user.status !== "ACTIVE") return null;
    if (user.role !== "ADMIN" && user.role !== "ADMIN_OWNER") return null;

    return { userId: user.id, role: user.role as "ADMIN" | "ADMIN_OWNER" };
  }

  return null;
}

export async function getOwnerSession() {
  const session = await getSession();
  if (!session) return null;

  if (session.role !== "ADMIN_OWNER") return null;

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, role: true, status: true },
  });

  if (!user) return null;
  if (user.status !== "ACTIVE") return null;
  if (user.role !== "ADMIN_OWNER") return null;

  return { userId: user.id, role: "ADMIN_OWNER" as const };
}
