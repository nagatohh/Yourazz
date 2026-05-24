import { Sidebar } from "@/components/layout/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#030308]">
      <Sidebar />
      <main className="min-h-screen pt-14 px-4 pb-8 lg:pt-0 lg:pl-64 lg:pr-0 lg:p-8">{children}</main>
    </div>
  );
}
