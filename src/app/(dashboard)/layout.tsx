/**
 * Dashboard Layout — Layout wrapper para todas as páginas do dashboard.
 * Inclui a sidebar fixa e o header com breadcrumbs.
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

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* Sidebar - Fixa no desktop, Drawer no mobile */}
      <Sidebar 
        isOpen={isMobileSidebarOpen} 
        onClose={() => setIsMobileSidebarOpen(false)} 
      />

      {/* Overlay para fechar sidebar no mobile */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Main content area */}
      <div className={cn(
        "flex flex-1 flex-col transition-all duration-300 lg:ml-[260px]",
        // Prevê o deslocamento se a sidebar não for fixa? 
        // No nosso caso a sidebar é fixed, então ml-[260px] no desktop está correto.
      )}>
        <Header onMenuClick={() => setIsMobileSidebarOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
