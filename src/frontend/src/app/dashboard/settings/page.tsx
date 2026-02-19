"use client";

import { useAppStore } from "@/lib/store";
import { businesses as businessesApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import { MOCK_BUSINESS } from "@/lib/mock-data";

export default function SettingsPage() {
  const activeBusiness = useAppStore((s) => s.activeBusiness);
  const businessId = activeBusiness?.id;

  const { data: businessData, isUsingMockData } = useFetch(
    () => (businessId ? businessesApi.get(businessId) : Promise.resolve(null)),
    MOCK_BUSINESS,
    [businessId]
  );

  const biz = businessData || MOCK_BUSINESS;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Setari</h1>
        <p className="text-sm text-gray-500">Configurare afacere, notificari, integrari</p>
        {isUsingMockData && (
          <p className="mt-1 text-[10px] text-amber-500 font-medium">
            Date demo — backend-ul nu este conectat
          </p>
        )}
      </div>

      <div className="max-w-3xl space-y-6">
        {/* Business info */}
        <Section title="Informatii afacere">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nume" value={biz.name || "-"} />
            <Field label="Vertical" value={biz.vertical || "-"} />
            <Field label="CUI / CIF" value={biz.cui || "-"} />
            <Field label="Reg. Com." value={biz.reg_com || "-"} />
            <Field label="Adresa" value={biz.address || "-"} />
            <Field label="Oras" value={[biz.city, biz.county].filter(Boolean).join(", ") || "-"} />
            <Field label="Telefon" value={biz.phone || "-"} />
            <Field label="Email" value={biz.email || "-"} />
            <Field label="Website" value={biz.website || "-"} />
            <Field label="Fus orar" value={biz.timezone || "Europe/Bucharest"} />
          </div>
        </Section>

        {/* Booking settings */}
        <Section title="Setari programari">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Buffer intre programari" value={`${biz.booking_buffer_minutes || 0} minute`} />
            <Field label="Politica anulare" value={`${biz.cancellation_policy_hours || 0}h inainte`} />
            <ToggleField label="Confirmare automata" value={biz.auto_confirm_bookings ?? false} />
            <ToggleField label="Plati online" value={biz.allow_online_payments ?? false} />
          </div>
        </Section>

        {/* Notification channels */}
        <Section title="Canale notificari (Infobip)">
          <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 p-3">
            <p className="text-xs text-blue-700">
              Strategia: <strong>Viber &rarr; WhatsApp &rarr; SMS</strong> (fallback automat).
              Viber: ~0.02 EUR | WhatsApp: ~0.014 EUR | SMS: ~0.06 EUR
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <ToggleField label="Viber" value={biz.notification_channels?.viber ?? false} icon="💜" />
            <ToggleField label="WhatsApp" value={biz.notification_channels?.whatsapp ?? false} icon="💚" />
            <ToggleField label="SMS" value={biz.notification_channels?.sms ?? false} icon="📱" />
            <ToggleField label="Email" value={biz.notification_channels?.email ?? false} icon="📧" />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Infobip Base URL" value="https://xxxxx.api.infobip.com" masked />
            <Field label="Infobip API Key" value="••••••••••••••••" masked />
            <Field label="Sender Name" value={biz.name || "BookingCRM"} />
          </div>
        </Section>

        {/* e-Factura */}
        <Section title="e-Factura ANAF">
          <div className="mb-4">
            <ToggleField label="e-Factura activ" value={biz.efactura_enabled ?? false} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="ANAF OAuth Client ID" value="••••••••••" masked />
            <Field label="ANAF OAuth Client Secret" value="••••••••••••••••" masked />
            <Field label="Redirect URI" value="https://app.bookingcrm.ro/callback/anaf" />
            <Field label="Token status" value="Valid pana 15.08.2026" />
          </div>
          <div className="mt-3">
            <button className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100">
              Re-autorizare ANAF OAuth
            </button>
          </div>
        </Section>

        {/* iCal Sync */}
        <Section title="Sincronizare calendare externe (iCal)">
          <div className="mb-4 rounded-lg border p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">🏠</span>
                <div>
                  <p className="text-sm font-medium text-gray-900">Airbnb - Calendar</p>
                  <p className="text-[10px] text-gray-400">airbnb.com/calendar/export/...</p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                Activ
              </span>
            </div>
            <p className="text-[10px] text-gray-400">
              Sync la 15 min
            </p>
          </div>
          <button className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            + Adauga sursa iCal
          </button>
        </Section>

        {/* Subscription */}
        <Section title="Abonament">
          <div className="rounded-xl border-2 border-brand-blue bg-blue-50/50 p-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="rounded-full bg-brand-blue px-3 py-1 text-xs font-bold text-white capitalize">
                  {biz.subscription_plan || "free"}
                </span>
                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {biz.subscription_plan === "professional" ? "59" : biz.subscription_plan === "enterprise" ? "99" : biz.subscription_plan === "starter" ? "29" : "0"} RON
                  <span className="text-sm font-normal text-gray-400">/luna</span>
                </p>
                <ul className="mt-2 space-y-1 text-xs text-gray-600">
                  {biz.subscription_plan === "professional" && (
                    <>
                      <li>5 angajati</li>
                      <li>500 SMS/luna incluse</li>
                      <li>Viber + WhatsApp</li>
                      <li>e-Factura ANAF</li>
                      <li>iCal Sync</li>
                    </>
                  )}
                  {biz.subscription_plan === "starter" && (
                    <>
                      <li>1 angajat</li>
                      <li>100 SMS/luna incluse</li>
                    </>
                  )}
                  {biz.subscription_plan === "enterprise" && (
                    <>
                      <li>Angajati nelimitati</li>
                      <li>SMS nelimitat</li>
                      <li>API access</li>
                      <li>Suport prioritar</li>
                    </>
                  )}
                </ul>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Urmatoarea plata</p>
                <p className="text-sm font-semibold text-gray-900">01.03.2026</p>
                {biz.subscription_plan !== "enterprise" && (
                  <button className="mt-3 rounded-lg bg-brand-blue px-4 py-2 text-xs font-medium text-white">
                    Upgrade la Enterprise
                  </button>
                )}
              </div>
            </div>
          </div>
        </Section>

        {/* Public booking link */}
        <Section title="Link public booking">
          <div className="flex items-center gap-3 rounded-lg bg-gray-50 border p-4">
            <span className="text-lg">🔗</span>
            <div className="flex-1">
              <p className="text-sm font-mono text-brand-blue">
                https://bookingcrm.ro/{biz.slug || "afacerea-ta"}
              </p>
              <p className="text-[10px] text-gray-400">Partajeaza acest link cu clientii tai</p>
            </div>
            <button
              onClick={() => navigator.clipboard?.writeText(`https://bookingcrm.ro/${biz.slug || ""}`)}
              className="rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-medium text-white"
            >
              Copiaza
            </button>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-white p-5">
      <h2 className="mb-4 text-base font-semibold text-gray-900">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, value, masked }: { label: string; value: string; masked?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-medium text-gray-500 mb-1">{label}</p>
      <p className={`text-sm text-gray-900 ${masked ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

function ToggleField({ label, value, icon }: { label: string; value: boolean; icon?: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2.5">
      <div className="flex items-center gap-2">
        {icon && <span>{icon}</span>}
        <span className="text-sm text-gray-700">{label}</span>
      </div>
      <div
        className={`relative h-5 w-9 rounded-full transition-colors ${
          value ? "bg-brand-blue" : "bg-gray-300"
        }`}
      >
        <div
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            value ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </div>
    </div>
  );
}
