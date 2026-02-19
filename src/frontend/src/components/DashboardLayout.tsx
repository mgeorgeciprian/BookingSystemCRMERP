"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: "📊" },
  { label: "Calendar", href: "/dashboard/calendar", icon: "📅" },
  { label: "Clienti", href: "/dashboard/clients", icon: "👥" },
  { label: "Servicii", href: "/dashboard/services", icon: "✂️" },
  { label: "Echipa", href: "/dashboard/employees", icon: "🧑‍💼" },
  { label: "Facturi", href: "/dashboard/invoices", icon: "🧾" },
  { label: "Notificari", href: "/dashboard/notifications", icon: "💬" },
  { label: "Setari", href: "/dashboard/settings", icon: "⚙️" },
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
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-brand-navy">
        {/* Logo */}
        <div className="flex items-center gap-2 px-6 py-5 border-b border-white/10">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-blue text-lg font-bold text-white">
            B
          </div>
          <div>
            <h1 className="text-base font-bold text-white">
              Booking<span className="text-brand-blue">CRM</span>
            </h1>
            <p className="text-[10px] text-gray-500 font-mono">v0.1.0</p>
          </div>
        </div>

        {/* Business selector */}
        <div className="mx-3 mt-4 rounded-lg bg-white/5 px-3 py-2.5">
          <p className="text-xs text-gray-500">Afacere activa</p>
          <p className="text-sm font-semibold text-white truncate">{businessName}</p>
          {businessVertical && (
            <p className="text-[10px] text-gray-500 capitalize">{businessVertical}</p>
          )}
        </div>

        {/* Navigation */}
        <nav className="mt-6 flex-1 space-y-0.5 px-3 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "bg-brand-blue/20 text-brand-blue font-medium"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Public booking link */}
        {businessSlug && (
          <div className="mx-3 mb-3">
            <Link
              href={`/${businessSlug}`}
              className="flex items-center gap-2 rounded-lg border border-brand-blue/30 bg-brand-blue/10 px-3 py-2 text-xs text-brand-blue hover:bg-brand-blue/20 transition-colors"
            >
              <span>🔗</span>
              <span>Pagina publica booking</span>
            </Link>
          </div>
        )}

        {/* User */}
        <div className="border-t border-white/10 px-3 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-blue text-xs font-bold text-white">
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.full_name || "Utilizator"}
              </p>
              <p className="text-[10px] text-gray-500">{user?.role || ""}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-white transition-colors text-xs"
              title="Deconectare"
            >
              ⬅
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 flex-1 bg-gray-50 min-h-screen">
        {children}
      </main>
    </div>
  );
}
