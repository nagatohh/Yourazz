import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { getAdminSession } from "@/lib/auth/admin";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminSession();
  if (!admin) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-[#030308]">
      <Sidebar />
      <main className="ml-64 min-h-screen p-8">{children}</main>
    </div>
  );
}
