import { getSession } from "./index";
import { db } from "@/lib/db";

export async function getAdminSession() {
  const session = await getSession();
  if (!session) return null;

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, role: true, status: true },
  });

  if (!user || user.role !== "ADMIN" || user.status !== "ACTIVE") return null;
  return { userId: user.id, role: user.role };
}
