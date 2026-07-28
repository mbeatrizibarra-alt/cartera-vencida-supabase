import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function DashboardLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-corporate-gray">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <Topbar title={title} />
        <main className="p-6 max-w-[1600px] mx-auto">{children}</main>
      </div>
    </div>
  );
}
