"use client";

import { MOCK_BUSINESS } from "@/lib/mock-data";

export default function SettingsPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Setari</h1>
        <p className="text-sm text-gray-500">Configurare afacere, notificari, integrari</p>
      </div>

      <div className="max-w-3xl space-y-6">
        {/* Business info */}
        <Section title="Informatii afacere">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nume" value={MOCK_BUSINESS.name} />
            <Field label="Vertical" value={MOCK_BUSINESS.vertical} />
            <Field label="CUI / CIF" value={MOCK_BUSINESS.cui || "-"} />
            <Field label="Reg. Com." value={MOCK_BUSINESS.reg_com || "-"} />
            <Field label="Adresa" value={MOCK_BUSINESS.address || "-"} />
            <Field label="Oras" value={`${MOCK_BUSINESS.city}, ${MOCK_BUSINESS.county}`} />
            <Field label="Telefon" value={MOCK_BUSINESS.phone || "-"} />
            <Field label="Email" value={MOCK_BUSINESS.email || "-"} />
            <Field label="Website" value={MOCK_BUSINESS.website || "-"} />
            <Field label="Fus orar" value={MOCK_BUSINESS.timezone} />
          </div>
        </Section>

        {/* Booking settings */}
        <Section title="Setari programari">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Buffer intre programari" value={`${MOCK_BUSINESS.booking_buffer_minutes} minute`} />
            <Field label="Politica anulare" value={`${MOCK_BUSINESS.cancellation_policy_hours}h inainte`} />
            <ToggleField label="Confirmare automata" value={MOCK_BUSINESS.auto_confirm_bookings} />
            <ToggleField label="Plati online" value={MOCK_BUSINESS.allow_online_payments} />
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
            <ToggleField label="Viber" value={MOCK_BUSINESS.notification_channels.viber} icon="💜" />
            <ToggleField label="WhatsApp" value={MOCK_BUSINESS.notification_channels.whatsapp} icon="💚" />
            <ToggleField label="SMS" value={MOCK_BUSINESS.notification_channels.sms} icon="📱" />
            <ToggleField label="Email" value={MOCK_BUSINESS.notification_channels.email} icon="📧" />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Infobip Base URL" value="https://xxxxx.api.infobip.com" masked />
            <Field label="Infobip API Key" value="••••••••••••••••" masked />
            <Field label="Sender Name" value="SalonElegance" />
          </div>
        </Section>

        {/* e-Factura */}
        <Section title="e-Factura ANAF">
          <div className="mb-4">
            <ToggleField label="e-Factura activ" value={MOCK_BUSINESS.efactura_enabled} />
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
                  <p className="text-sm font-medium text-gray-900">Airbnb - Ana P.</p>
                  <p className="text-[10px] text-gray-400">airbnb.com/calendar/export/...</p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                Activ
              </span>
            </div>
            <p className="text-[10px] text-gray-400">
              Ultima sincronizare: 19.02.2026 07:15 &middot; 3 evenimente &middot; Sync la 15 min
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
                <span className="rounded-full bg-brand-blue px-3 py-1 text-xs font-bold text-white">
                  Professional
                </span>
                <p className="mt-2 text-2xl font-bold text-gray-900">59 RON<span className="text-sm font-normal text-gray-400">/luna</span></p>
                <ul className="mt-2 space-y-1 text-xs text-gray-600">
                  <li>5 angajati</li>
                  <li>500 SMS/luna incluse</li>
                  <li>Viber + WhatsApp</li>
                  <li>e-Factura ANAF</li>
                  <li>iCal Sync</li>
                </ul>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Urmatoarea plata</p>
                <p className="text-sm font-semibold text-gray-900">01.03.2026</p>
                <button className="mt-3 rounded-lg bg-brand-blue px-4 py-2 text-xs font-medium text-white">
                  Upgrade la Enterprise
                </button>
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
                https://bookingcrm.ro/salon-elegance
              </p>
              <p className="text-[10px] text-gray-400">Partajeaza acest link cu clientii tai</p>
            </div>
            <button className="rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-medium text-white">
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
