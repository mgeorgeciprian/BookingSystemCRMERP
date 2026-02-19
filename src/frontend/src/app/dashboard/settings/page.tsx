"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { businesses as businessesApi, icalSources } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import { MOCK_BUSINESS } from "@/lib/mock-data";

const VERTICALS = [
  { value: "salon", label: "Salon" },
  { value: "dental", label: "Dental" },
  { value: "therapy", label: "Terapie" },
  { value: "fitness", label: "Fitness" },
  { value: "massage", label: "Masaj" },
  { value: "tutor", label: "Tutoring" },
  { value: "medical", label: "Medical" },
  { value: "other", label: "Altele" },
];

export default function SettingsPage() {
  const activeBusiness = useAppStore((s) => s.activeBusiness);
  const setActiveBusiness = useAppStore((s) => s.setActiveBusiness);
  const businessId = activeBusiness?.id;

  const { data: businessData, isUsingMockData } = useFetch(
    () => (businessId ? businessesApi.get(businessId) : Promise.resolve(null)),
    MOCK_BUSINESS,
    [businessId]
  );

  const { data: icalSourcesList, refetch: refetchIcal } = useFetch(
    () => (businessId ? icalSources.list(businessId) : Promise.resolve([])),
    [],
    [businessId]
  );

  // Form state
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // iCal state
  const [showIcalForm, setShowIcalForm] = useState(false);
  const [icalName, setIcalName] = useState("");
  const [icalUrl, setIcalUrl] = useState("");
  const [icalSaving, setIcalSaving] = useState(false);
  const [syncingSourceId, setSyncingSourceId] = useState<number | null>(null);

  // Initialize form from fetched data
  useEffect(() => {
    if (businessData) {
      setFormData({ ...businessData });
    }
  }, [businessData]);

  const updateField = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const updateNotificationChannel = (channel: string, enabled: boolean) => {
    setFormData((prev: any) => ({
      ...prev,
      notification_channels: {
        ...prev.notification_channels,
        [channel]: enabled,
      },
    }));
  };

  const handleSave = async (sectionName: string, fieldsToUpdate: Record<string, any>) => {
    if (!businessId || isUsingMockData) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      const updatedBusiness = await businessesApi.update(businessId, fieldsToUpdate);
      setActiveBusiness(updatedBusiness);
      setSaveSuccess(sectionName);
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err: any) {
      setSaveError(err.message || "Eroare la salvare");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBusinessInfo = () => {
    handleSave("info", {
      name: formData.name,
      vertical: formData.vertical,
      cui: formData.cui,
      reg_com: formData.reg_com,
      address: formData.address,
      city: formData.city,
      county: formData.county,
      phone: formData.phone,
      email: formData.email,
      website: formData.website,
      timezone: formData.timezone,
    });
  };

  const handleSaveBookingSettings = () => {
    handleSave("booking", {
      booking_buffer_minutes: formData.booking_buffer_minutes,
      cancellation_policy_hours: formData.cancellation_policy_hours,
      auto_confirm_bookings: formData.auto_confirm_bookings,
      allow_online_payments: formData.allow_online_payments,
    });
  };

  const handleSaveNotifications = () => {
    handleSave("notifications", {
      notification_channels: formData.notification_channels,
    });
  };

  const handleCreateIcalSource = async () => {
    if (!businessId || !icalName.trim() || !icalUrl.trim()) return;
    setIcalSaving(true);
    try {
      await icalSources.create(businessId, { name: icalName, url: icalUrl });
      setIcalName("");
      setIcalUrl("");
      setShowIcalForm(false);
      refetchIcal();
    } catch {
      setSaveError("Eroare la adaugarea sursei iCal");
    } finally {
      setIcalSaving(false);
    }
  };

  const handleSyncIcalSource = async (sourceId: number) => {
    if (!businessId) return;
    setSyncingSourceId(sourceId);
    try {
      await icalSources.sync(businessId, sourceId);
      refetchIcal();
    } catch {
      setSaveError("Eroare la sincronizare");
    } finally {
      setSyncingSourceId(null);
    }
  };

  const biz = formData.name ? formData : (businessData || MOCK_BUSINESS);

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
        {saveError && (
          <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {saveError}
          </div>
        )}
      </div>

      <div className="max-w-3xl space-y-6">
        {/* Business info */}
        <Section title="Informatii afacere">
          <div className="grid gap-4 sm:grid-cols-2">
            <EditableField label="Nume" value={formData.name || ""} onChange={(v) => updateField("name", v)} />
            <EditableSelect label="Vertical" value={formData.vertical || ""} options={VERTICALS} onChange={(v) => updateField("vertical", v)} />
            <EditableField label="CUI / CIF" value={formData.cui || ""} onChange={(v) => updateField("cui", v)} />
            <EditableField label="Reg. Com." value={formData.reg_com || ""} onChange={(v) => updateField("reg_com", v)} />
            <EditableField label="Adresa" value={formData.address || ""} onChange={(v) => updateField("address", v)} />
            <EditableField label="Oras" value={formData.city || ""} onChange={(v) => updateField("city", v)} />
            <EditableField label="Judet" value={formData.county || ""} onChange={(v) => updateField("county", v)} />
            <EditableField label="Telefon" value={formData.phone || ""} onChange={(v) => updateField("phone", v)} />
            <EditableField label="Email" value={formData.email || ""} onChange={(v) => updateField("email", v)} />
            <EditableField label="Website" value={formData.website || ""} onChange={(v) => updateField("website", v)} />
          </div>
          <SaveButton saving={saving} success={saveSuccess === "info"} onClick={handleSaveBusinessInfo} disabled={isUsingMockData} />
        </Section>

        {/* Booking settings */}
        <Section title="Setari programari">
          <div className="grid gap-4 sm:grid-cols-2">
            <EditableNumberField label="Buffer intre programari (min)" value={formData.booking_buffer_minutes ?? 0} onChange={(v) => updateField("booking_buffer_minutes", v)} min={0} max={120} />
            <EditableNumberField label="Politica anulare (ore)" value={formData.cancellation_policy_hours ?? 0} onChange={(v) => updateField("cancellation_policy_hours", v)} min={0} max={168} />
            <EditableToggle label="Confirmare automata" value={formData.auto_confirm_bookings ?? false} onChange={(v) => updateField("auto_confirm_bookings", v)} />
            <EditableToggle label="Plati online" value={formData.allow_online_payments ?? false} onChange={(v) => updateField("allow_online_payments", v)} />
          </div>
          <SaveButton saving={saving} success={saveSuccess === "booking"} onClick={handleSaveBookingSettings} disabled={isUsingMockData} />
        </Section>

        {/* Notification channels */}
        <Section title="Canale notificari (Infobip)">
          <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 p-3">
            <p className="text-xs text-blue-700">
              Strategia: <strong>WhatsApp &rarr; SMS &rarr; Email</strong> (fallback automat).
              WhatsApp: ~0.014 EUR | SMS: ~0.06 EUR | Email: gratuit
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <EditableToggle label="WhatsApp" value={formData.notification_channels?.whatsapp ?? false} onChange={(v) => updateNotificationChannel("whatsapp", v)} icon="💚" />
            <EditableToggle label="SMS" value={formData.notification_channels?.sms ?? false} onChange={(v) => updateNotificationChannel("sms", v)} icon="📱" />
            <EditableToggle label="Email" value={formData.notification_channels?.email ?? false} onChange={(v) => updateNotificationChannel("email", v)} icon="📧" />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <ReadOnlyField label="Infobip Base URL" value="https://xxxxx.api.infobip.com" />
            <ReadOnlyField label="Infobip API Key" value="••••••••••••••••" />
            <ReadOnlyField label="Sender Name" value={biz.name || "BookingCRM"} />
          </div>
          <SaveButton saving={saving} success={saveSuccess === "notifications"} onClick={handleSaveNotifications} disabled={isUsingMockData} />
        </Section>

        {/* e-Factura */}
        <Section title="e-Factura ANAF">
          <div className="mb-4">
            <EditableToggle label="e-Factura activ" value={formData.efactura_enabled ?? false} onChange={(v) => updateField("efactura_enabled", v)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <ReadOnlyField label="ANAF OAuth Client ID" value="••••••••••" />
            <ReadOnlyField label="ANAF OAuth Client Secret" value="••••••••••••••••" />
            <ReadOnlyField label="Redirect URI" value="https://app.bookingcrm.ro/callback/anaf" />
            <ReadOnlyField label="Token status" value="Valid pana 15.08.2026" />
          </div>
          <div className="mt-3">
            <button className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100">
              Re-autorizare ANAF OAuth
            </button>
          </div>
        </Section>

        {/* iCal Sync */}
        <Section title="Sincronizare calendare externe (iCal)">
          {(icalSourcesList || []).length > 0 ? (
            <div className="space-y-3 mb-4">
              {(icalSourcesList || []).map((source: any) => (
                <div key={source.id} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📅</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{source.name}</p>
                        <p className="text-[10px] text-gray-400 truncate max-w-[200px]">{source.url}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        source.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                      }`}>
                        {source.is_active ? "Activ" : "Inactiv"}
                      </span>
                      <button
                        onClick={() => handleSyncIcalSource(source.id)}
                        disabled={syncingSourceId === source.id}
                        className="rounded-lg border px-2 py-1 text-[10px] font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {syncingSourceId === source.id ? "Sync..." : "Sync acum"}
                      </button>
                    </div>
                  </div>
                  {source.last_synced_at && (
                    <p className="text-[10px] text-gray-400">
                      Ultima sincronizare: {new Date(source.last_synced_at).toLocaleString("ro-RO")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : !isUsingMockData ? (
            <p className="mb-4 text-sm text-gray-400">Nicio sursa iCal configurata</p>
          ) : (
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
              <p className="text-[10px] text-gray-400">Sync la 15 min</p>
            </div>
          )}

          {showIcalForm ? (
            <div className="rounded-lg border border-dashed border-brand-blue p-4 space-y-3">
              <input
                type="text"
                placeholder="Nume sursa (ex: Airbnb Calendar)"
                value={icalName}
                onChange={(e) => setIcalName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
              />
              <input
                type="url"
                placeholder="URL iCal (https://...)"
                value={icalUrl}
                onChange={(e) => setIcalUrl(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreateIcalSource}
                  disabled={icalSaving || !icalName.trim() || !icalUrl.trim()}
                  className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-light disabled:opacity-50"
                >
                  {icalSaving ? "Se adauga..." : "Adauga"}
                </button>
                <button
                  onClick={() => { setShowIcalForm(false); setIcalName(""); setIcalUrl(""); }}
                  className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  Anuleaza
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowIcalForm(true)}
              className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              + Adauga sursa iCal
            </button>
          )}
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
                      <li>WhatsApp + Email</li>
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

function EditableField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="text-[10px] font-medium text-gray-500 mb-1">{label}</p>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
      />
    </div>
  );
}

function EditableNumberField({ label, value, onChange, min, max }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div>
      <p className="text-[10px] font-medium text-gray-500 mb-1">{label}</p>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
      />
    </div>
  );
}

function EditableSelect({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="text-[10px] font-medium text-gray-500 mb-1">{label}</p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

function EditableToggle({ label, value, onChange, icon }: { label: string; value: boolean; onChange: (v: boolean) => void; icon?: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex w-full items-center justify-between rounded-lg bg-gray-50 px-4 py-2.5 hover:bg-gray-100 transition-colors"
    >
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
    </button>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium text-gray-500 mb-1">{label}</p>
      <p className="text-sm text-gray-900 font-mono">{value}</p>
    </div>
  );
}

function SaveButton({ saving, success, onClick, disabled }: { saving: boolean; success: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <div className="mt-4 flex items-center gap-3">
      <button
        onClick={onClick}
        disabled={saving || disabled}
        className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-light disabled:opacity-50 transition-colors"
      >
        {saving ? "Se salveaza..." : "Salveaza modificarile"}
      </button>
      {success && (
        <span className="text-sm font-medium text-green-600">Salvat cu succes!</span>
      )}
    </div>
  );
}
