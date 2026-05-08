/**
 * Header — Premium top bar with clean breadcrumbs.
 */
"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import Link from "next/link";

const breadcrumbMap: Record<string, string> = {
  "/": "Dashboard",
  "/contacts": "Contatos",
  "/campaigns": "Campanhas",
  "/analytics": "Analytics",
  "/settings": "Configurações",
  "/settings/providers": "Provedores",
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
  const pageTitle = breadcrumbs[breadcrumbs.length - 1]?.label;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-surface-800/40 bg-surface-950/80 px-4 sm:px-6 backdrop-blur-xl">
      {/* Left — Mobile Menu & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden flex h-9 w-9 items-center justify-center rounded-xl text-surface-400 hover:text-surface-100 hover:bg-surface-800/60 transition-all"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Desktop breadcrumbs */}
        <div className="hidden sm:flex items-center gap-1.5">
          {breadcrumbs.map((crumb, i) => (
            <div key={crumb.href} className="flex items-center gap-1.5">
              {i > 0 && (
                <span className="text-surface-700 text-xs">›</span>
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

        {/* Mobile page title */}
        <span className="sm:hidden text-sm font-semibold text-surface-100">
          {pageTitle}
        </span>
      </div>

      {/* Right — Status indicator */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-900/60 border border-surface-800/40">
        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-dot-pulse" />
        <span className="text-[10px] font-semibold text-surface-400 uppercase tracking-widest hidden sm:inline">Online</span>
      </div>
    </header>
  );
}
