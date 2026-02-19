"use client";

import { useAppStore } from "@/lib/store";
import { notifications as notificationsApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import { MOCK_NOTIFICATIONS, MOCK_STATS } from "@/lib/mock-data";

const channelIcons: Record<string, string> = {
  viber: "💜",
  whatsapp: "💚",
  sms: "📱",
  email: "📧",
};

const statusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  delivered: "bg-emerald-100 text-emerald-700",
  read: "bg-purple-100 text-purple-700",
  failed: "bg-red-100 text-red-700",
};

const typeLabels: Record<string, string> = {
  booking_confirm: "Confirmare programare",
  reminder_24h: "Reminder 24h",
  reminder_1h: "Reminder 1h",
  cancellation: "Anulare",
  review_request: "Cerere recenzie",
  custom: "Mesaj manual",
};

export default function NotificationsPage() {
  const activeBusiness = useAppStore((s) => s.activeBusiness);
  const businessId = activeBusiness?.id;

  const { data: notificationsData, isUsingMockData } = useFetch(
    () => (businessId ? notificationsApi.log(businessId) : Promise.resolve([])),
    MOCK_NOTIFICATIONS,
    [businessId]
  );

  const notificationsList = notificationsData || [];

  // Use mock stats for channel breakdown (no dedicated endpoint yet)
  const ch = MOCK_STATS.channel_breakdown;
  const totalSent = ch.reduce((a: number, b: any) => a + b.count, 0);
  const totalCost = ch.reduce((a: number, b: any) => a + b.cost, 0);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notificari</h1>
          <p className="text-sm text-gray-500">Viber &rarr; WhatsApp &rarr; SMS (strategie fallback)</p>
          {isUsingMockData && (
            <p className="mt-1 text-[10px] text-amber-500 font-medium">
              Date demo — backend-ul nu este conectat
            </p>
          )}
        </div>
        <button className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-light">
          Trimite mesaj manual
        </button>
      </div>

      {/* Channel stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        {ch.map((c: any) => (
          <div key={c.channel} className="rounded-xl border bg-white p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{channelIcons[c.channel.toLowerCase()] || "📨"}</span>
              <span className="text-sm font-medium text-gray-700">{c.channel}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{c.count}</p>
            <p className="text-[10px] text-gray-400">Cost: {c.cost.toFixed(2)} EUR</p>
          </div>
        ))}
        <div className="rounded-xl border border-l-4 border-l-brand-green bg-white p-4">
          <p className="text-xs text-gray-500 mb-2">Total luna</p>
          <p className="text-2xl font-bold text-gray-900">{totalSent} mesaje</p>
          <p className="text-[10px] text-brand-green font-medium">Cost total: {totalCost.toFixed(2)} EUR</p>
        </div>
      </div>

      {/* Cost comparison info */}
      <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
        <p className="text-xs font-semibold text-blue-800 mb-1">Economii cu strategia Viber-first</p>
        <p className="text-xs text-blue-600">
          Daca toate cele {totalSent} mesaje ar fi fost trimise prin SMS, costul ar fi fost ~{(totalSent * 0.06).toFixed(2)} EUR.
          Cu strategia Viber-first, platesti doar {totalCost.toFixed(2)} EUR.{" "}
          <strong>
            Economie: {((totalSent * 0.06) - totalCost).toFixed(2)} EUR (
            {(((totalSent * 0.06 - totalCost) / (totalSent * 0.06)) * 100).toFixed(0)}%)
          </strong>
        </p>
      </div>

      {/* Notification log */}
      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="border-b px-5 py-3.5">
          <h3 className="text-sm font-semibold text-gray-900">Jurnal notificari</h3>
        </div>
        <div className="divide-y">
          {notificationsList.length === 0 ? (
            <div className="px-5 py-12 text-center text-gray-400 text-sm">
              Nicio notificare gasita.
            </div>
          ) : (
            notificationsList.map((notif: any) => (
              <div key={notif.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                <span className="mt-0.5 text-xl">{channelIcons[notif.channel] || "📨"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-gray-900">
                      {typeLabels[notif.message_type] || notif.message_type}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[notif.status] || "bg-gray-100 text-gray-600"}`}>
                      {notif.status === "delivered" ? "Livrat" : notif.status === "read" ? "Citit" : notif.status === "sent" ? "Trimis" : notif.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">Catre: {notif.recipient}</p>
                  <p className="text-xs text-gray-600 line-clamp-2 whitespace-pre-line">{notif.content}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-500">
                    {new Date(notif.created_at).toLocaleString("ro-RO", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {notif.cost} {notif.cost_currency}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
