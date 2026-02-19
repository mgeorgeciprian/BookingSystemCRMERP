"use client";

import { useState } from "react";
import {
  MOCK_BUSINESS,
  MOCK_SERVICES,
  MOCK_EMPLOYEES,
  MOCK_CATEGORIES,
} from "@/lib/mock-data";

interface TimeSlot {
  time: string;
  available: boolean;
}

function generateSlots(employeeId: number, date: string, durationMin: number): TimeSlot[] {
  const emp = MOCK_EMPLOYEES.find((e) => e.id === employeeId);
  if (!emp) return [];

  const d = new Date(date);
  const dayMap = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const dayKey = dayMap[d.getDay()];
  const intervals = emp.weekly_schedule[dayKey as keyof typeof emp.weekly_schedule] || [];
  if (intervals.length === 0) return [];

  const slots: TimeSlot[] = [];
  for (const iv of intervals) {
    const [sh, sm] = iv.start.split(":").map(Number);
    const [eh, em] = iv.end.split(":").map(Number);
    let current = sh * 60 + sm;
    const end = eh * 60 + em;
    while (current + durationMin <= end) {
      const h = Math.floor(current / 60);
      const m = current % 60;
      const time = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
      slots.push({ time, available: Math.random() > 0.25 }); // ~75% available for demo
      current += 30;
    }
  }
  return slots;
}

export default function PublicBookingPage() {
  const biz = MOCK_BUSINESS;
  const [step, setStep] = useState(1);

  const [selectedService, setSelectedService] = useState<typeof MOCK_SERVICES[0] | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<typeof MOCK_EMPLOYEES[0] | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [slots, setSlots] = useState<TimeSlot[]>([]);

  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [gdprConsent, setGdprConsent] = useState(false);
  const [booked, setBooked] = useState(false);

  function selectService(svc: typeof MOCK_SERVICES[0]) {
    setSelectedService(svc);
    setStep(2);
  }

  function selectEmployee(emp: typeof MOCK_EMPLOYEES[0]) {
    setSelectedEmployee(emp);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split("T")[0];
    setSelectedDate(dateStr);
    setSlots(generateSlots(emp.id, dateStr, selectedService!.duration_minutes));
    setStep(3);
  }

  function changeDate(date: string) {
    setSelectedDate(date);
    setSelectedTime("");
    if (selectedEmployee && selectedService) {
      setSlots(generateSlots(selectedEmployee.id, date, selectedService.duration_minutes));
    }
  }

  function selectTime(time: string) {
    setSelectedTime(time);
    setStep(4);
  }

  function handleBook() {
    setBooked(true);
    setStep(5);
  }

  const stepLabels = ["Serviciu", "Specialist", "Data & Ora", "Contact", "Confirmare"];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-blue text-lg font-bold text-white">
              {biz.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">{biz.name}</h1>
              <p className="text-xs text-gray-500">{biz.address}, {biz.city}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        {/* Progress */}
        <div className="mb-8 flex items-center justify-center gap-1.5">
          {stepLabels.map((label, idx) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    step > idx + 1
                      ? "bg-brand-green text-white"
                      : step === idx + 1
                      ? "bg-brand-blue text-white shadow-lg shadow-blue-200"
                      : "bg-gray-200 text-gray-400"
                  }`}
                >
                  {step > idx + 1 ? "✓" : idx + 1}
                </div>
                <span className="mt-1 text-[9px] text-gray-400">{label}</span>
              </div>
              {idx < 4 && (
                <div
                  className={`mb-4 h-0.5 w-6 rounded ${
                    step > idx + 1 ? "bg-brand-green" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Service */}
        {step === 1 && (
          <div>
            <h2 className="mb-1 text-lg font-bold text-gray-900">Alege serviciul</h2>
            <p className="mb-6 text-sm text-gray-500">Ce doresti sa faci azi?</p>

            {MOCK_CATEGORIES.map((cat) => {
              const svcs = MOCK_SERVICES.filter(
                (s) => s.category_id === cat.id && s.is_public && s.is_active
              );
              if (svcs.length === 0) return null;
              return (
                <div key={cat.id} className="mb-6">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                    {cat.name}
                  </h3>
                  <div className="space-y-2">
                    {svcs.map((svc) => (
                      <button
                        key={svc.id}
                        onClick={() => selectService(svc)}
                        className="w-full rounded-xl border bg-white p-4 text-left hover:border-brand-blue hover:shadow-md transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-900">{svc.name}</p>
                            {svc.description && (
                              <p className="mt-0.5 text-xs text-gray-500">{svc.description}</p>
                            )}
                            <p className="mt-1 text-xs text-gray-400">{svc.duration_minutes} min</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-brand-blue">
                              {svc.price}
                              {svc.price_max && <span className="text-sm text-gray-400">-{svc.price_max}</span>}
                            </p>
                            <p className="text-[10px] text-gray-400">{svc.currency}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Step 2: Employee */}
        {step === 2 && (
          <div>
            <h2 className="mb-1 text-lg font-bold text-gray-900">Alege specialistul</h2>
            <p className="mb-6 text-sm text-gray-500">Cine sa te serveasca?</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {MOCK_EMPLOYEES.filter((e) => e.is_active).map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => selectEmployee(emp)}
                  className="rounded-xl border bg-white p-5 text-left hover:border-brand-blue hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold text-white"
                      style={{ backgroundColor: emp.color }}
                    >
                      {emp.full_name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{emp.display_name || emp.full_name}</p>
                      <p className="text-xs text-gray-500 capitalize">{emp.role}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => setStep(1)} className="mt-4 text-sm text-brand-blue hover:underline">
              &larr; Inapoi la servicii
            </button>
          </div>
        )}

        {/* Step 3: Date & Time */}
        {step === 3 && (
          <div>
            <h2 className="mb-1 text-lg font-bold text-gray-900">Alege data si ora</h2>
            <p className="mb-6 text-sm text-gray-500">
              {selectedService?.name} cu {selectedEmployee?.display_name}
            </p>
            <input
              type="date"
              value={selectedDate}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => changeDate(e.target.value)}
              className="mb-4 w-full rounded-xl border px-4 py-3 text-sm focus:border-brand-blue focus:outline-none"
            />
            {slots.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">
                Nu sunt sloturi disponibile in aceasta zi
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((slot) => (
                  <button
                    key={slot.time}
                    disabled={!slot.available}
                    onClick={() => selectTime(slot.time)}
                    className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                      !slot.available
                        ? "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
                        : selectedTime === slot.time
                        ? "border-brand-blue bg-brand-blue text-white shadow-lg shadow-blue-200"
                        : "border-gray-200 bg-white text-gray-700 hover:border-brand-blue hover:shadow-sm"
                    }`}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setStep(2)} className="mt-4 text-sm text-brand-blue hover:underline">
              &larr; Inapoi
            </button>
          </div>
        )}

        {/* Step 4: Contact */}
        {step === 4 && (
          <div>
            <h2 className="mb-1 text-lg font-bold text-gray-900">Datele tale</h2>
            <p className="mb-6 text-sm text-gray-500">Completeaza datele pentru confirmare</p>

            {/* Summary card */}
            <div className="mb-6 rounded-xl border-2 border-brand-blue/20 bg-blue-50/50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-900">{selectedService?.name}</p>
                  <p className="text-xs text-gray-500">
                    {selectedEmployee?.display_name} &middot; {selectedDate} la {selectedTime}
                  </p>
                  <p className="text-xs text-gray-400">{selectedService?.duration_minutes} min</p>
                </div>
                <p className="text-xl font-bold text-brand-blue">
                  {selectedService?.price} {selectedService?.currency}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Nume complet *"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-sm focus:border-brand-blue focus:outline-none"
              />
              <input
                type="tel"
                placeholder="Telefon *"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-sm focus:border-brand-blue focus:outline-none"
              />
              <input
                type="email"
                placeholder="Email (optional)"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-sm focus:border-brand-blue focus:outline-none"
              />
              <label className="flex items-start gap-3 rounded-xl bg-gray-50 p-3">
                <input
                  type="checkbox"
                  checked={gdprConsent}
                  onChange={(e) => setGdprConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-blue"
                />
                <span className="text-xs text-gray-500">
                  Sunt de acord cu prelucrarea datelor personale conform GDPR.
                  Datele sunt folosite exclusiv pentru gestionarea programarii.
                </span>
              </label>
            </div>

            <button
              onClick={handleBook}
              disabled={!clientName || !clientPhone || !gdprConsent}
              className="mt-6 w-full rounded-xl bg-brand-blue px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-200 hover:bg-brand-blue-light disabled:opacity-40 disabled:shadow-none transition-all"
            >
              Confirma programarea
            </button>
            <button onClick={() => setStep(3)} className="mt-3 w-full text-sm text-brand-blue hover:underline">
              &larr; Inapoi
            </button>
          </div>
        )}

        {/* Step 5: Confirmation */}
        {step === 5 && (
          <div className="text-center py-8">
            <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-4xl">
              ✅
            </div>
            <h2 className="mb-2 text-2xl font-bold text-brand-green">Programare confirmata!</h2>
            <p className="text-sm text-gray-500 mb-8">
              Vei primi o confirmare pe Viber/WhatsApp/SMS in cateva secunde.
            </p>

            <div className="mx-auto max-w-sm rounded-xl border bg-white p-5 text-left">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Serviciu</span>
                  <span className="text-sm font-medium text-gray-900">{selectedService?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Specialist</span>
                  <span className="text-sm font-medium text-gray-900">{selectedEmployee?.display_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Data</span>
                  <span className="text-sm font-medium text-gray-900">{selectedDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Ora</span>
                  <span className="text-sm font-medium text-gray-900">{selectedTime}</span>
                </div>
                <div className="border-t pt-3 flex justify-between">
                  <span className="text-xs text-gray-500">Pret</span>
                  <span className="text-lg font-bold text-brand-blue">
                    {selectedService?.price} {selectedService?.currency}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-700">
              Pentru anulare sau reprogramare, contacteaza-ne cu cel putin {biz.cancellation_policy_hours}h inainte
              la {biz.phone}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t py-4 text-center text-[10px] text-gray-400">
        Powered by Booking<strong>CRM</strong> &middot; bookingcrm.ro
      </footer>
    </div>
  );
}
