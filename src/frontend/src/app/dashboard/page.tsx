"use client";

import { useAppStore } from "@/lib/store";
import { appointments as appointmentsApi, employees as employeesApi, dashboard as dashboardApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import {
  MOCK_APPOINTMENTS_TODAY,
  MOCK_STATS,
  MOCK_EMPLOYEES,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { MessageCircle, Smartphone, Mail } from "lucide-react";

export default function DashboardPage() {
  const activeBusiness = useAppStore((s) => s.activeBusiness);
  const user = useAppStore((s) => s.user);
  const businessId = activeBusiness?.id;

  const today = new Date().toISOString().split("T")[0];

  const { data: todayAppointments, isUsingMockData } = useFetch(
    () =>
      businessId
        ? appointmentsApi.list(businessId, { date_from: today, date_to: today })
        : Promise.resolve([]),
    MOCK_APPOINTMENTS_TODAY,
    [businessId, today]
  );

  const { data: employeesList } = useFetch(
    () => (businessId ? employeesApi.list(businessId) : Promise.resolve([])),
    MOCK_EMPLOYEES,
    [businessId]
  );

  const { data: statsData, isUsingMockData: statsUsingMock } = useFetch(
    () => (businessId ? dashboardApi.stats(businessId) : Promise.resolve(null)),
    MOCK_STATS,
    [businessId]
  );
  const s = statsData || MOCK_STATS;
  const appointmentsList = todayAppointments || [];
  const employeesData = employeesList || [];

  const firstName = user?.full_name?.split(" ")[0] || "acolo";

  const todayDate = new Date().toLocaleDateString("ro-RO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">
            <span className="capitalize">{todayDate}</span> &middot; Bine ai revenit, {firstName}!
          </p>
          {isUsingMockData && (
            <p className="mt-1 text-[10px] text-amber-500 font-medium">
              Date demo — backend-ul nu este conectat
            </p>
          )}
        </div>
        <button className="min-h-[44px] rounded-lg bg-brand-orange px-4 py-2 text-sm font-medium text-white hover:bg-brand-orange/90">
          + Programare noua
        </button>
      </div>

      {/* Today's stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Programari azi"
          value={s.today?.appointments ?? appointmentsList.length}
          sub={`${s.today?.completed ?? 0} finalizate, ${s.today?.in_progress ?? 0} in curs`}
          color="blue"
        />
        <StatCard
          label="Venit azi"
          value={`${(s.today?.revenue_today ?? 0).toLocaleString("ro-RO")} RON`}
          sub={`Estimat: ${(s.today?.revenue_expected ?? 0).toLocaleString("ro-RO")} RON`}
          color="green"
          isRevenue
        />
        <StatCard
          label="Venit luna"
          value={`${(s.month?.revenue ?? 0).toLocaleString("ro-RO")} RON`}
          sub={`Media/programare: ${(s.month?.avg_ticket ?? 0).toFixed(0)} RON`}
          color="purple"
          isRevenue
        />
        <StatCard
          label="Rata ocupare"
          value={`${s.month?.occupancy_rate ?? 0}%`}
          sub={`${s.month?.appointments ?? 0} programari in luna`}
          color="amber"
        />
      </div>

      {/* Revenue chart (simple bars) */}
      <div className="mb-6 rounded-xl border bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold text-gray-900">Venit lunar (RON)</h3>
        <div className="flex items-end gap-3 h-40">
          {s.revenue_chart.map((m: any) => {
            const maxRev = Math.max(...s.revenue_chart.map((x: any) => x.revenue));
            const pct = (m.revenue / maxRev) * 100;
            return (
              <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs font-medium text-gray-600 tabular-nums font-mono">
                  {m.revenue >= 1000 ? `${(m.revenue / 1000).toFixed(1)}k` : m.revenue}
                </span>
                <div
                  className="w-full rounded-t-md bg-brand-blue transition-all"
                  style={{ height: `${pct}%`, minHeight: "8px" }}
                />
                <span className="text-[10px] text-gray-400">{m.month}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Today's appointments - 2/3 width */}
        <div className="lg:col-span-2 rounded-xl border bg-white">
          <div className="flex items-center justify-between border-b px-5 py-3.5">
            <h3 className="text-sm font-semibold text-gray-900">
              Programari azi &middot; {new Date().toLocaleDateString("ro-RO", { day: "numeric", month: "short" })}
            </h3>
            <span className="rounded-full bg-brand-blue/10 px-2.5 py-0.5 text-xs font-medium text-brand-blue">
              {appointmentsList.length} total
            </span>
          </div>
          <div className="divide-y max-h-[500px] overflow-y-auto">
            {appointmentsList.length === 0 ? (
              <div className="px-5 py-12 text-center text-gray-400 text-sm">
                Nicio programare azi
              </div>
            ) : (
              appointmentsList.map((apt: any) => (
                <div
                  key={apt.id}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  {/* Time */}
                  <div className="w-16 text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {new Date(apt.start_time).toLocaleTimeString("ro-RO", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="text-[10px] text-gray-400">{apt.duration_minutes} min</p>
                  </div>

                  {/* Color bar */}
                  <div
                    className="w-1 self-stretch rounded-full"
                    style={{
                      backgroundColor: employeesData.find(
                        (e: any) => e.id === apt.employee_id
                      )?.color || "#6b7280",
                    }}
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {apt.client_name || apt.walk_in_name || "Walk-in"}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {apt.service_name} &middot; {apt.employee_name}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900 tabular-nums font-mono">
                      {apt.final_price} RON
                    </p>
                    {apt.payment_status === "paid" && (
                      <p className="text-[10px] text-emerald-600 font-medium">Platit</p>
                    )}
                  </div>

                  {/* Status */}
                  <StatusBadge status={apt.status} type="appointment" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Top services */}
          <div className="rounded-xl border bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">
              Top servicii (luna)
            </h3>
            <div className="space-y-3">
              {s.top_services.map((svc: any, i: number) => (
                <div key={svc.name} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-500">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{svc.name}</p>
                    <p className="text-[10px] text-gray-400">{svc.count} programari</p>
                  </div>
                  <p className="text-sm font-medium text-gray-900 tabular-nums font-mono">
                    {svc.revenue.toLocaleString("ro-RO")} RON
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Notification channels */}
          <div className="rounded-xl border bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">
              Notificari trimise (luna)
            </h3>
            <div className="space-y-3">
              {s.channel_breakdown.map((ch: any) => (
                <div key={ch.channel} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">
                      {ch.channel === "WhatsApp" || ch.channel === "Whatsapp" ? <MessageCircle className="h-5 w-5 text-green-600" /> : ch.channel === "Email" ? <Mail className="h-5 w-5 text-blue-600" /> : <Smartphone className="h-5 w-5 text-gray-600" />}
                    </span>
                    <span className="text-sm text-gray-700">{ch.channel}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{ch.count}</p>
                    <p className="text-[10px] text-gray-400">{ch.cost.toFixed(2)} EUR</p>
                  </div>
                </div>
              ))}
              <div className="border-t pt-2 flex items-center justify-between">
                <span className="text-xs text-gray-500">Total cost</span>
                <span className="text-sm font-bold text-gray-900 tabular-nums font-mono">
                  {s.channel_breakdown.reduce((a: number, b: any) => a + b.cost, 0).toFixed(2)} EUR
                </span>
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="rounded-xl border bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Rapid</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <p className="text-lg font-bold text-brand-navy">{s.total.clients}</p>
                <p className="text-[10px] text-gray-500">Clienti total</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <p className="text-lg font-bold text-brand-green">{s.week.new_clients}</p>
                <p className="text-[10px] text-gray-500">Noi sapt. asta</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <p className="text-lg font-bold text-brand-red">{s.total.no_shows}</p>
                <p className="text-[10px] text-gray-500">No-shows total</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <p className="text-lg font-bold text-brand-blue">{s.week.appointments}</p>
                <p className="text-[10px] text-gray-500">Sapt. aceasta</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  color,
  isRevenue = false,
}: {
  label: string;
  value: string | number;
  sub: string;
  color: "blue" | "green" | "purple" | "amber";
  isRevenue?: boolean;
}) {
  const colorMap = {
    blue: "border-l-brand-blue",
    green: "border-l-brand-green",
    purple: "border-l-purple-500",
    amber: "border-l-amber-500",
  };

  return (
    <div className={cn("rounded-xl border border-l-4 bg-white p-4", colorMap[color])}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold text-gray-900", isRevenue && "tabular-nums font-mono")}>{value}</p>
      <p className={cn("mt-0.5 text-[10px] text-gray-400", isRevenue && "tabular-nums font-mono")}>{sub}</p>
    </div>
  );
}
