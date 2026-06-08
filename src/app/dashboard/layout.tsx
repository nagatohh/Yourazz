import { Sidebar } from "@/components/layout/sidebar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#030308]">
      <Sidebar />
      <main className="min-h-screen pt-[60px] px-4 pb-24 sm:px-6 sm:pb-8 lg:pt-8 lg:pl-[calc(256px+2rem)] lg:pr-8">{children}</main>
      <MobileBottomNav />
    </div>
  );
}
