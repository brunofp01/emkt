/**
 * Dashboard Layout — Layout wrapper com sidebar e header.
 */
"use client";

import { Sidebar } from "@/shared/components/sidebar";
import { Header } from "@/shared/components/header";
import { useState } from "react";
import { cn } from "@/shared/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col bg-surface-950 overflow-x-hidden">
      <Sidebar 
        isOpen={isMobileSidebarOpen} 
        onClose={() => setIsMobileSidebarOpen(false)}
        collapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />

      {/* Main content area */}
      <div className={cn(
        "flex flex-1 flex-col transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] min-w-0 w-full overflow-x-hidden",
        isCollapsed ? "lg:ml-[72px]" : "lg:ml-[260px]"
      )}>
        <Header onMenuClick={() => setIsMobileSidebarOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 w-full max-w-full">{children}</main>
      </div>
    </div>
  );
}
