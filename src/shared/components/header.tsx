/**
 * Header — Barra superior do dashboard.
 * Exibe breadcrumbs, busca e ações rápidas.
 */
"use client";

import { usePathname } from "next/navigation";
import { Search, Bell, Plus, Menu } from "lucide-react";
import Link from "next/link";
import { cn } from "@/shared/lib/utils";

const breadcrumbMap: Record<string, string> = {
  "/": "Dashboard",
  "/contacts": "Contatos",
  "/campaigns": "Campanhas",
  "/analytics": "Analytics",
  "/settings": "Configurações",
};

function getBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs = [{ label: "Dashboard", href: "/" }];

  let currentPath = "";
  for (const segment of segments) {
    currentPath += `/${segment}`;
    const label =
      breadcrumbMap[currentPath] ??
      segment.charAt(0).toUpperCase() + segment.slice(1);
    breadcrumbs.push({ label, href: currentPath });
  }

  return breadcrumbs;
}

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname();
  const breadcrumbs = getBreadcrumbs(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-surface-800/60 bg-surface-950/80 px-4 sm:px-6 backdrop-blur-xl">
      {/* Left — Mobile Menu & Breadcrumbs */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-surface-800 bg-surface-900/50 text-surface-400 hover:text-surface-100"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2">
        {breadcrumbs.map((crumb, i) => (
          <div key={crumb.href} className="flex items-center gap-2">
            {i > 0 && (
              <span className="text-surface-600">/</span>
            )}
            {i === breadcrumbs.length - 1 ? (
              <span className="text-sm font-semibold text-surface-100">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="text-sm text-surface-500 transition-colors hover:text-surface-300"
              >
                {crumb.label}
              </Link>
            )}
          </div>
        ))}
        </div>

        {/* Mobile Page Title */}
        <span className="sm:hidden text-sm font-semibold text-surface-100">
          {breadcrumbs[breadcrumbs.length - 1]?.label}
        </span>
      </div>

      {/* Right — Actions */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-500" />
          <input
            type="text"
            placeholder="Buscar contatos, campanhas..."
            className="h-9 w-64 rounded-lg border border-surface-800 bg-surface-900/50 pl-10 pr-4 text-sm text-surface-200 placeholder:text-surface-600 transition-colors focus:border-primary-500/50 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
          />
        </div>

        {/* Notifications */}
        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-surface-800 bg-surface-900/50 text-surface-400 transition-colors hover:border-surface-700 hover:text-surface-200"
          aria-label="Notificações"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary-500 text-[9px] font-bold text-white">
            3
          </span>
        </button>

        {/* Quick add */}
        {(pathname === "/contacts" || pathname === "/campaigns") && (
          <Link
            href={
              pathname === "/contacts"
                ? "/contacts?modal=new"
                : "/campaigns/new"
            }
            className="flex h-9 items-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-medium text-white shadow-lg shadow-primary-500/20 transition-all hover:bg-primary-500 hover:shadow-primary-500/30 active:scale-[0.97]"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">
              {pathname === "/contacts" ? "Novo Contato" : "Nova Campanha"}
            </span>
          </Link>
        )}
      </div>
    </header>
  );
}
