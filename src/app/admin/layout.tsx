import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { getAdminSession } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let isAdmin = false;
  try {
    const admin = await getAdminSession();
    isAdmin = !!admin;
  } catch {
    isAdmin = false;
  }

  if (!isAdmin) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-[#030308]">
      <Sidebar />
      <main className="ml-64 min-h-screen p-8">{children}</main>
    </div>
  );
}
