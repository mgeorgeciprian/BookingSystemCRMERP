"use client";

import { useState, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { clients as clientsApi, appointments as appointmentsApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import { MOCK_CLIENTS, MOCK_APPOINTMENTS_TODAY } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Search, X } from "lucide-react";

// ============================================================
// Types
// ============================================================
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
  notifications_enabled?: boolean;
  preferred_employee_id?: number | null;
}

// ============================================================
// Constants
// ============================================================
const FILTER_CHIPS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Toti" },
  { key: "vip", label: "VIP" },
  { key: "fidela", label: "Fideli" },
  { key: "noi", label: "Noi" },
  { key: "blocati", label: "Blocati" },
];

const TAG_COLORS: Record<string, string> = {
  VIP: "bg-amber-100 text-amber-800 border-amber-300",
  fidela: "bg-emerald-100 text-emerald-800 border-emerald-300",
  noua: "bg-sky-100 text-sky-800 border-sky-300",
  cuplu: "bg-violet-100 text-violet-800 border-violet-300",
  evenimente: "bg-pink-100 text-pink-800 border-pink-300",
  mireasa: "bg-rose-100 text-rose-800 border-rose-300",
  problematic: "bg-red-100 text-red-800 border-red-300",
};

const CHANNEL_LABELS: Record<string, string> = {
  viber: "Viber",
  whatsapp: "WhatsApp",
  sms: "SMS",
  email: "Email",
};

// ============================================================
// Helpers
// ============================================================
function tagClassName(tag: string): string {
  return TAG_COLORS[tag] ?? "bg-gray-100 text-gray-700 border-gray-300";
}

function formatRON(value: number): string {
  return value.toLocaleString("ro-RO", { style: "decimal", minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " RON";
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("ro-RO", { day: "2-digit", month: "short", year: "numeric" });
}

function isNewClient(createdAt: string): boolean {
  const created = new Date(createdAt);
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  return created >= threeMonthsAgo;
}

// ============================================================
// Component
// ============================================================
export default function ClientsPage() {
  const activeBusiness = useAppStore((s) => s.activeBusiness);
  const businessId = activeBusiness?.id;

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [showDetailClient, setShowDetailClient] = useState<Client | null>(null);

  // Data fetching
  const { data: clientsData, isUsingMockData, refetch: refetchClients } = useFetch(
    () => (businessId ? clientsApi.list(businessId) : Promise.resolve([])),
    MOCK_CLIENTS,
    [businessId]
  );

  const allClients = (clientsData || []) as Client[];

  // Filtering
  const filtered = useMemo(() => {
    let list = [...allClients];

    if (search.trim()) {
      const searchQueryLower = search.trim().toLowerCase();
      list = list.filter(
        (client) =>
          client.full_name.toLowerCase().includes(searchQueryLower) ||
          client.phone?.toLowerCase().includes(searchQueryLower) ||
          (client.email && client.email.toLowerCase().includes(searchQueryLower))
      );
    }

    switch (activeFilter) {
      case "vip":
        list = list.filter((client) => client.tags?.includes("VIP"));
        break;
      case "fidela":
        list = list.filter((client) => client.tags?.includes("fidela"));
        break;
      case "noi":
        list = list.filter((client) => isNewClient(client.created_at));
        break;
      case "blocati":
        list = list.filter((client) => client.is_blocked);
        break;
    }

    list.sort((a, b) => new Date(b.last_visit_at || 0).getTime() - new Date(a.last_visit_at || 0).getTime());
    return list;
  }, [allClients, search, activeFilter]);

  // Stats
  const stats = useMemo(() => {
    const totalRevenue = allClients.reduce((sum, client) => sum + (client.total_revenue || 0), 0);
    const totalAppointments = allClients.reduce((sum, client) => sum + (client.total_appointments || 0), 0);
    const totalNoShows = allClients.reduce((sum, client) => sum + (client.no_show_count || 0), 0);
    const averageAppointments = allClients.length > 0 ? (totalAppointments / allClients.length).toFixed(1) : "0";
    return { totalClients: allClients.length, totalRevenue, averageAppointments, totalNoShows };
  }, [allClients]);

  function toggleRow(clientId: number) {
    setExpandedId((prevId) => (prevId === clientId ? null : clientId));
  }

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setShowClientModal(true);
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clienti</h1>
          <p className="mt-1 text-sm text-gray-500">Gestioneaza baza de clienti si istoricul vizitelor</p>
          {isUsingMockData && (
            <p className="mt-1 text-[10px] text-amber-500 font-medium">Date demo &mdash; backend-ul nu este conectat</p>
          )}
        </div>
        <button
          onClick={() => {
            setEditingClient(null);
            setShowClientModal(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-blue px-4 py-2.5 min-h-[44px] text-sm font-medium text-white shadow-sm hover:bg-brand-blue-light transition-colors"
        >
          + Client nou
        </button>
      </div>

      {/* Stats bar */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total clienti</p>
          <p className="mt-1 text-2xl font-bold text-brand-navy">{stats.totalClients}</p>
        </div>
        <div className="rounded-xl border bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Venit total</p>
          <p className="mt-1 text-2xl font-bold text-brand-green">{formatRON(stats.totalRevenue)}</p>
        </div>
        <div className="rounded-xl border bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Media programari / client</p>
          <p className="mt-1 text-2xl font-bold text-brand-navy">{stats.averageAppointments}</p>
        </div>
        <div className="rounded-xl border bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">No-shows</p>
          <p className="mt-1 text-2xl font-bold text-brand-red">{stats.totalNoShows}</p>
        </div>
      </div>

      {/* Search + filter chips */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(changeEvent) => setSearch(changeEvent.target.value)}
            placeholder="Cauta dupa nume, telefon sau email..."
            className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTER_CHIPS.map((chip) => (
            <button
              key={chip.key}
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

      <p className="mb-3 text-xs text-gray-500">{filtered.length} din {allClients.length} clienti</p>

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
                <th className="px-4 py-3 text-center">Actiuni</th>
              </tr>
            </thead>
            {filtered.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">Niciun client gasit.</td>
                </tr>
              </tbody>
            ) : (
              filtered.map((client) => {
                const isExpanded = expandedId === client.id;
                return (
                  <tbody key={client.id} className="border-b last:border-b-0">
                    <tr
                      onClick={() => toggleRow(client.id)}
                      className={`cursor-pointer transition-colors ${
                        client.is_blocked ? "bg-red-50 hover:bg-red-100" : isExpanded ? "bg-blue-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{client.full_name}</span>
                          {client.tags?.includes("VIP") && (
                            <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 border border-amber-300">VIP</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{client.phone}</td>
                      <td className="hidden px-4 py-3 text-gray-600 md:table-cell">
                        {client.email ?? <span className="text-gray-300">-</span>}
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-gray-900">{client.total_appointments}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">{formatRON(client.total_revenue || 0)}</td>
                      <td className="hidden px-4 py-3 text-gray-600 lg:table-cell">
                        {client.last_visit_at ? formatDate(client.last_visit_at) : "-"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {client.is_blocked ? (
                          <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 border border-red-300">Blocat</span>
                        ) : (client.no_show_count || 0) >= 2 ? (
                          <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700 border border-yellow-300">Atentie</span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 border border-green-300">Activ</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={(clickEvent) => {
                              clickEvent.stopPropagation();
                              handleEditClient(client);
                            }}
                            className="rounded px-2 py-1 text-[10px] text-brand-blue font-medium hover:bg-blue-50"
                          >
                            Editeaza
                          </button>
                          <button
                            onClick={(clickEvent) => {
                              clickEvent.stopPropagation();
                              setShowDetailClient(client);
                            }}
                            className="rounded px-2 py-1 text-[10px] text-gray-500 hover:bg-gray-100"
                          >
                            Detalii
                          </button>
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className={client.is_blocked ? "bg-red-50/50" : "bg-blue-50/50"}>
                        <td colSpan={8} className="px-4 pb-4 pt-2">
                          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div>
                              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Etichete</p>
                              <div className="flex flex-wrap gap-1.5">
                                {!client.tags || client.tags.length === 0 ? (
                                  <span className="text-xs text-gray-400">Fara etichete</span>
                                ) : (
                                  client.tags.map((tag) => (
                                    <span key={tag} className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${tagClassName(tag)}`}>{tag}</span>
                                  ))
                                )}
                              </div>
                            </div>
                            <div>
                              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Notite</p>
                              <p className="text-sm text-gray-700">{client.notes || <span className="text-gray-400">-</span>}</p>
                              {client.is_blocked && client.blocked_reason && (
                                <p className="mt-1 text-sm font-medium text-red-600">Motiv blocare: {client.blocked_reason}</p>
                              )}
                            </div>
                            <div>
                              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Canal preferat</p>
                              <p className="text-sm font-medium text-gray-700">{CHANNEL_LABELS[client.preferred_channel] ?? client.preferred_channel}</p>
                              <p className="mt-0.5 text-xs text-gray-500">
                                Sursa: {client.source === "online_booking" ? "Booking online" : client.source === "referral" ? "Recomandare" : client.source === "manual" ? "Adaugat manual" : client.source}
                              </p>
                            </div>
                            <div>
                              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Consimtamant GDPR</p>
                              <div className="flex items-center gap-2">
                                {client.gdpr_consent ? (
                                  <span className="inline-flex items-center gap-1 text-sm font-medium text-green-700">
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                                    Acordat
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-sm font-medium text-red-600">
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                                    Neacordat
                                  </span>
                                )}
                              </div>
                              {client.gdpr_consent && client.gdpr_consent_date && (
                                <p className="mt-0.5 text-xs text-gray-500">Din {formatDate(client.gdpr_consent_date)}</p>
                              )}
                              <p className="mt-0.5 text-xs text-gray-500">
                                Art. 9 (date sensibile): {client.gdpr_article9_consent ? "Da" : "Nu"}
                              </p>
                            </div>
                          </div>
                          {(client.no_show_count || 0) > 0 && (
                            <div className="mt-3 rounded-lg bg-yellow-50 border border-yellow-200 px-3 py-2">
                              <p className="text-xs font-medium text-yellow-800">
                                Neprezentari: {client.no_show_count} din {client.total_appointments} programari (
                                {client.total_appointments > 0 ? ((client.no_show_count / client.total_appointments) * 100).toFixed(0) : 0}%)
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

      {/* Client Create/Edit Modal */}
      {showClientModal && (
        <ClientModal
          businessId={businessId!}
          editingClient={editingClient}
          onClose={() => {
            setShowClientModal(false);
            setEditingClient(null);
          }}
          onSaved={() => {
            setShowClientModal(false);
            setEditingClient(null);
            refetchClients();
          }}
        />
      )}

      {/* Client Detail Modal */}
      {showDetailClient && (
        <ClientDetailModal
          businessId={businessId!}
          client={showDetailClient}
          onClose={() => setShowDetailClient(null)}
        />
      )}
    </div>
  );
}

// ============================================================
// Client Create/Edit Modal
// ============================================================
function ClientModal({
  businessId,
  editingClient,
  onClose,
  onSaved,
}: {
  businessId: number;
  editingClient: Client | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEditing = editingClient !== null;

  const [fullName, setFullName] = useState(editingClient?.full_name || "");
  const [phone, setPhone] = useState(editingClient?.phone || "");
  const [email, setEmail] = useState(editingClient?.email || "");
  const [tags, setTags] = useState(editingClient?.tags?.join(", ") || "");
  const [notes, setNotes] = useState(editingClient?.notes || "");
  const [preferredChannel, setPreferredChannel] = useState(editingClient?.preferred_channel || "viber");
  const [source, setSource] = useState(editingClient?.source || "manual");
  const [gdprConsent, setGdprConsent] = useState(editingClient?.gdpr_consent ?? false);
  const [isBlocked, setIsBlocked] = useState(editingClient?.is_blocked ?? false);
  const [blockedReason, setBlockedReason] = useState(editingClient?.blocked_reason || "");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!fullName.trim()) {
      setErrorMessage("Numele este obligatoriu");
      return;
    }
    setErrorMessage(null);
    setSubmitting(true);

    const parsedTags = tags.split(",").map((t) => t.trim()).filter(Boolean);

    try {
      if (isEditing) {
        const updatePayload: any = {
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          tags: parsedTags,
          notes: notes.trim() || null,
          preferred_channel: preferredChannel,
          is_blocked: isBlocked,
          blocked_reason: isBlocked ? blockedReason.trim() || null : null,
        };
        await clientsApi.update(businessId, editingClient!.id, updatePayload);
      } else {
        const createPayload = {
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          tags: parsedTags,
          notes: notes.trim() || null,
          preferred_channel: preferredChannel,
          source,
          gdpr_consent: gdprConsent,
        };
        await clientsApi.create(businessId, createPayload);
      }
      onSaved();
    } catch (caughtError: any) {
      setErrorMessage(caughtError.message || "Eroare la salvare");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl" onClick={(clickEvent) => clickEvent.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4 rounded-t-2xl">
          <h3 className="text-lg font-bold text-gray-900">{isEditing ? "Editeaza client" : "Client nou"}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          {errorMessage && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nume complet *</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue" placeholder="ex: Ioana Marinescu" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue" placeholder="+40723..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue" placeholder="email@exemplu.ro" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Etichete (separate prin virgula)</label>
            <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue" placeholder="VIP, fidela, mireasa" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notite</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue" rows={2} placeholder="Informatii utile despre client" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Canal preferat</label>
              <select value={preferredChannel} onChange={(e) => setPreferredChannel(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue">
                <option value="viber">Viber</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="sms">SMS</option>
                <option value="email">Email</option>
              </select>
            </div>
            {!isEditing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sursa</label>
                <select value={source} onChange={(e) => setSource(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue">
                  <option value="manual">Adaugat manual</option>
                  <option value="online_booking">Booking online</option>
                  <option value="referral">Recomandare</option>
                </select>
              </div>
            )}
          </div>

          {/* GDPR for new clients */}
          {!isEditing && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={gdprConsent} onChange={(e) => setGdprConsent(e.target.checked)} className="rounded border-gray-300 text-brand-blue focus:ring-brand-blue" />
              <span className="text-sm text-gray-700">Consimtamant GDPR</span>
            </label>
          )}

          {/* Block option for editing */}
          {isEditing && (
            <div className="border-t pt-4 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isBlocked} onChange={(e) => setIsBlocked(e.target.checked)} className="rounded border-gray-300 text-red-600 focus:ring-red-500" />
                <span className="text-sm text-gray-700">Blocat</span>
              </label>
              {isBlocked && (
                <input
                  type="text"
                  value={blockedReason}
                  onChange={(e) => setBlockedReason(e.target.value)}
                  placeholder="Motivul blocarii"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                />
              )}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t bg-gray-50 px-6 py-4 rounded-b-2xl">
          <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">Anuleaza</button>
          <button onClick={handleSubmit} disabled={submitting} className="rounded-lg bg-brand-blue px-6 py-2 text-sm font-medium text-white hover:bg-brand-blue-light disabled:opacity-50">
            {submitting ? "Se salveaza..." : isEditing ? "Actualizeaza" : "Adauga client"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Client Detail Modal (appointment history)
// ============================================================
function ClientDetailModal({
  businessId,
  client,
  onClose,
}: {
  businessId: number;
  client: Client;
  onClose: () => void;
}) {
  const { data: clientAppointments, loading: loadingAppointments } = useFetch(
    () => businessId ? appointmentsApi.list(businessId, {}) : Promise.resolve([]),
    MOCK_APPOINTMENTS_TODAY,
    [businessId]
  );

  // Filter appointments for this client
  const clientHistory = useMemo(() => {
    if (!clientAppointments) return [];
    return clientAppointments
      .filter((apt: any) => apt.client_id === client.id)
      .sort((a: any, b: any) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
  }, [clientAppointments, client.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl" onClick={(clickEvent) => clickEvent.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4 rounded-t-2xl">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{client.full_name}</h3>
            <p className="text-sm text-gray-500">{client.phone} {client.email ? `| ${client.email}` : ""}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-6">
          {/* Client stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="rounded-lg bg-blue-50 p-3 text-center">
              <p className="text-xs text-gray-500">Programari</p>
              <p className="text-xl font-bold text-brand-navy">{client.total_appointments}</p>
            </div>
            <div className="rounded-lg bg-green-50 p-3 text-center">
              <p className="text-xs text-gray-500">Venit total</p>
              <p className="text-xl font-bold text-brand-green">{formatRON(client.total_revenue || 0)}</p>
            </div>
            <div className="rounded-lg bg-amber-50 p-3 text-center">
              <p className="text-xs text-gray-500">No-shows</p>
              <p className="text-xl font-bold text-amber-600">{client.no_show_count}</p>
            </div>
          </div>

          {/* Tags */}
          {client.tags && client.tags.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-semibold text-gray-500 mb-2">Etichete</p>
              <div className="flex flex-wrap gap-1.5">
                {client.tags.map((tag) => (
                  <span key={tag} className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${tagClassName(tag)}`}>{tag}</span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {client.notes && (
            <div className="mb-6">
              <p className="text-xs font-semibold text-gray-500 mb-1">Notite</p>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{client.notes}</p>
            </div>
          )}

          {/* Appointment history */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">Istoric programari</p>
            {loadingAppointments ? (
              <p className="text-xs text-gray-400 text-center py-4">Se incarca...</p>
            ) : clientHistory.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">Nicio programare gasita</p>
            ) : (
              <div className="space-y-2">
                {clientHistory.slice(0, 20).map((appointment: any) => (
                  <div key={appointment.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{appointment.service_name || "Serviciu"}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(appointment.start_time).toLocaleDateString("ro-RO", { day: "2-digit", month: "short", year: "numeric" })}
                        {" la "}
                        {new Date(appointment.start_time).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
                        {appointment.employee_name && ` | ${appointment.employee_name}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{appointment.final_price || appointment.price || 0} RON</p>
                      <StatusBadge status={appointment.status} type="appointment" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end border-t px-6 py-4">
          <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">Inchide</button>
        </div>
      </div>
    </div>
  );
}
