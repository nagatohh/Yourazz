import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

// Garde serveur : le middleware vérifie déjà le JWT ; ici on vérifie le
// statut de compte en DB. Le plan STARTER étant gratuit, l'abonnement
// n'est plus exigé pour accéder au dashboard — il plafonne seulement
// le volume d'encaissement mensuel.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  if (!s) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: s.userId },
    select: { role: true, status: true },
  });
  if (!user || user.status !== "ACTIVE") redirect("/login");

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Sidebar />
      <main className="min-h-screen pt-[60px] px-4 pb-24 sm:px-6 sm:pb-8 lg:pt-8 lg:pl-[calc(256px+2rem)] lg:pr-8">{children}</main>
      <MobileBottomNav />
    </div>
  );
}
