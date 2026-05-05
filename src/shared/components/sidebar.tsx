/**
 * Sidebar — Navegação principal do dashboard.
 * Server Component que renderiza a sidebar fixa com links de navegação.
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Mail,
  BarChart3,
  Settings,
  Zap,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/shared/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/contacts", label: "Contatos", icon: Users },
  { href: "/campaigns", label: "Campanhas", icon: Mail },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Configurações", icon: Settings },
] as const;

export function Sidebar({ 
  isOpen, 
  onClose 
}: { 
  isOpen?: boolean; 
  onClose?: () => void; 
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-dvh flex flex-col border-r border-surface-800/60 bg-surface-950/95 backdrop-blur-xl transition-all duration-300",
        // Mobile behavior: Slide in/out
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        // Desktop behavior: Collapse/Expand
        collapsed ? "lg:w-[72px]" : "lg:w-[260px]",
        "w-[260px]" // Default width for mobile and expanded desktop
      )}
    >
      {/* Logo & Close (Mobile) */}
      <div className="flex h-16 items-center justify-between border-b border-surface-800/60 px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg shadow-primary-500/20">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div className={cn(
            "overflow-hidden transition-all duration-300",
            collapsed ? "lg:w-0 lg:opacity-0" : "w-auto opacity-100"
          )}>
            <h1 className="text-base font-bold tracking-tight text-surface-50">
              MailPulse
            </h1>
            <p className="text-[10px] font-medium uppercase tracking-widest text-surface-500">
              Email Marketing
            </p>
          </div>
        </div>

        {/* Botão fechar no Mobile */}
        <button 
          onClick={onClose}
          className="lg:hidden p-1 text-surface-400 hover:text-surface-100"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose} // Fecha no mobile ao clicar
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary-500/10 text-primary-400 shadow-sm shadow-primary-500/5"
                  : "text-surface-400 hover:bg-surface-800/60 hover:text-surface-200"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 flex-shrink-0 transition-colors",
                  isActive
                    ? "text-primary-400"
                    : "text-surface-500 group-hover:text-surface-300"
                )}
              />
              <span className={cn(
                "truncate transition-all duration-300",
                collapsed ? "lg:opacity-0 lg:w-0" : "opacity-100 w-auto"
              )}>
                {item.label}
              </span>
              {isActive && (
                <div className={cn(
                  "ml-auto h-1.5 w-1.5 rounded-full bg-primary-400 shadow-sm shadow-primary-400/50",
                  collapsed && "lg:hidden"
                )} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle (Desktop only) */}
      <div className="hidden lg:block border-t border-surface-800/60 p-3">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center rounded-lg px-3 py-2 text-surface-500 transition-colors hover:bg-surface-800/60 hover:text-surface-300"
          aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5" />
              <span className="ml-2 text-sm">Recolher</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
