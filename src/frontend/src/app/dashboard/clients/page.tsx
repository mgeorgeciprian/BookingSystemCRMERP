"use client";

import { useState, useMemo } from "react";
import { MOCK_CLIENTS } from "@/lib/mock-data";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type FilterKey = "all" | "vip" | "fidela" | "noi" | "blocati";

interface Client {
  id: number;
  full_name: string;
  phone: string;
  email: string | null;
  tags: string[];
  notes: string;
  preferred_channel: string;
  gdpr_consent: boolean;
  gdpr_consent_date: string;
  gdpr_article9_consent: boolean;
  total_appointments: number;
  total_revenue: number;
  no_show_count: number;
  last_visit_at: string;
  is_blocked: boolean;
  blocked_reason?: string;
  source: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Filter chip definitions
// ---------------------------------------------------------------------------
const FILTER_CHIPS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Toti" },
  { key: "vip", label: "VIP" },
  { key: "fidela", label: "Fidela" },
  { key: "noi", label: "Noi" },
  { key: "blocati", label: "Blocati" },
];

// ---------------------------------------------------------------------------
// Tag color mapping
// ---------------------------------------------------------------------------
const TAG_COLORS: Record<string, string> = {
  VIP: "bg-amber-100 text-amber-800 border-amber-300",
  fidela: "bg-emerald-100 text-emerald-800 border-emerald-300",
  noua: "bg-sky-100 text-sky-800 border-sky-300",
  cuplu: "bg-violet-100 text-violet-800 border-violet-300",
  evenimente: "bg-pink-100 text-pink-800 border-pink-300",
  mireasa: "bg-rose-100 text-rose-800 border-rose-300",
  problematic: "bg-red-100 text-red-800 border-red-300",
};

function tagClassName(tag: string): string {
  return TAG_COLORS[tag] ?? "bg-gray-100 text-gray-700 border-gray-300";
}

// ---------------------------------------------------------------------------
// Channel display
// ---------------------------------------------------------------------------
const CHANNEL_LABELS: Record<string, string> = {
  viber: "Viber",
  whatsapp: "WhatsApp",
  sms: "SMS",
  email: "Email",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatRON(value: number): string {
  return value.toLocaleString("ro-RO", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }) + " RON";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isNewClient(createdAt: string): boolean {
  const created = new Date(createdAt);
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  return created >= threeMonthsAgo;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Cast mock data
  const allClients = MOCK_CLIENTS as Client[];

  // ---------- Filtering ----------
  const filtered = useMemo(() => {
    let list = [...allClients];

    // Text search (name, phone, email)
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.full_name.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          (c.email && c.email.toLowerCase().includes(q))
      );
    }

    // Filter chips
    switch (activeFilter) {
      case "vip":
        list = list.filter((c) => c.tags.includes("VIP"));
        break;
      case "fidela":
        list = list.filter((c) => c.tags.includes("fidela"));
        break;
      case "noi":
        list = list.filter((c) => isNewClient(c.created_at));
        break;
      case "blocati":
        list = list.filter((c) => c.is_blocked);
        break;
    }

    // Sort by last_visit_at descending
    list.sort(
      (a, b) =>
        new Date(b.last_visit_at).getTime() -
        new Date(a.last_visit_at).getTime()
    );

    return list;
  }, [allClients, search, activeFilter]);

  // ---------- Stats ----------
  const stats = useMemo(() => {
    const totalRevenue = allClients.reduce((s, c) => s + c.total_revenue, 0);
    const totalAppointments = allClients.reduce(
      (s, c) => s + c.total_appointments,
      0
    );
    const totalNoShows = allClients.reduce((s, c) => s + c.no_show_count, 0);
    const avgAppointments =
      allClients.length > 0
        ? (totalAppointments / allClients.length).toFixed(1)
        : "0";

    return {
      totalClients: allClients.length,
      totalRevenue,
      avgAppointments,
      totalNoShows,
    };
  }, [allClients]);

  // ---------- Handlers ----------
  function toggleRow(id: number) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  // ---------- Render ----------
  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clienti</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestioneaza baza de clienti si istoricul vizitelor
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-blue-light transition-colors"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          + Client nou
        </button>
      </div>

      {/* Stats bar */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Total clienti
          </p>
          <p className="mt-1 text-2xl font-bold text-brand-navy">
            {stats.totalClients}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Venit total
          </p>
          <p className="mt-1 text-2xl font-bold text-brand-green">
            {formatRON(stats.totalRevenue)}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Media programari / client
          </p>
          <p className="mt-1 text-2xl font-bold text-brand-navy">
            {stats.avgAppointments}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            No-shows
          </p>
          <p className="mt-1 text-2xl font-bold text-brand-red">
            {stats.totalNoShows}
          </p>
        </div>
      </div>

      {/* Search + filter chips */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cauta dupa nume, telefon sau email..."
            className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2">
          {FILTER_CHIPS.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => setActiveFilter(chip.key)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                activeFilter === chip.key
                  ? "border-brand-blue bg-brand-blue text-white"
                  : "border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:bg-gray-50"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Result count */}
      <p className="mb-3 text-xs text-gray-500">
        {filtered.length} din {allClients.length} clienti
      </p>

      {/* Client table */}
      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Nume</th>
                <th className="px-4 py-3">Telefon</th>
                <th className="hidden px-4 py-3 md:table-cell">Email</th>
                <th className="px-4 py-3 text-center">Programari</th>
                <th className="px-4 py-3 text-right">Venit total</th>
                <th className="hidden px-4 py-3 lg:table-cell">Ultima vizita</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            {filtered.length === 0 ? (
              <tbody>
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-gray-400"
                  >
                    Niciun client gasit.
                  </td>
                </tr>
              </tbody>
            ) : (
              filtered.map((client) => {
                const isExpanded = expandedId === client.id;
                return (
                  <tbody key={client.id} className="border-b last:border-b-0">
                    {/* Main row */}
                    <tr
                      onClick={() => toggleRow(client.id)}
                      className={`cursor-pointer transition-colors ${
                        client.is_blocked
                          ? "bg-red-50 hover:bg-red-100"
                          : isExpanded
                          ? "bg-blue-50"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {client.full_name}
                          </span>
                          {client.tags.includes("VIP") && (
                            <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 border border-amber-300">
                              VIP
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">
                        {client.phone}
                      </td>
                      <td className="hidden px-4 py-3 text-gray-600 md:table-cell">
                        {client.email ?? (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-gray-900">
                        {client.total_appointments}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {formatRON(client.total_revenue)}
                      </td>
                      <td className="hidden px-4 py-3 text-gray-600 lg:table-cell">
                        {formatDate(client.last_visit_at)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {client.is_blocked ? (
                          <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 border border-red-300">
                            Blocat
                          </span>
                        ) : client.no_show_count >= 2 ? (
                          <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700 border border-yellow-300">
                            Atentie
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 border border-green-300">
                            Activ
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* Expanded detail row */}
                    {isExpanded && (
                      <tr
                        className={
                          client.is_blocked ? "bg-red-50/50" : "bg-blue-50/50"
                        }
                      >
                        <td colSpan={7} className="px-4 pb-4 pt-2">
                          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {/* Tags */}
                            <div>
                              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Etichete
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {client.tags.length === 0 ? (
                                  <span className="text-xs text-gray-400">
                                    Fara etichete
                                  </span>
                                ) : (
                                  client.tags.map((tag) => (
                                    <span
                                      key={tag}
                                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${tagClassName(tag)}`}
                                    >
                                      {tag}
                                    </span>
                                  ))
                                )}
                              </div>
                            </div>

                            {/* Notes */}
                            <div>
                              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Notite
                              </p>
                              <p className="text-sm text-gray-700">
                                {client.notes || (
                                  <span className="text-gray-400">-</span>
                                )}
                              </p>
                              {client.is_blocked && client.blocked_reason && (
                                <p className="mt-1 text-sm font-medium text-red-600">
                                  Motiv blocare: {client.blocked_reason}
                                </p>
                              )}
                            </div>

                            {/* Preferred channel */}
                            <div>
                              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Canal preferat
                              </p>
                              <p className="text-sm font-medium text-gray-700">
                                {CHANNEL_LABELS[client.preferred_channel] ??
                                  client.preferred_channel}
                              </p>
                              <p className="mt-0.5 text-xs text-gray-500">
                                Sursa:{" "}
                                {client.source === "online_booking"
                                  ? "Booking online"
                                  : client.source === "referral"
                                  ? "Recomandare"
                                  : client.source === "manual"
                                  ? "Adaugat manual"
                                  : client.source}
                              </p>
                            </div>

                            {/* GDPR consent */}
                            <div>
                              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Consimtamant GDPR
                              </p>
                              <div className="flex items-center gap-2">
                                {client.gdpr_consent ? (
                                  <span className="inline-flex items-center gap-1 text-sm font-medium text-green-700">
                                    <svg
                                      className="h-4 w-4"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth={2.5}
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="m4.5 12.75 6 6 9-13.5"
                                      />
                                    </svg>
                                    Acordat
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-sm font-medium text-red-600">
                                    <svg
                                      className="h-4 w-4"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth={2.5}
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M6 18 18 6M6 6l12 12"
                                      />
                                    </svg>
                                    Neacordat
                                  </span>
                                )}
                              </div>
                              {client.gdpr_consent && (
                                <p className="mt-0.5 text-xs text-gray-500">
                                  Din {formatDate(client.gdpr_consent_date)}
                                </p>
                              )}
                              <p className="mt-0.5 text-xs text-gray-500">
                                Art. 9 (date sensibile):{" "}
                                {client.gdpr_article9_consent ? "Da" : "Nu"}
                              </p>
                            </div>
                          </div>

                          {/* No-show info */}
                          {client.no_show_count > 0 && (
                            <div className="mt-3 rounded-lg bg-yellow-50 border border-yellow-200 px-3 py-2">
                              <p className="text-xs font-medium text-yellow-800">
                                Neprezentari: {client.no_show_count} din{" "}
                                {client.total_appointments} programari (
                                {(
                                  (client.no_show_count /
                                    client.total_appointments) *
                                  100
                                ).toFixed(0)}
                                %)
                              </p>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                );
              })
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
