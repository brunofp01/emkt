/**
 * Sidebar — Premium navigation with animated active indicator.
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Mail,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Server,
  Zap,
  SendHorizonal,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/contacts", label: "Contatos", icon: Users },
  { href: "/campaigns", label: "Campanhas", icon: Mail },
  { href: "/queue", label: "Fila de Envio", icon: SendHorizonal },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings/providers", label: "Provedores", icon: Server },
] as const;

export function Sidebar({ 
  isOpen, 
  onClose,
  collapsed = false,
  onToggleCollapse
}: { 
  isOpen?: boolean; 
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[59] bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-[60] flex flex-col border-r border-surface-800/40 bg-surface-950/98 backdrop-blur-2xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          collapsed ? "lg:w-[72px]" : "lg:w-[260px]",
          "w-[280px]"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-surface-800/40 px-4">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 via-primary-600 to-accent-600 shadow-lg shadow-primary-500/25">
            <Zap className="h-4.5 w-4.5 text-white" />
          </div>
          <div className={cn(
            "overflow-hidden transition-all duration-300",
            collapsed ? "lg:w-0 lg:opacity-0" : "w-auto opacity-100"
          )}>
            <h1 className="text-sm font-extrabold tracking-tight text-surface-50">
              MailPulse
            </h1>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-surface-500">
              Email Engine
            </p>
          </div>

          {/* Mobile close */}
          <button 
            onClick={onClose}
            className="ml-auto lg:hidden p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800/60 transition-all"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
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
                onClick={onClose}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary-500/10 text-primary-400"
                    : "text-surface-400 hover:bg-surface-800/50 hover:text-surface-200 hover:translate-x-0.5"
                )}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <div className="absolute -left-3 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-primary-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                )}
                
                <Icon
                  className={cn(
                    "h-[18px] w-[18px] flex-shrink-0 transition-all duration-200",
                    isActive
                      ? "text-primary-400"
                      : "text-surface-500 group-hover:text-surface-300"
                  )}
                />
                <span className={cn(
                  "truncate transition-all duration-300",
                  collapsed ? "lg:opacity-0 lg:w-0 lg:hidden" : "opacity-100 w-auto"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Profile area */}
        <div className={cn(
          "border-t border-surface-800/40 p-3 transition-all duration-300",
          collapsed ? "lg:px-2" : ""
        )}>
          <div className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 bg-surface-900/40 border border-surface-800/30",
            collapsed ? "lg:justify-center lg:px-0" : ""
          )}>
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500/20 to-accent-500/20 text-xs font-bold text-primary-400 border border-primary-500/20">
              MP
            </div>
            <div className={cn(
              "min-w-0 overflow-hidden transition-all duration-300",
              collapsed ? "lg:w-0 lg:opacity-0 lg:hidden" : "w-auto opacity-100"
            )}>
              <p className="text-xs font-semibold text-surface-200 truncate">MailPulse Admin</p>
              <p className="text-[10px] text-surface-500 truncate">admin@mailpulse.com</p>
            </div>
          </div>
        </div>

        {/* Collapse toggle (Desktop only) */}
        <div className="hidden lg:block border-t border-surface-800/40 p-2">
          <button
            onClick={onToggleCollapse}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-surface-500 transition-all duration-200 hover:bg-surface-800/50 hover:text-surface-300"
            aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span className="text-xs font-medium">Recolher</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
