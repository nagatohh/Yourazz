import { Sidebar } from "@/components/layout/sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#030308]">
      <Sidebar />
      <main className="min-h-screen pt-[72px] px-4 pb-8 sm:px-6 lg:pt-8 lg:pl-[calc(256px+2rem)] lg:pr-8">
        {children}
      </main>
    </div>
  );
}
