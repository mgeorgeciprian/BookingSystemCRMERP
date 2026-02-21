"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { reports as reportsApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import { MOCK_REPORTS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Users,
  CalendarCheck,
  DollarSign,
  AlertTriangle,
  CreditCard,
  Clock,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  PieChart as RechartsPieChart,
  Pie,
} from "recharts";

const SOURCE_LABELS: Record<string, string> = {
  online: "Online booking",
  manual: "Manual",
  ical_block: "iCal sync",
  recurring: "Recurent",
};

const PAYMENT_LABELS: Record<string, string> = {
  card: "Card",
  cash: "Numerar",
  online: "Online",
  transfer: "Transfer bancar",
  nespecificat: "Nespecificat",
};

const CHART_COLORS = ["#2563eb", "#8b5cf6", "#ec4899", "#f59e0b", "#06b6d4", "#10b981", "#ef4444", "#6366f1"];

type TabKey = "overview" | "employees" | "services" | "clients" | "noshows";

export default function ReportsPage() {
  const activeBusiness = useAppStore((s) => s.activeBusiness);
  const businessId = activeBusiness?.id;

  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const { data: reportsData, isUsingMockData } = useFetch(
    () => (businessId ? reportsApi.overview(businessId, 6) : Promise.resolve(null)),
    MOCK_REPORTS,
    [businessId]
  );

  const reportData = reportsData || MOCK_REPORTS;
  const monthlyData = reportData.monthly_data || [];
  const clientGrowth = reportData.client_growth || [];
  const employeePerformance = reportData.employee_performance || [];
  const topServices = reportData.top_services || [];
  const peakHours = reportData.peak_hours || [];
  const dailyBreakdown = reportData.daily_breakdown || [];
  const noShowAnalysis = reportData.no_show_analysis || {};
  const bookingSources = reportData.booking_sources || [];
  const paymentBreakdown = reportData.payment_breakdown || [];
  const invoicingStats = reportData.invoicing || {};
  const periodInfo = reportData.period || {};

  // Compute summary from monthly data
  const currentMonth = monthlyData[monthlyData.length - 1] || {};
  const previousMonth = monthlyData[monthlyData.length - 2] || {};

  const revenueChange = previousMonth.revenue
    ? ((currentMonth.revenue - previousMonth.revenue) / previousMonth.revenue * 100).toFixed(1)
    : "0";
  const appointmentChange = previousMonth.total_appointments
    ? ((currentMonth.total_appointments - previousMonth.total_appointments) / previousMonth.total_appointments * 100).toFixed(1)
    : "0";

  const currentNewClients = clientGrowth[clientGrowth.length - 1]?.new_clients || 0;
  const previousNewClients = clientGrowth[clientGrowth.length - 2]?.new_clients || 0;
  const clientChange = previousNewClients
    ? ((currentNewClients - previousNewClients) / previousNewClients * 100).toFixed(1)
    : "0";

  const tabs: { key: TabKey; label: string }[] = [
    { key: "overview", label: "Sumar" },
    { key: "employees", label: "Echipa" },
    { key: "services", label: "Servicii" },
    { key: "clients", label: "Clienti" },
    { key: "noshows", label: "No-shows" },
  ];

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Rapoarte & Analize</h1>
        <p className="text-sm text-gray-500">
          {periodInfo.current_month} {periodInfo.current_year} &middot; Ultimele {periodInfo.months || 6} luni
        </p>
        {isUsingMockData && (
          <p className="mt-1 text-[10px] text-amber-500 font-medium">
            Date demo — backend-ul nu este conectat
          </p>
        )}
      </div>

      {/* Tab bar */}
      <div className="mb-6 flex gap-1 rounded-xl bg-gray-100 p-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap min-h-[40px]",
              activeTab === tab.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard
              label="Venit luna"
              value={`${(currentMonth.revenue || 0).toLocaleString("ro-RO")} RON`}
              change={Number(revenueChange)}
              icon={<DollarSign className="h-5 w-5" />}
              iconColor="text-emerald-600"
              iconBg="bg-emerald-100"
            />
            <KPICard
              label="Programari"
              value={String(currentMonth.total_appointments || 0)}
              change={Number(appointmentChange)}
              icon={<CalendarCheck className="h-5 w-5" />}
              iconColor="text-blue-600"
              iconBg="bg-blue-100"
            />
            <KPICard
              label="Clienti noi"
              value={String(currentNewClients)}
              change={Number(clientChange)}
              icon={<Users className="h-5 w-5" />}
              iconColor="text-purple-600"
              iconBg="bg-purple-100"
            />
            <KPICard
              label="Rata no-show"
              value={`${noShowAnalysis.overall_rate || 0}%`}
              change={-1.2}
              invertColor
              icon={<AlertTriangle className="h-5 w-5" />}
              iconColor="text-amber-600"
              iconBg="bg-amber-100"
            />
          </div>

          {/* Revenue Chart */}
          <div className="rounded-xl border bg-white p-5">
            <h3 className="mb-1 text-sm font-semibold text-gray-900">Evolutie venituri si programari</h3>
            <p className="mb-4 text-[10px] text-gray-400">Ultimele {monthlyData.length} luni</p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="#9ca3af" tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: "12px" }}
                    formatter={(value: number, name: string) => {
                      if (name === "revenue") return [`${value.toLocaleString("ro-RO")} RON`, "Venit"];
                      if (name === "total_appointments") return [value, "Programari"];
                      if (name === "completed") return [value, "Finalizate"];
                      return [value, name];
                    }}
                  />
                  <Legend
                    formatter={(value) => {
                      const labels: Record<string, string> = { revenue: "Venit (RON)", total_appointments: "Programari", completed: "Finalizate" };
                      return <span className="text-xs">{labels[value] || value}</span>;
                    }}
                  />
                  <Bar yAxisId="left" dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="total_appointments" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Daily trend (last 30 days) */}
            <div className="rounded-xl border bg-white p-5">
              <h3 className="mb-1 text-sm font-semibold text-gray-900">Venit zilnic (30 zile)</h3>
              <p className="mb-4 text-[10px] text-gray-400">RON / zi</p>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyBreakdown}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      stroke="#9ca3af"
                      tickFormatter={(dateStr) => {
                        const dateObj = new Date(dateStr);
                        return `${dateObj.getDate()}/${dateObj.getMonth() + 1}`;
                      }}
                      interval={4}
                    />
                    <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" />
                    <Tooltip
                      contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: "12px" }}
                      labelFormatter={(label) => {
                        const dateObj = new Date(label);
                        return dateObj.toLocaleDateString("ro-RO", { weekday: "short", day: "numeric", month: "short" });
                      }}
                      formatter={(value: number) => [`${value.toLocaleString("ro-RO")} RON`, "Venit"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#2563eb"
                      strokeWidth={2}
                      fill="url(#revenueGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Booking sources pie */}
            <div className="rounded-xl border bg-white p-5">
              <h3 className="mb-1 text-sm font-semibold text-gray-900">Surse programari</h3>
              <p className="mb-4 text-[10px] text-gray-400">Luna curenta</p>
              <div className="flex items-center gap-6">
                <div className="h-40 w-40 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={bookingSources.map((sourceItem: any) => ({
                          ...sourceItem,
                          name: SOURCE_LABELS[sourceItem.source] || sourceItem.source,
                        }))}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={65}
                        paddingAngle={3}
                      >
                        {bookingSources.map((_: any, index: number) => (
                          <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: "12px" }}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 flex-1">
                  {bookingSources.map((sourceItem: any, index: number) => {
                    const totalCount = bookingSources.reduce((acc: number, item: any) => acc + item.count, 0);
                    const sourcePercent = totalCount > 0 ? ((sourceItem.count / totalCount) * 100).toFixed(0) : 0;
                    return (
                      <div key={sourceItem.source} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                          <span className="text-xs text-gray-600">{SOURCE_LABELS[sourceItem.source] || sourceItem.source}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-semibold text-gray-900">{sourceItem.count}</span>
                          <span className="ml-1 text-[10px] text-gray-400">({sourcePercent}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Payment breakdown */}
            <div className="rounded-xl border bg-white p-5">
              <h3 className="mb-4 text-sm font-semibold text-gray-900">Metode de plata</h3>
              <div className="space-y-3">
                {paymentBreakdown.map((paymentItem: any) => {
                  const maxPaymentTotal = Math.max(...paymentBreakdown.map((item: any) => item.total));
                  const paymentBarWidth = maxPaymentTotal > 0 ? (paymentItem.total / maxPaymentTotal) * 100 : 0;
                  return (
                    <div key={paymentItem.method}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600">{PAYMENT_LABELS[paymentItem.method] || paymentItem.method}</span>
                        <div className="text-right">
                          <span className="text-xs font-semibold text-gray-900 tabular-nums font-mono">
                            {paymentItem.total.toLocaleString("ro-RO")} RON
                          </span>
                          <span className="ml-1.5 text-[10px] text-gray-400">({paymentItem.count})</span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100">
                        <div
                          className="h-2 rounded-full bg-brand-blue transition-all"
                          style={{ width: `${paymentBarWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Invoicing stats */}
            <div className="rounded-xl border bg-white p-5">
              <h3 className="mb-4 text-sm font-semibold text-gray-900">Facturare</h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-lg bg-gray-50 p-3 text-center">
                  <p className="text-2xl font-bold text-gray-900">{invoicingStats.total || 0}</p>
                  <p className="text-[10px] text-gray-500">Facturi emise</p>
                </div>
                <div className="rounded-lg bg-emerald-50 p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-700">{invoicingStats.paid || 0}</p>
                  <p className="text-[10px] text-emerald-600">Platite</p>
                </div>
                <div className="rounded-lg bg-amber-50 p-3 text-center">
                  <p className="text-2xl font-bold text-amber-700">{invoicingStats.sent || 0}</p>
                  <p className="text-[10px] text-amber-600">Trimise</p>
                </div>
                <div className="rounded-lg bg-red-50 p-3 text-center">
                  <p className="text-2xl font-bold text-red-700">{invoicingStats.overdue || 0}</p>
                  <p className="text-[10px] text-red-600">Restante</p>
                </div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">Rata incasare</span>
                  <span className="text-sm font-bold text-gray-900">{invoicingStats.collection_rate || 0}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-gray-100">
                  <div
                    className="h-2.5 rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${invoicingStats.collection_rate || 0}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-[10px] text-gray-400">
                  <span>Incasat: {(invoicingStats.paid_amount || 0).toLocaleString("ro-RO")} RON</span>
                  <span>Total: {(invoicingStats.total_amount || 0).toLocaleString("ro-RO")} RON</span>
                </div>
              </div>
            </div>
          </div>

          {/* Peak hours heatmap */}
          <div className="rounded-xl border bg-white p-5">
            <h3 className="mb-1 text-sm font-semibold text-gray-900">Ore de varf</h3>
            <p className="mb-4 text-[10px] text-gray-400">Distributia programarilor pe ore si zile (luna curenta)</p>
            <PeakHoursHeatmap data={peakHours} />
          </div>
        </div>
      )}

      {/* Employees Tab */}
      {activeTab === "employees" && (
        <div className="space-y-6">
          {/* Employee performance chart */}
          <div className="rounded-xl border bg-white p-5">
            <h3 className="mb-1 text-sm font-semibold text-gray-900">Performanta echipa</h3>
            <p className="mb-4 text-[10px] text-gray-400">Venit generat luna curenta (RON)</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={employeePerformance} layout="vertical" barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="#9ca3af" tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} stroke="#9ca3af" width={80} />
                  <Tooltip
                    contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: "12px" }}
                    formatter={(value: number) => [`${value.toLocaleString("ro-RO")} RON`, "Venit"]}
                  />
                  <Bar dataKey="revenue" radius={[0, 6, 6, 0]}>
                    {employeePerformance.map((employee: any, index: number) => (
                      <Cell key={index} fill={employee.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Employee table */}
          <div className="rounded-xl border bg-white overflow-hidden">
            <div className="border-b px-5 py-3.5">
              <h3 className="text-sm font-semibold text-gray-900">Detalii performanta</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left">
                    <th className="px-5 py-3 text-xs font-medium text-gray-500">Angajat</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 text-right">Programari</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 text-right">Finalizate</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 text-right">Anulari</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 text-right">No-show</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 text-right">Venit</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 text-right">Rata finalizare</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {employeePerformance.map((employee: any) => (
                    <tr key={employee.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="h-3 w-3 rounded-full shrink-0"
                            style={{ backgroundColor: employee.color }}
                          />
                          <span className="font-medium text-gray-900">{employee.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 tabular-nums">{employee.total_appointments}</td>
                      <td className="px-4 py-3 text-right text-emerald-600 font-medium tabular-nums">{employee.completed}</td>
                      <td className="px-4 py-3 text-right text-gray-500 tabular-nums">{employee.cancelled}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <span className={employee.no_shows > 0 ? "text-red-600 font-medium" : "text-gray-400"}>
                          {employee.no_shows}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900 tabular-nums font-mono">
                        {employee.revenue.toLocaleString("ro-RO")} RON
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          employee.completion_rate >= 85
                            ? "bg-emerald-100 text-emerald-700"
                            : employee.completion_rate >= 70
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                        )}>
                          {employee.completion_rate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Services Tab */}
      {activeTab === "services" && (
        <div className="space-y-6">
          {/* Top services chart */}
          <div className="rounded-xl border bg-white p-5">
            <h3 className="mb-1 text-sm font-semibold text-gray-900">Top servicii dupa venit</h3>
            <p className="mb-4 text-[10px] text-gray-400">Luna curenta (RON)</p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topServices}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#9ca3af" interval={0} angle={-15} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: "12px" }}
                    formatter={(value: number, name: string) => {
                      if (name === "revenue") return [`${value.toLocaleString("ro-RO")} RON`, "Venit"];
                      if (name === "appointment_count") return [value, "Programari"];
                      return [value, name];
                    }}
                  />
                  <Legend formatter={(value) => <span className="text-xs">{value === "revenue" ? "Venit" : "Programari"}</span>} />
                  <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="appointment_count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Service ranking table */}
          <div className="rounded-xl border bg-white overflow-hidden">
            <div className="border-b px-5 py-3.5">
              <h3 className="text-sm font-semibold text-gray-900">Clasament servicii</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left">
                    <th className="px-5 py-3 text-xs font-medium text-gray-500 w-8">#</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500">Serviciu</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 text-right">Programari</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 text-right">Venit total</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 text-right">Pret mediu</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 text-right">% din venit</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {topServices.map((serviceItem: any, index: number) => {
                    const totalServiceRevenue = topServices.reduce((acc: number, item: any) => acc + item.revenue, 0);
                    const revenuePercent = totalServiceRevenue > 0
                      ? ((serviceItem.revenue / totalServiceRevenue) * 100).toFixed(1)
                      : "0";
                    return (
                      <tr key={serviceItem.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3">
                          <span className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold",
                            index === 0 ? "bg-amber-100 text-amber-700" :
                            index === 1 ? "bg-gray-200 text-gray-600" :
                            index === 2 ? "bg-orange-100 text-orange-700" :
                            "bg-gray-100 text-gray-400"
                          )}>
                            {index + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: serviceItem.color || "#6b7280" }} />
                            <span className="font-medium text-gray-900">{serviceItem.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700 tabular-nums">{serviceItem.appointment_count}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900 tabular-nums font-mono">
                          {serviceItem.revenue.toLocaleString("ro-RO")} RON
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600 tabular-nums font-mono">
                          {serviceItem.avg_price} RON
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-gray-100">
                              <div className="h-1.5 rounded-full bg-brand-blue" style={{ width: `${revenuePercent}%` }} />
                            </div>
                            <span className="text-xs text-gray-500 tabular-nums">{revenuePercent}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Clients Tab */}
      {activeTab === "clients" && (
        <div className="space-y-6">
          {/* Client growth chart */}
          <div className="rounded-xl border bg-white p-5">
            <h3 className="mb-1 text-sm font-semibold text-gray-900">Crestere baza de clienti</h3>
            <p className="mb-4 text-[10px] text-gray-400">Clienti noi vs. total</p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={clientGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: "12px" }}
                    formatter={(value: number, name: string) => {
                      if (name === "total_clients") return [value, "Total clienti"];
                      if (name === "new_clients") return [value, "Clienti noi"];
                      return [value, name];
                    }}
                  />
                  <Legend formatter={(value) => <span className="text-xs">{value === "total_clients" ? "Total clienti" : "Clienti noi"}</span>} />
                  <Line yAxisId="left" type="monotone" dataKey="total_clients" stroke="#2563eb" strokeWidth={2.5} dot={{ fill: "#2563eb", r: 4 }} />
                  <Line yAxisId="right" type="monotone" dataKey="new_clients" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="4 4" dot={{ fill: "#8b5cf6", r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Client stats grid */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border bg-white p-5 text-center">
              <p className="text-3xl font-bold text-brand-blue tabular-nums">
                {clientGrowth[clientGrowth.length - 1]?.total_clients || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">Total clienti</p>
            </div>
            <div className="rounded-xl border bg-white p-5 text-center">
              <p className="text-3xl font-bold text-purple-600 tabular-nums">
                {clientGrowth.reduce((acc: number, item: any) => acc + item.new_clients, 0)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Clienti noi ({periodInfo.months || 6} luni)</p>
            </div>
            <div className="rounded-xl border bg-white p-5 text-center">
              <p className="text-3xl font-bold text-emerald-600 tabular-nums">
                {clientGrowth.length > 0
                  ? Math.round(clientGrowth.reduce((acc: number, item: any) => acc + item.new_clients, 0) / clientGrowth.length)
                  : 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">Media lunara clienti noi</p>
            </div>
          </div>
        </div>
      )}

      {/* No-shows Tab */}
      {activeTab === "noshows" && (
        <div className="space-y-6">
          {/* No-show KPIs */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border bg-white p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="rounded-lg bg-red-100 p-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">No-shows luna</p>
                  <p className="text-2xl font-bold text-gray-900">{noShowAnalysis.total_no_shows || 0}</p>
                </div>
              </div>
              <p className="text-xs text-gray-400">
                din {noShowAnalysis.total_scheduled || 0} programari ({noShowAnalysis.overall_rate || 0}%)
              </p>
            </div>
            <div className="rounded-xl border bg-white p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="rounded-lg bg-amber-100 p-2">
                  <DollarSign className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Venit pierdut estimat</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {((noShowAnalysis.total_no_shows || 0) * (currentMonth.revenue / (currentMonth.completed || 1))).toLocaleString("ro-RO", { maximumFractionDigits: 0 })} RON
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-400">Bazat pe pretul mediu / programare</p>
            </div>
            <div className="rounded-xl border bg-white p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="rounded-lg bg-emerald-100 p-2">
                  <TrendingDown className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Target no-show</p>
                  <p className="text-2xl font-bold text-emerald-600">&lt; 3%</p>
                </div>
              </div>
              <p className="text-xs text-gray-400">
                {(noShowAnalysis.overall_rate || 0) <= 3
                  ? "Esti in tinta! Excelent."
                  : `Trebuie redus cu ${((noShowAnalysis.overall_rate || 0) - 3).toFixed(1)} puncte procentuale`}
              </p>
            </div>
          </div>

          {/* No-show by source */}
          <div className="rounded-xl border bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">No-shows dupa sursa programare</h3>
            <div className="space-y-4">
              {(noShowAnalysis.by_source || []).map((sourceItem: any) => (
                <div key={sourceItem.source}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-gray-700">{SOURCE_LABELS[sourceItem.source] || sourceItem.source}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">{sourceItem.no_shows} / {sourceItem.total}</span>
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        sourceItem.rate <= 3
                          ? "bg-emerald-100 text-emerald-700"
                          : sourceItem.rate <= 6
                          ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-700"
                      )}>
                        {sourceItem.rate}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div
                      className={cn(
                        "h-2 rounded-full transition-all",
                        sourceItem.rate <= 3 ? "bg-emerald-500" : sourceItem.rate <= 6 ? "bg-amber-500" : "bg-red-500"
                      )}
                      style={{ width: `${Math.min(sourceItem.rate * 5, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* No-show monthly trend */}
          <div className="rounded-xl border bg-white p-5">
            <h3 className="mb-1 text-sm font-semibold text-gray-900">Trend no-shows lunar</h3>
            <p className="mb-4 text-[10px] text-gray-400">Numar si procent</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: "12px" }}
                    formatter={(value: number, name: string) => {
                      if (name === "no_shows") return [value, "No-shows"];
                      if (name === "cancelled") return [value, "Anulari"];
                      return [value, name];
                    }}
                  />
                  <Legend formatter={(value) => <span className="text-xs">{value === "no_shows" ? "No-shows" : "Anulari"}</span>} />
                  <Bar dataKey="no_shows" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cancelled" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tips */}
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">Cum reduci no-show-urile</h3>
            <ul className="space-y-1.5 text-xs text-blue-700">
              <li>1. <strong>Reminder WhatsApp la 24h si 1h</strong> &mdash; 98% rata deschidere (activ)</li>
              <li>2. <strong>Depozit la programare</strong> &mdash; reduce no-show cu 50%+ (in curand)</li>
              <li>3. <strong>Politica anulare clara</strong> &mdash; afisata la booking si in reminder</li>
              <li>4. <strong>Lista de asteptare</strong> &mdash; umple automat sloturile anulate (in curand)</li>
              <li>5. <strong>Blocare clienti recidivisti</strong> &mdash; 3+ no-shows = blocare automata</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Sub-components ---- */

function KPICard({
  label,
  value,
  change,
  icon,
  iconColor,
  iconBg,
  invertColor = false,
}: {
  label: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  invertColor?: boolean;
}) {
  const isPositive = invertColor ? change < 0 : change > 0;
  const isNeutral = change === 0;

  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <div className={cn("rounded-lg p-2", iconBg)}>
          <span className={iconColor}>{icon}</span>
        </div>
        {!isNeutral && (
          <div className={cn(
            "flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium",
            isPositive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
          )}>
            {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(change)}%
          </div>
        )}
        {isNeutral && (
          <div className="flex items-center gap-0.5 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
            <Minus className="h-3 w-3" />
            0%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

function PeakHoursHeatmap({ data }: { data: any[] }) {
  const days = ["Luni", "Marti", "Miercuri", "Joi", "Vineri", "Sambata", "Duminica"];
  const hours = Array.from({ length: 15 }, (_, i) => i + 7); // 07:00 - 21:00
  const maxCount = Math.max(...data.map((item) => item.count), 1);

  const getColor = (count: number) => {
    if (count === 0) return "bg-gray-50";
    const intensity = count / maxCount;
    if (intensity <= 0.2) return "bg-blue-100";
    if (intensity <= 0.4) return "bg-blue-200";
    if (intensity <= 0.6) return "bg-blue-300 text-white";
    if (intensity <= 0.8) return "bg-blue-500 text-white";
    return "bg-blue-700 text-white";
  };

  const getCount = (dayIndex: number, hour: number) => {
    const found = data.find((item) => item.day_index === dayIndex && item.hour === hour);
    return found ? found.count : 0;
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        {/* Hour headers */}
        <div className="flex">
          <div className="w-20 shrink-0" />
          {hours.map((hour) => (
            <div key={hour} className="flex-1 text-center text-[10px] text-gray-400 pb-1">
              {hour}:00
            </div>
          ))}
        </div>
        {/* Day rows */}
        {days.map((dayLabel, dayIndex) => (
          <div key={dayLabel} className="flex items-center gap-0.5 mb-0.5">
            <div className="w-20 shrink-0 text-xs text-gray-500 text-right pr-2">{dayLabel}</div>
            {hours.map((hour) => {
              const count = getCount(dayIndex, hour);
              return (
                <div
                  key={hour}
                  className={cn(
                    "flex-1 h-8 rounded-sm flex items-center justify-center text-[10px] font-medium transition-colors",
                    getColor(count)
                  )}
                  title={`${dayLabel} ${hour}:00 - ${count} programari`}
                >
                  {count > 0 ? count : ""}
                </div>
              );
            })}
          </div>
        ))}
        {/* Legend */}
        <div className="flex items-center justify-end gap-1 mt-3 pr-1">
          <span className="text-[10px] text-gray-400 mr-1">Mai putine</span>
          <div className="h-3 w-5 rounded-sm bg-gray-50" />
          <div className="h-3 w-5 rounded-sm bg-blue-100" />
          <div className="h-3 w-5 rounded-sm bg-blue-200" />
          <div className="h-3 w-5 rounded-sm bg-blue-300" />
          <div className="h-3 w-5 rounded-sm bg-blue-500" />
          <div className="h-3 w-5 rounded-sm bg-blue-700" />
          <span className="text-[10px] text-gray-400 ml-1">Mai multe</span>
        </div>
      </div>
    </div>
  );
}
