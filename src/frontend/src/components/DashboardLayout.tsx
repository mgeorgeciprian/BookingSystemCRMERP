"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Scissors,
  UserCog,
  Receipt,
  MessageSquare,
  Settings,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Search,
  LogOut,
  Plus,
  Bell,
  MoreHorizontal,
  BarChart3,
} from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Calendar", href: "/dashboard/calendar", icon: Calendar },
  { label: "Clienti", href: "/dashboard/clients", icon: Users },
  { label: "Servicii", href: "/dashboard/services", icon: Scissors },
  { label: "Echipa", href: "/dashboard/employees", icon: UserCog },
  { label: "Facturi", href: "/dashboard/invoices", icon: Receipt },
  { label: "Rapoarte", href: "/dashboard/reports", icon: BarChart3 },
  { label: "Notificari", href: "/dashboard/notifications", icon: MessageSquare },
  { label: "Setari", href: "/dashboard/settings", icon: Settings },
];

const MOBILE_TAB_ITEMS = [
  { label: "Calendar", href: "/dashboard/calendar", icon: Calendar },
  { label: "Clienti", href: "/dashboard/clients", icon: Users },
  { label: "Facturi", href: "/dashboard/invoices", icon: Receipt },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const activeBusiness = useAppStore((s) => s.activeBusiness);
  const user = useAppStore((s) => s.user);
  const logout = useAppStore((s) => s.logout);
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useAppStore((s) => s.setSidebarCollapsed);

  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

  const businessName = activeBusiness?.name || "Selecteaza afacere";
  const businessSlug = activeBusiness?.slug || "";
  const businessVertical = activeBusiness?.vertical || "";

  const userInitials = user?.full_name
    ? user.full_name
        .split(" ")
        .map((nameFragment: string) => nameFragment[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "??";

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen" data-vertical={businessVertical}>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 hidden md:flex h-screen flex-col bg-brand-navy transition-all duration-200",
          sidebarCollapsed ? "w-sidebar-collapsed" : "w-sidebar"
        )}
      >
        {/* Logo */}
        <div className={cn(
          "flex items-center border-b border-white/10",
          sidebarCollapsed ? "justify-center px-2 py-5" : "gap-2 px-6 py-5"
        )}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-blue text-lg font-bold text-white">
            B
          </div>
          {!sidebarCollapsed && (
            <div>
              <h1 className="text-base font-bold text-white">
                Booking<span className="text-brand-blue-light">CRM</span>
              </h1>
              <p className="text-[10px] text-gray-500 font-mono">v0.2.0</p>
            </div>
          )}
        </div>

        {/* Business selector */}
        {!sidebarCollapsed && (
          <div
            className="mx-3 mt-4 rounded-lg px-3 py-2.5"
            style={{ backgroundColor: businessVertical ? "color-mix(in srgb, var(--vertical-accent) 15%, transparent)" : "rgba(255,255,255,0.05)" }}
          >
            <p className="text-xs text-gray-500">Afacere activa</p>
            <p className="text-sm font-semibold text-white truncate">{businessName}</p>
            {businessVertical && (
              <p className="text-[10px] capitalize" style={{ color: "var(--vertical-accent)" }}>{businessVertical}</p>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className={cn(
          "mt-6 flex-1 space-y-0.5 overflow-y-auto",
          sidebarCollapsed ? "px-1.5" : "px-3"
        )}>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const IconComponent = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={sidebarCollapsed ? item.label : undefined}
                className={cn(
                  "flex items-center rounded-lg min-h-[44px] text-sm transition-colors",
                  sidebarCollapsed
                    ? "justify-center px-2 py-2.5"
                    : "gap-3 px-3 py-2.5",
                  isActive
                    ? "bg-brand-blue/20 text-brand-blue-light font-medium"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <IconComponent className="h-5 w-5 shrink-0" />
                {!sidebarCollapsed && item.label}
              </Link>
            );
          })}
        </nav>

        {/* Public booking link */}
        {businessSlug && !sidebarCollapsed && (
          <div className="mx-3 mb-3">
            <Link
              href={`/${businessSlug}`}
              className="flex items-center gap-2 rounded-lg border border-brand-blue/30 bg-brand-blue/10 px-3 py-2 min-h-[44px] text-xs text-brand-blue-light hover:bg-brand-blue/20 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Pagina publica booking</span>
            </Link>
          </div>
        )}

        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="mx-3 mb-2 flex items-center justify-center rounded-lg min-h-[44px] text-gray-500 hover:bg-white/5 hover:text-white transition-colors"
          title={sidebarCollapsed ? "Extinde sidebar" : "Restringe sidebar"}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <div className="flex items-center gap-2 w-full px-3">
              <ChevronLeft className="h-4 w-4" />
              <span className="text-xs">Restringe</span>
            </div>
          )}
        </button>

        {/* User */}
        <div className={cn(
          "border-t border-white/10 py-4",
          sidebarCollapsed ? "px-1.5" : "px-3"
        )}>
          <div className={cn(
            "flex items-center",
            sidebarCollapsed ? "justify-center" : "gap-3"
          )}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-blue text-xs font-bold text-white">
              {userInitials}
            </div>
            {!sidebarCollapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {user?.full_name || "Utilizator"}
                  </p>
                  <p className="text-[10px] text-gray-500">{user?.role || ""}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="rounded-lg p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-500 hover:bg-white/5 hover:text-white transition-colors"
                  title="Deconectare"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className={cn(
        "flex-1 bg-gray-50 min-h-screen pb-20 md:pb-0 transition-all duration-200",
        sidebarCollapsed ? "md:ml-sidebar-collapsed" : "md:ml-sidebar"
      )}>
        {children}
      </main>

      {/* Mobile Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden items-center justify-around border-t bg-white px-2 py-1 safe-area-bottom shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
        {MOBILE_TAB_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href);
          const IconComponent = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 min-h-[44px] min-w-[44px] justify-center rounded-lg px-3 py-1",
                isActive ? "text-brand-blue" : "text-gray-400"
              )}
            >
              <IconComponent className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}

        {/* Center FAB */}
        <button
          onClick={() => router.push("/dashboard/calendar")}
          className="flex h-14 w-14 -mt-4 items-center justify-center rounded-full bg-brand-orange text-white shadow-lg shadow-orange-200 active:scale-95 transition-transform"
        >
          <Plus className="h-6 w-6" />
        </button>

        {MOBILE_TAB_ITEMS.length > 0 && (
          <button
            onClick={() => setMobileMoreOpen(!mobileMoreOpen)}
            className={cn(
              "flex flex-col items-center gap-0.5 min-h-[44px] min-w-[44px] justify-center rounded-lg px-3 py-1",
              mobileMoreOpen ? "text-brand-blue" : "text-gray-400"
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] font-medium">Mai mult</span>
          </button>
        )}
      </div>

      {/* Mobile "More" overlay */}
      {mobileMoreOpen && (
        <div className="fixed inset-0 z-[60] md:hidden" onClick={() => setMobileMoreOpen(false)}>
          <div className="absolute inset-0 bg-black/20" />
          <div
            className="absolute bottom-[72px] left-4 right-4 rounded-2xl bg-white p-4 shadow-xl animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-4 gap-3">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                const IconComponent = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMoreOpen(false)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl p-3 min-h-[44px] transition-colors",
                      isActive ? "bg-brand-blue/10 text-brand-blue" : "text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    <IconComponent className="h-5 w-5" />
                    <span className="text-[10px] font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Business info + Logout in mobile */}
            <div className="mt-4 border-t pt-4 flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{businessName}</p>
                <p className="text-[10px] text-gray-400">{user?.full_name}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs text-gray-600 hover:bg-gray-50"
              >
                <LogOut className="h-3.5 w-3.5" />
                Iesi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
