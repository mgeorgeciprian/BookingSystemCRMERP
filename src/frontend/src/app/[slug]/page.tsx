"use client";

import { useState, useEffect, useCallback } from "react";
import { publicBooking } from "@/lib/api";

interface BusinessProfile {
  id: number;
  name: string;
  slug: string;
  vertical: string;
  description?: string;
  address?: string;
  city?: string;
  phone?: string;
  cancellation_policy_hours?: number;
  auto_confirm_bookings?: boolean;
}

interface ServiceItem {
  id: number;
  name: string;
  description?: string;
  duration_minutes: number;
  price: number;
  price_max?: number | null;
  currency: string;
  color?: string;
  category_id?: number;
  sort_order?: number;
}

interface EmployeeItem {
  id: number;
  full_name: string;
  display_name?: string | null;
  color: string;
  role: string;
}

interface AvailabilitySlot {
  start: string;
  end: string;
  available: boolean;
}

interface BookingConfirmation {
  appointment_id: number;
  status: string;
  start_time: string;
  end_time: string;
  message: string;
}

function formatTimeFromISO(isoString: string): string {
  const dateObj = new Date(isoString);
  return `${dateObj.getHours().toString().padStart(2, "0")}:${dateObj.getMinutes().toString().padStart(2, "0")}`;
}

function formatDateRomanian(dateStr: string): string {
  const dateObj = new Date(dateStr + "T00:00:00");
  return dateObj.toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function isValidRomanianPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-()]/g, "");
  return /^(\+40|0040|07)\d{8,9}$/.test(cleaned);
}

function getTomorrowString(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split("T")[0];
}

export default function PublicBookingPage({ params }: { params: { slug: string } }) {
  const { slug } = params;

  // Page-level state
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Step state
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeItem | null>(null);
  const [selectedDate, setSelectedDate] = useState(getTomorrowString());
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedSlotData, setSelectedSlotData] = useState<AvailabilitySlot | null>(null);

  // Contact form
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientNotes, setClientNotes] = useState("");
  const [gdprConsent, setGdprConsent] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Booking
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);

  // Loading states
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Load business profile and services on mount
  useEffect(() => {
    async function loadInitialData() {
      setPageLoading(true);
      setPageError(null);
      try {
        const [profileData, servicesData] = await Promise.all([
          publicBooking.profile(slug),
          publicBooking.services(slug),
        ]);
        setBusiness(profileData);
        setServices(servicesData);
      } catch (err: any) {
        if (err.status === 404) {
          setNotFound(true);
        } else {
          setPageError(err.message || "Eroare la incarcarea paginii");
        }
      } finally {
        setPageLoading(false);
      }
    }
    loadInitialData();
  }, [slug]);

  // Load employees when service is selected
  const loadEmployees = useCallback(async (serviceId: number) => {
    setLoadingEmployees(true);
    try {
      const employeesData = await publicBooking.employees(slug, serviceId);
      setEmployees(employeesData);
    } catch {
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  }, [slug]);

  // Load availability when employee/service/date changes
  const loadAvailability = useCallback(async (employeeId: number, serviceId: number, date: string) => {
    setLoadingSlots(true);
    setSlots([]);
    try {
      const availabilityData = await publicBooking.availability(slug, {
        employee_id: String(employeeId),
        service_id: String(serviceId),
        date,
      });
      setSlots(availabilityData.slots || []);
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [slug]);

  function selectService(svc: ServiceItem) {
    setSelectedService(svc);
    setSelectedEmployee(null);
    setSelectedTime("");
    setSelectedSlotData(null);
    loadEmployees(svc.id);
    setStep(2);
  }

  function selectEmployee(emp: EmployeeItem) {
    setSelectedEmployee(emp);
    setSelectedTime("");
    setSelectedSlotData(null);
    const dateToUse = selectedDate || getTomorrowString();
    setSelectedDate(dateToUse);
    loadAvailability(emp.id, selectedService!.id, dateToUse);
    setStep(3);
  }

  function changeDate(date: string) {
    setSelectedDate(date);
    setSelectedTime("");
    setSelectedSlotData(null);
    if (selectedEmployee && selectedService) {
      loadAvailability(selectedEmployee.id, selectedService.id, date);
    }
  }

  function selectTime(slot: AvailabilitySlot) {
    setSelectedTime(formatTimeFromISO(slot.start));
    setSelectedSlotData(slot);
    setStep(4);
  }

  function validatePhone() {
    if (clientPhone && !isValidRomanianPhone(clientPhone)) {
      setPhoneError("Numar de telefon invalid. Folositi formatul 07XXXXXXXX sau +40XXXXXXXXX");
      return false;
    }
    setPhoneError(null);
    return true;
  }

  async function handleBook() {
    if (!validatePhone()) return;
    if (!selectedSlotData || !selectedService || !selectedEmployee) return;

    setBooking(true);
    setBookingError(null);
    try {
      const result = await publicBooking.book(slug, {
        service_id: selectedService.id,
        employee_id: selectedEmployee.id,
        start_time: selectedSlotData.start,
        client_name: clientName,
        client_phone: clientPhone,
        client_email: clientEmail || undefined,
        client_notes: clientNotes || undefined,
        gdpr_consent: true,
      });
      setConfirmation(result);
      setStep(5);
    } catch (err: any) {
      if (err.status === 409) {
        setBookingError("Intervalul selectat nu mai este disponibil. Te rugam sa alegi alt interval.");
      } else {
        setBookingError(err.message || "Eroare la programare. Incearca din nou.");
      }
    } finally {
      setBooking(false);
    }
  }

  const isBookFormValid = clientName.trim() && clientPhone.trim() && gdprConsent && !phoneError;

  const stepLabels = ["Serviciu", "Specialist", "Data & Ora", "Contact", "Confirmare"];

  // Loading state
  if (pageLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
          <p className="mt-4 text-sm text-gray-500">Se incarca...</p>
        </div>
      </div>
    );
  }

  // Not found
  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-6xl font-bold text-gray-200">404</p>
          <h2 className="mt-4 text-xl font-bold text-gray-900">Afacere negasita</h2>
          <p className="mt-2 text-sm text-gray-500">Pagina de programare nu exista sau nu este activa.</p>
        </div>
      </div>
    );
  }

  // Error state
  if (pageError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-4xl">⚠️</p>
          <h2 className="mt-4 text-xl font-bold text-gray-900">Eroare</h2>
          <p className="mt-2 text-sm text-gray-500">{pageError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white"
          >
            Reincearca
          </button>
        </div>
      </div>
    );
  }

  const biz = business!;

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
              <p className="text-xs text-gray-500">{[biz.address, biz.city].filter(Boolean).join(", ")}</p>
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

            {services.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">Niciun serviciu disponibil momentan</p>
            ) : (
              <div className="space-y-2">
                {services.map((svc) => (
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
            )}
          </div>
        )}

        {/* Step 2: Employee */}
        {step === 2 && (
          <div>
            <h2 className="mb-1 text-lg font-bold text-gray-900">Alege specialistul</h2>
            <p className="mb-6 text-sm text-gray-500">Cine sa te serveasca?</p>

            {loadingEmployees ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
              </div>
            ) : employees.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">Niciun specialist disponibil pentru acest serviciu</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {employees.map((emp) => (
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
            )}
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
              {selectedService?.name} cu {selectedEmployee?.display_name || selectedEmployee?.full_name}
            </p>
            <input
              type="date"
              value={selectedDate}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => changeDate(e.target.value)}
              className="mb-4 w-full rounded-xl border px-4 py-3 text-sm focus:border-brand-blue focus:outline-none"
            />

            {loadingSlots ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
              </div>
            ) : slots.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">
                Nu sunt sloturi disponibile in aceasta zi
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((slot) => {
                  const timeStr = formatTimeFromISO(slot.start);
                  return (
                    <button
                      key={slot.start}
                      disabled={!slot.available}
                      onClick={() => selectTime(slot)}
                      className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                        !slot.available
                          ? "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
                          : selectedTime === timeStr
                          ? "border-brand-blue bg-brand-blue text-white shadow-lg shadow-blue-200"
                          : "border-gray-200 bg-white text-gray-700 hover:border-brand-blue hover:shadow-sm"
                      }`}
                    >
                      {timeStr}
                    </button>
                  );
                })}
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
                    {selectedEmployee?.display_name || selectedEmployee?.full_name} &middot; {formatDateRomanian(selectedDate)} la {selectedTime}
                  </p>
                  <p className="text-xs text-gray-400">{selectedService?.duration_minutes} min</p>
                </div>
                <p className="text-xl font-bold text-brand-blue">
                  {selectedService?.price} {selectedService?.currency}
                </p>
              </div>
            </div>

            {bookingError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {bookingError}
              </div>
            )}

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Nume complet *"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-sm focus:border-brand-blue focus:outline-none"
              />
              <div>
                <input
                  type="tel"
                  placeholder="Telefon * (07XXXXXXXX)"
                  value={clientPhone}
                  onChange={(e) => { setClientPhone(e.target.value); setPhoneError(null); }}
                  onBlur={validatePhone}
                  className={`w-full rounded-xl border px-4 py-3 text-sm focus:border-brand-blue focus:outline-none ${phoneError ? "border-red-300" : ""}`}
                />
                {phoneError && <p className="mt-1 text-xs text-red-500">{phoneError}</p>}
              </div>
              <input
                type="email"
                placeholder="Email (optional)"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-sm focus:border-brand-blue focus:outline-none"
              />
              <textarea
                placeholder="Observatii (optional)"
                value={clientNotes}
                onChange={(e) => setClientNotes(e.target.value)}
                rows={2}
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
              disabled={!isBookFormValid || booking}
              className="mt-6 w-full rounded-xl bg-brand-blue px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-200 hover:bg-brand-blue-light disabled:opacity-40 disabled:shadow-none transition-all"
            >
              {booking ? "Se trimite..." : "Confirma programarea"}
            </button>
            <button onClick={() => setStep(3)} className="mt-3 w-full text-sm text-brand-blue hover:underline">
              &larr; Inapoi
            </button>
          </div>
        )}

        {/* Step 5: Confirmation */}
        {step === 5 && confirmation && (
          <div className="text-center py-8">
            <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-4xl">
              {confirmation.status === "confirmed" ? "✅" : "⏳"}
            </div>
            <h2 className="mb-2 text-2xl font-bold text-brand-green">
              {confirmation.status === "confirmed" ? "Programare confirmata!" : "Programare in asteptare"}
            </h2>
            <p className="text-sm text-gray-500 mb-8">
              {confirmation.status === "confirmed"
                ? "Vei primi o confirmare pe WhatsApp/SMS in cateva secunde."
                : "Programarea ta urmeaza sa fie confirmata. Te vom notifica in curand."}
            </p>

            <div className="mx-auto max-w-sm rounded-xl border bg-white p-5 text-left">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Serviciu</span>
                  <span className="text-sm font-medium text-gray-900">{selectedService?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Specialist</span>
                  <span className="text-sm font-medium text-gray-900">{selectedEmployee?.display_name || selectedEmployee?.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Data</span>
                  <span className="text-sm font-medium text-gray-900">{formatDateRomanian(selectedDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Ora</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatTimeFromISO(confirmation.start_time)} - {formatTimeFromISO(confirmation.end_time)}
                  </span>
                </div>
                <div className="border-t pt-3 flex justify-between">
                  <span className="text-xs text-gray-500">Pret</span>
                  <span className="text-lg font-bold text-brand-blue">
                    {selectedService?.price} {selectedService?.currency}
                  </span>
                </div>
              </div>
            </div>

            {biz.phone && (
              <div className="mt-8 rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-700">
                Pentru anulare sau reprogramare, contacteaza-ne cu cel putin {biz.cancellation_policy_hours || 24}h inainte
                la {biz.phone}
              </div>
            )}
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
