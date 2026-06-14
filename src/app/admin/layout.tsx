import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Sidebar } from "@/components/layout/sidebar";

// Garde serveur du panneau admin (défense en profondeur — les routes API
// vérifient déjà le rôle). Exige : session valide, rôle ADMIN/ADMIN_OWNER,
// compte actif, ET 2FA activée (double authentification obligatoire pour
// l'admin). Un admin sans 2FA est redirigé vers la page sécurité pour
// l'activer (non bloquant : il garde l'accès à son dashboard).
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { role: true, status: true, totpEnabled: true },
  });

  if (!user || user.status !== "ACTIVE") redirect("/login");
  if (user.role !== "ADMIN" && user.role !== "ADMIN_OWNER") redirect("/dashboard");
  if (!user.totpEnabled) redirect("/dashboard/security?require2fa=1");

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Sidebar />
      <main className="min-h-screen pt-[72px] px-4 pb-8 sm:px-6 lg:pt-8 lg:pl-[calc(256px+2rem)] lg:pr-8">
        {children}
      </main>
    </div>
  );
}
