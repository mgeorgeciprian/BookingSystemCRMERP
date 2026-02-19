"use client";

import { useState, useMemo, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import {
  appointments as appointmentsApi,
  employees as employeesApi,
  services as servicesApi,
  clients as clientsApi,
} from "@/lib/api";
import { ApiError } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import {
  MOCK_APPOINTMENTS_WEEK,
  MOCK_APPOINTMENTS_TODAY,
  MOCK_EMPLOYEES,
  MOCK_SERVICES,
  MOCK_CLIENTS,
} from "@/lib/mock-data";

// ============================================================
// Types
// ============================================================
interface Appointment {
  id: number;
  employee_id: number;
  service_id: number | null;
  client_id: number | null;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  status: string;
  employee_name: string;
  service_name: string;
  client_name: string;
  client_phone?: string;
  walk_in_name?: string;
  walk_in_phone?: string;
  price?: number;
  final_price?: number;
  currency?: string;
  payment_status?: string;
  payment_method?: string;
  internal_notes?: string;
  client_notes?: string;
  source?: string;
  discount_percent?: number;
  employee_color?: string;
  color?: string;
}

interface EmployeeData {
  id: number;
  full_name: string;
  display_name: string | null;
  color: string;
  role: string;
  is_active: boolean;
  weekly_schedule?: Record<string, { start: string; end: string }[]>;
}

interface ServiceData {
  id: number;
  name: string;
  duration_minutes: number;
  price: number;
  currency: string;
  color: string;
  is_active: boolean;
  category_id?: number;
}

interface ClientData {
  id: number;
  full_name: string;
  phone: string | null;
  email: string | null;
}

interface AvailabilitySlot {
  start: string;
  end: string;
  available: boolean;
}

// ============================================================
// Constants
// ============================================================
const HOURS = Array.from({ length: 13 }, (_, i) => 8 + i); // 08:00 .. 20:00
const ROW_HEIGHT = 72; // px per hour row
const DAY_NAMES_SHORT = ["Lu", "Ma", "Mi", "Jo", "Vi", "Sa", "Du"];
const DAY_NAMES = ["Luni", "Marti", "Miercuri", "Joi", "Vineri", "Sambata", "Duminica"];

// ============================================================
// Helpers
// ============================================================
function formatHour(hourNumber: number): string {
  return `${hourNumber.toString().padStart(2, "0")}:00`;
}

function parseTime(isoString: string): { hours: number; minutes: number } {
  const dateObject = new Date(isoString);
  return { hours: dateObject.getHours(), minutes: dateObject.getMinutes() };
}

function formatTimeShort(isoString: string): string {
  const { hours, minutes } = parseTime(isoString);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

function getDurationMinutes(appointmentData: Appointment): number {
  if (appointmentData.duration_minutes) return appointmentData.duration_minutes;
  if (appointmentData.end_time) {
    const startMillis = new Date(appointmentData.start_time).getTime();
    const endMillis = new Date(appointmentData.end_time).getTime();
    return (endMillis - startMillis) / 60000;
  }
  return 60;
}

function blockPosition(appointmentData: Appointment): { top: number; height: number } {
  const { hours, minutes } = parseTime(appointmentData.start_time);
  const startOffsetHours = hours - 8 + minutes / 60;
  const durationHours = getDurationMinutes(appointmentData) / 60;
  return {
    top: startOffsetHours * ROW_HEIGHT,
    height: Math.max(durationHours * ROW_HEIGHT, 28),
  };
}

function statusStyle(appointmentStatus: string): string {
  switch (appointmentStatus) {
    case "completed": return "bg-green-100 text-green-700";
    case "in_progress": return "bg-blue-100 text-blue-700";
    case "confirmed": return "bg-emerald-100 text-emerald-700";
    case "pending": return "bg-yellow-100 text-yellow-700";
    case "cancelled": return "bg-red-100 text-red-700";
    case "no_show": return "bg-orange-100 text-orange-700";
    default: return "bg-gray-100 text-gray-600";
  }
}

function statusLabel(appointmentStatus: string): string {
  switch (appointmentStatus) {
    case "completed": return "Finalizat";
    case "in_progress": return "In desfasurare";
    case "confirmed": return "Confirmat";
    case "pending": return "In asteptare";
    case "cancelled": return "Anulat";
    case "no_show": return "Neprezentare";
    default: return appointmentStatus;
  }
}

function getWeekDays(referenceDate: Date) {
  const dayOfWeek = referenceDate.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(referenceDate);
  monday.setDate(referenceDate.getDate() + mondayOffset);

  return DAY_NAMES.map((label, index) => {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + index);
    return {
      label,
      shortLabel: DAY_NAMES_SHORT[index],
      date: dayDate.getDate(),
      month: dayDate.getMonth(),
      year: dayDate.getFullYear(),
      fullDate: `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, "0")}-${String(dayDate.getDate()).padStart(2, "0")}`,
    };
  });
}

function getWeekNumber(referenceDate: Date): number {
  const tempDate = new Date(Date.UTC(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate()));
  tempDate.setUTCDate(tempDate.getUTCDate() + 4 - (tempDate.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
  return Math.ceil((((tempDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// ============================================================
// Main Component
// ============================================================
export default function CalendarPage() {
  const activeBusiness = useAppStore((s) => s.activeBusiness);
  const businessId = activeBusiness?.id;

  // --- State ---
  const today = new Date();
  const todayDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [newSlotTime, setNewSlotTime] = useState<{ date: string; hour: number; minute: number; employeeId: number } | null>(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const [mobileSelectedDay, setMobileSelectedDay] = useState(todayDateStr);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobileView(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Week navigation
  const currentWeekBase = useMemo(() => {
    const baseDate = new Date(today);
    baseDate.setDate(baseDate.getDate() + weekOffset * 7);
    return baseDate;
  }, [weekOffset]);

  const weekDays = useMemo(() => getWeekDays(currentWeekBase), [currentWeekBase]);
  const weekStart = weekDays[0].fullDate;
  const weekEnd = weekDays[weekDays.length - 1].fullDate;

  const selectedDateStr = isMobileView ? mobileSelectedDay : todayDateStr;

  // --- Data fetching ---
  const { data: weekAppointments, isUsingMockData, refetch: refetchAppointments } = useFetch(
    () =>
      businessId
        ? appointmentsApi.list(businessId, { date_from: weekStart, date_to: weekEnd })
        : Promise.resolve([]),
    [...MOCK_APPOINTMENTS_TODAY, ...MOCK_APPOINTMENTS_WEEK],
    [businessId, weekStart, weekEnd]
  );

  const { data: employeesList } = useFetch(
    () => (businessId ? employeesApi.list(businessId) : Promise.resolve([])),
    MOCK_EMPLOYEES,
    [businessId]
  );

  const { data: servicesList } = useFetch(
    () => (businessId ? servicesApi.list(businessId) : Promise.resolve([])),
    MOCK_SERVICES,
    [businessId]
  );

  const { data: clientsList } = useFetch(
    () => (businessId ? clientsApi.list(businessId) : Promise.resolve([])),
    MOCK_CLIENTS,
    [businessId]
  );

  const employeesData: EmployeeData[] = (employeesList || []).filter((e: any) => e.is_active !== false);
  const servicesData: ServiceData[] = (servicesList || []).filter((s: any) => s.is_active !== false);
  const clientsData: ClientData[] = clientsList || [];
  const allAppointments = weekAppointments || [];

  // Filter employees
  const filteredEmployees = useMemo(() => {
    if (selectedEmployeeIds.length === 0) return employeesData;
    return employeesData.filter((emp) => selectedEmployeeIds.includes(emp.id));
  }, [employeesData, selectedEmployeeIds]);

  // Build appointments by day
  const appointmentsByDay = useMemo(() => {
    const dayMap = new Map<string, Appointment[]>();
    weekDays.forEach((day) => dayMap.set(day.fullDate, []));

    allAppointments.forEach((rawAppointment: any) => {
      const appointmentDate = new Date(rawAppointment.start_time);
      const dateKey = `${appointmentDate.getFullYear()}-${String(appointmentDate.getMonth() + 1).padStart(2, "0")}-${String(appointmentDate.getDate()).padStart(2, "0")}`;
      const dayList = dayMap.get(dateKey);
      if (!dayList) return;

      const employeeColor = employeesData.find((e) => e.id === rawAppointment.employee_id)?.color ?? "#6b7280";
      dayList.push({
        ...rawAppointment,
        employee_name: rawAppointment.employee_name || "",
        service_name: rawAppointment.service_name || "",
        client_name: rawAppointment.client_name || rawAppointment.walk_in_name || "Walk-in",
        color: employeeColor,
        employee_color: employeeColor,
      });
    });

    return dayMap;
  }, [allAppointments, weekDays, employeesData]);

  const totalGridHeight = HOURS.length * ROW_HEIGHT;

  // Current-time indicator
  const nowOffset = useMemo(() => {
    const nowDate = new Date();
    const offsetPixels = (nowDate.getHours() - 8 + nowDate.getMinutes() / 60) * ROW_HEIGHT;
    if (offsetPixels < 0 || offsetPixels > totalGridHeight) return null;
    return offsetPixels;
  }, [totalGridHeight]);

  // --- Handlers ---
  const handlePrevWeek = () => setWeekOffset((prev) => prev - 1);
  const handleNextWeek = () => setWeekOffset((prev) => prev + 1);
  const handleToday = () => {
    setWeekOffset(0);
    setMobileSelectedDay(todayDateStr);
  };

  const handleEmptySlotClick = (dayDate: string, hourValue: number, minuteValue: number, employeeId: number) => {
    setNewSlotTime({ date: dayDate, hour: hourValue, minute: minuteValue, employeeId });
    setShowNewModal(true);
  };

  const handleAppointmentClick = (appointmentData: Appointment) => {
    setSelectedAppointment(appointmentData);
    setShowDetailModal(true);
  };

  const handleEmployeeFilterToggle = (employeeId: number) => {
    setSelectedEmployeeIds((prev) => {
      if (prev.includes(employeeId)) {
        return prev.filter((existingId) => existingId !== employeeId);
      }
      return [...prev, employeeId];
    });
  };

  // --- Render: Week View (Desktop) ---
  const renderWeekView = () => (
    <div className="flex-1 min-h-0 overflow-auto rounded-xl border border-gray-200 bg-white">
      <div className="flex min-w-[700px]">
        {/* Time gutter */}
        <div className="shrink-0 w-16 border-r border-gray-100 bg-gray-50/50" style={{ paddingTop: 56 }}>
          {HOURS.map((hourValue) => (
            <div key={hourValue} className="flex items-start justify-end pr-3 text-xs text-gray-400 font-medium" style={{ height: ROW_HEIGHT }}>
              {formatHour(hourValue)}
            </div>
          ))}
        </div>

        {/* Employee columns */}
        <div className="flex flex-1">
          {filteredEmployees.map((employee) => {
            // Get appointments for the selected day for this employee
            const dayKey = isMobileView ? mobileSelectedDay : todayDateStr;
            const dayAppointments = (appointmentsByDay.get(dayKey) || []).filter(
              (apt) => apt.employee_id === employee.id
            );

            return (
              <div key={employee.id} className="flex-1 min-w-[160px] border-r border-gray-100 last:border-r-0">
                {/* Column header */}
                <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-gray-200 bg-white px-3 py-3">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: employee.color }} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{employee.display_name || employee.full_name}</p>
                    <p className="truncate text-xs text-gray-400 capitalize">{employee.role}</p>
                  </div>
                </div>

                {/* Time grid body */}
                <div className="relative" style={{ height: totalGridHeight }}>
                  {/* Hour lines */}
                  {HOURS.map((hourValue) => (
                    <div key={hourValue} className="absolute left-0 right-0 border-t border-gray-100" style={{ top: (hourValue - 8) * ROW_HEIGHT }} />
                  ))}
                  {/* Half-hour lines */}
                  {HOURS.slice(0, -1).map((hourValue) => (
                    <div key={`half-${hourValue}`} className="absolute left-0 right-0 border-t border-dashed border-gray-50" style={{ top: (hourValue - 8) * ROW_HEIGHT + ROW_HEIGHT / 2 }} />
                  ))}

                  {/* Clickable empty slots - 30min intervals */}
                  {HOURS.slice(0, -1).map((hourValue) =>
                    [0, 30].map((minuteValue) => (
                      <div
                        key={`slot-${hourValue}-${minuteValue}`}
                        className="absolute left-0 right-0 cursor-pointer hover:bg-blue-50/50 transition-colors"
                        style={{ top: (hourValue - 8) * ROW_HEIGHT + (minuteValue / 60) * ROW_HEIGHT, height: ROW_HEIGHT / 2 }}
                        onClick={() => handleEmptySlotClick(dayKey, hourValue, minuteValue, employee.id)}
                      />
                    ))
                  )}

                  {/* Now indicator */}
                  {nowOffset !== null && dayKey === todayDateStr && (
                    <div className="absolute left-0 right-0 z-20 flex items-center" style={{ top: nowOffset }}>
                      <span className="h-2 w-2 -ml-1 rounded-full bg-red-500" />
                      <span className="flex-1 border-t-2 border-red-500" />
                    </div>
                  )}

                  {/* Appointment blocks */}
                  {dayAppointments.map((appointmentData) => {
                    const { top, height } = blockPosition(appointmentData);
                    const employeeColor = appointmentData.color ?? "#6b7280";
                    const isCompact = height < 52;

                    return (
                      <div
                        key={appointmentData.id}
                        className="absolute left-1 right-1 z-10 cursor-pointer overflow-hidden rounded-lg border shadow-sm transition-shadow hover:shadow-md"
                        style={{
                          top,
                          height,
                          backgroundColor: `${employeeColor}15`,
                          borderColor: `${employeeColor}40`,
                        }}
                        title={`${appointmentData.client_name} - ${appointmentData.service_name}\n${formatTimeShort(appointmentData.start_time)} (${getDurationMinutes(appointmentData)} min)\n${statusLabel(appointmentData.status)}`}
                        onClick={(clickEvent) => {
                          clickEvent.stopPropagation();
                          handleAppointmentClick(appointmentData);
                        }}
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg" style={{ backgroundColor: employeeColor }} />
                        <div className="pl-3 pr-2 py-1">
                          {isCompact ? (
                            <p className="truncate text-xs font-medium text-gray-800">
                              {appointmentData.client_name} &middot; {appointmentData.service_name}
                            </p>
                          ) : (
                            <>
                              <p className="truncate text-xs font-semibold text-gray-900">{appointmentData.client_name}</p>
                              <p className="mt-0.5 truncate text-xs text-gray-600">{appointmentData.service_name}</p>
                              <div className="mt-1 flex items-center gap-2">
                                <span className="text-[10px] font-medium text-gray-500">
                                  {formatTimeShort(appointmentData.start_time)}
                                  {appointmentData.end_time ? ` - ${formatTimeShort(appointmentData.end_time)}` : ""}
                                </span>
                                <span className={`inline-block rounded-full px-1.5 py-0 text-[10px] font-medium leading-4 ${statusStyle(appointmentData.status)}`}>
                                  {statusLabel(appointmentData.status)}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // --- Render: Day View (Mobile) ---
  const renderMobileDayView = () => {
    const dayAppointments = appointmentsByDay.get(mobileSelectedDay) || [];
    const filteredDayAppointments = filteredEmployees.length > 0
      ? dayAppointments.filter((apt) => filteredEmployees.some((emp) => emp.id === apt.employee_id))
      : dayAppointments;

    return (
      <div className="flex-1 min-h-0">
        {/* Day selector strip */}
        <div className="flex gap-1 overflow-x-auto py-2 mb-3">
          {weekDays.map((day) => {
            const isSelected = mobileSelectedDay === day.fullDate;
            const isToday = day.fullDate === todayDateStr;
            const dayAppointmentCount = (appointmentsByDay.get(day.fullDate) || []).length;
            return (
              <button
                key={day.fullDate}
                onClick={() => setMobileSelectedDay(day.fullDate)}
                className={`flex flex-col items-center rounded-xl px-3 py-2 min-w-[52px] transition-all ${
                  isSelected ? "bg-brand-blue text-white shadow-sm" : "bg-white text-gray-600 border"
                }`}
              >
                <span className="text-[10px] uppercase font-medium">{day.shortLabel}</span>
                <span className={`text-lg font-bold ${isToday && !isSelected ? "text-brand-blue" : ""}`}>{day.date}</span>
                {dayAppointmentCount > 0 && (
                  <span className={`text-[9px] font-medium ${isSelected ? "text-white/80" : "text-gray-400"}`}>
                    {dayAppointmentCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Day appointments list */}
        <div className="space-y-2">
          {filteredDayAppointments.length === 0 ? (
            <div className="rounded-xl border bg-white p-8 text-center">
              <p className="text-sm text-gray-400">Nicio programare in aceasta zi</p>
              <button onClick={() => setShowNewModal(true)} className="mt-3 text-sm font-medium text-brand-blue">
                + Adauga programare
              </button>
            </div>
          ) : (
            filteredDayAppointments
              .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
              .map((appointmentData) => (
                <div
                  key={appointmentData.id}
                  className="flex items-center gap-3 rounded-xl border bg-white p-4 cursor-pointer hover:shadow-sm transition-shadow"
                  onClick={() => handleAppointmentClick(appointmentData)}
                >
                  <div className="h-10 w-1 rounded-full" style={{ backgroundColor: appointmentData.color || "#6b7280" }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">{appointmentData.client_name}</p>
                      <span className={`inline-block rounded-full px-1.5 py-0 text-[10px] font-medium leading-4 ${statusStyle(appointmentData.status)}`}>
                        {statusLabel(appointmentData.status)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{appointmentData.service_name} &middot; {appointmentData.employee_name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium text-gray-900">{formatTimeShort(appointmentData.start_time)}</p>
                    <p className="text-[10px] text-gray-400">{getDurationMinutes(appointmentData)} min</p>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    );
  };

  // Count appointments for display
  const currentDayAppointments = isMobileView
    ? (appointmentsByDay.get(mobileSelectedDay) || [])
    : (appointmentsByDay.get(todayDateStr) || []);

  const weekMonthLabel = weekDays.length > 0
    ? new Date(weekDays[0].year, weekDays[0].month).toLocaleDateString("ro-RO", { month: "long", year: "numeric" })
    : "";

  return (
    <div className="flex flex-col h-full min-h-0 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="shrink-0 mb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Calendar</h2>
            <p className="text-sm text-gray-500">
              Saptamana {weekDays[0]?.date} &ndash; {weekDays[weekDays.length - 1]?.date} {weekMonthLabel}
              <span className="ml-2 text-gray-400">(S{getWeekNumber(currentWeekBase)})</span>
            </p>
            {isUsingMockData && (
              <p className="mt-1 text-[10px] text-amber-500 font-medium">
                Date demo &mdash; backend-ul nu este conectat
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 hidden sm:inline">
              {currentDayAppointments.length} programari
            </span>
            <button
              onClick={() => setShowNewModal(true)}
              className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-blue-light transition-colors"
            >
              + Programare noua
            </button>
          </div>
        </div>

        {/* Week navigation + Employee filters */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Week navigation */}
          <div className="flex items-center gap-2">
            <button onClick={handlePrevWeek} className="rounded-lg border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
            </button>
            <button onClick={handleToday} className="rounded-lg border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Astazi
            </button>
            <button onClick={handleNextWeek} className="rounded-lg border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
            </button>
          </div>

          {/* Employee filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-gray-500 mr-1">Filtru:</span>
            {employeesData.map((employee) => {
              const isActive = selectedEmployeeIds.length === 0 || selectedEmployeeIds.includes(employee.id);
              return (
                <button
                  key={employee.id}
                  onClick={() => handleEmployeeFilterToggle(employee.id)}
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                    isActive
                      ? "border-transparent text-white shadow-sm"
                      : "border-gray-200 text-gray-400 bg-white"
                  }`}
                  style={isActive ? { backgroundColor: employee.color } : {}}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: isActive ? "#fff" : employee.color }} />
                  {employee.display_name || employee.full_name.split(" ")[0]}
                </button>
              );
            })}
            {selectedEmployeeIds.length > 0 && (
              <button onClick={() => setSelectedEmployeeIds([])} className="text-xs text-gray-400 hover:text-gray-600 ml-1">
                Reseteaza
              </button>
            )}
          </div>
        </div>

        {/* Desktop: Day tabs */}
        {!isMobileView && (
          <div className="mt-4 flex gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1">
            {weekDays.map((day) => {
              const isToday = day.fullDate === todayDateStr;
              const dayAppointmentCount = (appointmentsByDay.get(day.fullDate) || []).length;
              return (
                <div
                  key={day.fullDate}
                  className={`relative flex flex-col items-center rounded-lg px-4 py-2 text-sm font-medium min-w-[100px] ${
                    isToday ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                  }`}
                >
                  <span className="text-xs uppercase tracking-wide">{day.label}</span>
                  <span className={`mt-0.5 text-lg font-bold ${isToday ? "text-brand-blue" : ""}`}>{day.date}</span>
                  {dayAppointmentCount > 0 && (
                    <span className="text-[10px] text-gray-400">{dayAppointmentCount} prog.</span>
                  )}
                  {isToday && <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-blue-500" />}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Calendar grid */}
      {isMobileView ? renderMobileDayView() : renderWeekView()}

      {/* Legend */}
      <div className="shrink-0 mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-500">
        <span className="font-medium text-gray-700">Legenda:</span>
        {[
          { label: "Finalizat", cls: "bg-green-100 text-green-700" },
          { label: "In desfasurare", cls: "bg-blue-100 text-blue-700" },
          { label: "Confirmat", cls: "bg-emerald-100 text-emerald-700" },
          { label: "In asteptare", cls: "bg-yellow-100 text-yellow-700" },
        ].map((legendItem) => (
          <span key={legendItem.label} className="flex items-center gap-1">
            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${legendItem.cls}`}>
              {legendItem.label}
            </span>
          </span>
        ))}
        <span className="ml-auto text-gray-400">{activeBusiness?.name || "BookingCRM"}</span>
      </div>

      {/* New Appointment Modal */}
      {showNewModal && (
        <NewAppointmentModal
          businessId={businessId!}
          employees={employeesData}
          servicesList={servicesData}
          clientsList={clientsData}
          initialData={newSlotTime}
          onClose={() => {
            setShowNewModal(false);
            setNewSlotTime(null);
          }}
          onCreated={() => {
            setShowNewModal(false);
            setNewSlotTime(null);
            refetchAppointments();
          }}
        />
      )}

      {/* Appointment Detail Modal */}
      {showDetailModal && selectedAppointment && (
        <AppointmentDetailModal
          businessId={businessId!}
          appointment={selectedAppointment}
          employees={employeesData}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedAppointment(null);
          }}
          onUpdated={() => {
            setShowDetailModal(false);
            setSelectedAppointment(null);
            refetchAppointments();
          }}
        />
      )}
    </div>
  );
}

// ============================================================
// New Appointment Modal
// ============================================================
function NewAppointmentModal({
  businessId,
  employees,
  servicesList,
  clientsList,
  initialData,
  onClose,
  onCreated,
}: {
  businessId: number;
  employees: EmployeeData[];
  servicesList: ServiceData[];
  clientsList: ClientData[];
  initialData: { date: string; hour: number; minute: number; employeeId: number } | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number>(initialData?.employeeId || employees[0]?.id || 0);
  const [selectedServiceId, setSelectedServiceId] = useState<number>(servicesList[0]?.id || 0);
  const [selectedDate, setSelectedDate] = useState<string>(initialData?.date || new Date().toISOString().split("T")[0]);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [clientMode, setClientMode] = useState<"existing" | "walkin">("existing");
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [walkInName, setWalkInName] = useState("");
  const [walkInPhone, setWalkInPhone] = useState("");
  const [priceOverride, setPriceOverride] = useState<string>("");
  const [internalNotes, setInternalNotes] = useState("");
  const [clientNotes, setClientNotes] = useState("");
  const [discountPercent, setDiscountPercent] = useState<string>("0");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Set initial slot time if provided
  useEffect(() => {
    if (initialData) {
      const initialSlotTime = `${initialData.hour.toString().padStart(2, "0")}:${initialData.minute.toString().padStart(2, "0")}`;
      setSelectedSlot(initialSlotTime);
    }
  }, [initialData]);

  // Fetch availability when employee, service, or date changes
  useEffect(() => {
    if (!selectedEmployeeId || !selectedServiceId || !selectedDate) return;
    setLoadingSlots(true);
    appointmentsApi
      .availability(businessId, {
        employee_id: String(selectedEmployeeId),
        service_id: String(selectedServiceId),
        date: selectedDate,
      })
      .then((response) => {
        setAvailabilitySlots(response.slots || []);
      })
      .catch(() => {
        setAvailabilitySlots([]);
      })
      .finally(() => setLoadingSlots(false));
  }, [businessId, selectedEmployeeId, selectedServiceId, selectedDate]);

  // Auto-fill price from service
  const selectedService = servicesList.find((svc) => svc.id === selectedServiceId);
  const displayPrice = priceOverride || String(selectedService?.price || 0);

  // Client search filter
  const filteredClients = useMemo(() => {
    if (!clientSearchQuery.trim()) return clientsList.slice(0, 10);
    const searchLower = clientSearchQuery.toLowerCase();
    return clientsList.filter(
      (client) =>
        client.full_name.toLowerCase().includes(searchLower) ||
        (client.phone && client.phone.includes(clientSearchQuery)) ||
        (client.email && client.email.toLowerCase().includes(searchLower))
    );
  }, [clientsList, clientSearchQuery]);

  const handleSubmit = async () => {
    setErrorMessage(null);
    setSubmitting(true);

    try {
      // Build start_time ISO
      const [slotHours, slotMinutes] = selectedSlot.split(":").map(Number);
      const startDateTime = new Date(`${selectedDate}T${selectedSlot}:00`);

      const requestPayload: any = {
        employee_id: selectedEmployeeId,
        service_id: selectedServiceId,
        start_time: startDateTime.toISOString(),
        source: "manual",
      };

      if (clientMode === "existing" && selectedClientId) {
        requestPayload.client_id = selectedClientId;
      } else {
        requestPayload.walk_in_name = walkInName;
        requestPayload.walk_in_phone = walkInPhone || undefined;
      }

      if (priceOverride) {
        requestPayload.price = parseFloat(priceOverride);
      }
      if (Number(discountPercent) > 0) {
        requestPayload.discount_percent = parseFloat(discountPercent);
      }
      if (internalNotes) requestPayload.internal_notes = internalNotes;
      if (clientNotes) requestPayload.client_notes = clientNotes;

      await appointmentsApi.create(businessId, requestPayload);
      onCreated();
    } catch (caughtError: any) {
      if (caughtError instanceof ApiError) {
        if (caughtError.status === 409) {
          setErrorMessage("Conflict de programare - intervalul este deja ocupat. Alege alt interval.");
        } else {
          setErrorMessage(caughtError.message);
        }
      } else {
        setErrorMessage("Eroare la crearea programarii. Incearca din nou.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit =
    selectedEmployeeId &&
    selectedServiceId &&
    selectedDate &&
    selectedSlot &&
    (clientMode === "existing" ? selectedClientId : walkInName.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl" onClick={(clickEvent) => clickEvent.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4 rounded-t-2xl">
          <h3 className="text-lg font-bold text-gray-900">Programare noua</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Error */}
          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          {/* Employee */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Specialist</label>
            <select
              value={selectedEmployeeId}
              onChange={(changeEvent) => setSelectedEmployeeId(Number(changeEvent.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            >
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.display_name || employee.full_name} ({employee.role})
                </option>
              ))}
            </select>
          </div>

          {/* Service */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Serviciu</label>
            <select
              value={selectedServiceId}
              onChange={(changeEvent) => setSelectedServiceId(Number(changeEvent.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            >
              {servicesList.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} - {service.duration_minutes} min - {service.price} RON
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Data</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(changeEvent) => setSelectedDate(changeEvent.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
          </div>

          {/* Available slots */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Interval disponibil
              {loadingSlots && <span className="ml-2 text-gray-400 font-normal">Se incarca...</span>}
            </label>
            {availabilitySlots.length > 0 ? (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-40 overflow-y-auto">
                {availabilitySlots.map((slot) => {
                  const slotTimeString = formatTimeShort(slot.start);
                  const isSelected = selectedSlot === slotTimeString;
                  return (
                    <button
                      key={slot.start}
                      disabled={!slot.available}
                      onClick={() => setSelectedSlot(slotTimeString)}
                      className={`rounded-lg px-2 py-1.5 text-xs font-medium transition-all ${
                        !slot.available
                          ? "bg-gray-100 text-gray-300 cursor-not-allowed line-through"
                          : isSelected
                          ? "bg-brand-blue text-white shadow-sm"
                          : "bg-gray-50 text-gray-700 hover:bg-blue-50 hover:text-brand-blue border"
                      }`}
                    >
                      {slotTimeString}
                    </button>
                  );
                })}
              </div>
            ) : !loadingSlots ? (
              <div className="rounded-lg border border-dashed border-gray-200 p-4 text-center">
                <p className="text-xs text-gray-400">Niciun interval disponibil. Selecteaza alt specialist/data.</p>
                {/* Manual fallback input */}
                <input
                  type="time"
                  value={selectedSlot}
                  onChange={(changeEvent) => setSelectedSlot(changeEvent.target.value)}
                  className="mt-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                  step="1800"
                />
              </div>
            ) : null}
          </div>

          {/* Client selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Client</label>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setClientMode("existing")}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  clientMode === "existing" ? "bg-brand-blue text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                Client existent
              </button>
              <button
                onClick={() => setClientMode("walkin")}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  clientMode === "walkin" ? "bg-brand-blue text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                Walk-in
              </button>
            </div>

            {clientMode === "existing" ? (
              <div>
                <input
                  type="text"
                  value={clientSearchQuery}
                  onChange={(changeEvent) => setClientSearchQuery(changeEvent.target.value)}
                  placeholder="Cauta dupa nume sau telefon..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-2 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                />
                <div className="max-h-36 overflow-y-auto space-y-1">
                  {filteredClients.map((client) => (
                    <div
                      key={client.id}
                      onClick={() => setSelectedClientId(client.id)}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                        selectedClientId === client.id
                          ? "bg-brand-blue/10 border border-brand-blue/30"
                          : "hover:bg-gray-50 border border-transparent"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{client.full_name}</p>
                        <p className="text-xs text-gray-400">{client.phone || "Fara telefon"}</p>
                      </div>
                      {selectedClientId === client.id && (
                        <svg className="h-4 w-4 text-brand-blue" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  value={walkInName}
                  onChange={(changeEvent) => setWalkInName(changeEvent.target.value)}
                  placeholder="Nume client walk-in *"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                />
                <input
                  type="tel"
                  value={walkInPhone}
                  onChange={(changeEvent) => setWalkInPhone(changeEvent.target.value)}
                  placeholder="Telefon (optional)"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                />
              </div>
            )}
          </div>

          {/* Price + Discount */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Pret (RON)</label>
              <input
                type="number"
                value={displayPrice}
                onChange={(changeEvent) => setPriceOverride(changeEvent.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                min={0}
                step={0.01}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Discount (%)</label>
              <input
                type="number"
                value={discountPercent}
                onChange={(changeEvent) => setDiscountPercent(changeEvent.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                min={0}
                max={100}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notite interne</label>
              <textarea
                value={internalNotes}
                onChange={(changeEvent) => setInternalNotes(changeEvent.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                rows={2}
                placeholder="Vizibile doar de echipa"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notite client</label>
              <textarea
                value={clientNotes}
                onChange={(changeEvent) => setClientNotes(changeEvent.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                rows={2}
                placeholder="De la client"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t bg-gray-50 px-6 py-4 rounded-b-2xl">
          <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
            Anuleaza
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="rounded-lg bg-brand-blue px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-blue-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Se salveaza..." : "Salveaza programare"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Appointment Detail Modal
// ============================================================
function AppointmentDetailModal({
  businessId,
  appointment,
  employees,
  onClose,
  onUpdated,
}: {
  businessId: number;
  appointment: Appointment;
  employees: EmployeeData[];
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [actionInProgress, setActionInProgress] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const employeeData = employees.find((emp) => emp.id === appointment.employee_id);
  const employeeColor = employeeData?.color || "#6b7280";

  const handleStatusChange = async (newStatus: string) => {
    setErrorMessage(null);
    setActionInProgress(true);
    try {
      await appointmentsApi.update(businessId, appointment.id, {
        payment_status: newStatus === "completed" ? "paid" : undefined,
      });
      onUpdated();
    } catch (caughtError: any) {
      setErrorMessage(caughtError.message || "Eroare la actualizare");
    } finally {
      setActionInProgress(false);
    }
  };

  const handleCancel = async () => {
    setErrorMessage(null);
    setActionInProgress(true);
    try {
      await appointmentsApi.cancel(businessId, appointment.id, {
        cancelled_by: "employee",
        reason: cancelReason || undefined,
        notify_client: true,
      });
      onUpdated();
    } catch (caughtError: any) {
      setErrorMessage(caughtError.message || "Eroare la anulare");
    } finally {
      setActionInProgress(false);
    }
  };

  const isCancellable = !["cancelled", "completed", "no_show"].includes(appointment.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={(clickEvent) => clickEvent.stopPropagation()}>
        {/* Color bar */}
        <div className="h-2" style={{ backgroundColor: employeeColor }} />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Detalii programare</h3>
            <p className="text-xs text-gray-400">#{appointment.id}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>
          )}

          {/* Status badge */}
          <div className="flex items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-sm font-medium ${statusStyle(appointment.status)}`}>
              {statusLabel(appointment.status)}
            </span>
            {appointment.payment_status && (
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                appointment.payment_status === "paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
              }`}>
                {appointment.payment_status === "paid" ? "Platit" : appointment.payment_status === "partial" ? "Partial" : "Neplatit"}
              </span>
            )}
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Client</p>
              <p className="text-sm font-medium text-gray-900">{appointment.client_name}</p>
              {(appointment.client_phone || appointment.walk_in_phone) && (
                <p className="text-xs text-gray-400">{appointment.client_phone || appointment.walk_in_phone}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Specialist</p>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: employeeColor }} />
                <p className="text-sm font-medium text-gray-900">{appointment.employee_name}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Serviciu</p>
              <p className="text-sm font-medium text-gray-900">{appointment.service_name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Ora</p>
              <p className="text-sm font-medium text-gray-900">
                {formatTimeShort(appointment.start_time)}
                {appointment.end_time && ` - ${formatTimeShort(appointment.end_time)}`}
              </p>
              <p className="text-xs text-gray-400">{getDurationMinutes(appointment)} minute</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Pret</p>
              <p className="text-sm font-bold text-gray-900">
                {appointment.final_price ?? appointment.price ?? "-"} {appointment.currency || "RON"}
              </p>
              {appointment.discount_percent ? (
                <p className="text-xs text-green-600">-{appointment.discount_percent}% discount</p>
              ) : null}
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Sursa</p>
              <p className="text-sm text-gray-700 capitalize">{appointment.source || "manual"}</p>
            </div>
          </div>

          {/* Notes */}
          {(appointment.internal_notes || appointment.client_notes) && (
            <div className="space-y-2 border-t pt-4">
              {appointment.internal_notes && (
                <div>
                  <p className="text-xs font-medium text-gray-500">Notite interne</p>
                  <p className="text-sm text-gray-700">{appointment.internal_notes}</p>
                </div>
              )}
              {appointment.client_notes && (
                <div>
                  <p className="text-xs font-medium text-gray-500">Notite client</p>
                  <p className="text-sm text-gray-700">{appointment.client_notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Cancel confirmation */}
          {showCancelConfirm && (
            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-medium text-red-600">Sigur doriti anularea programarii?</p>
              <textarea
                value={cancelReason}
                onChange={(changeEvent) => setCancelReason(changeEvent.target.value)}
                placeholder="Motivul anularii (optional)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                rows={2}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  disabled={actionInProgress}
                  className="rounded-lg bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {actionInProgress ? "Se anuleaza..." : "Confirma anularea"}
                </button>
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="rounded-lg border px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                >
                  Inapoi
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {!showCancelConfirm && (
          <div className="flex items-center justify-between border-t px-6 py-4 bg-gray-50">
            <div className="flex gap-2">
              {isCancellable && (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  Anuleaza
                </button>
              )}
            </div>
            <div className="flex gap-2">
              {appointment.status === "pending" && (
                <button
                  onClick={() => handleStatusChange("confirmed")}
                  disabled={actionInProgress}
                  className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  Confirma
                </button>
              )}
              {appointment.status === "confirmed" && (
                <button
                  onClick={() => handleStatusChange("in_progress")}
                  disabled={actionInProgress}
                  className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Incepe
                </button>
              )}
              {appointment.status === "in_progress" && (
                <button
                  onClick={() => handleStatusChange("completed")}
                  disabled={actionInProgress}
                  className="rounded-lg bg-green-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  Finalizeaza
                </button>
              )}
              <button onClick={onClose} className="rounded-lg border px-4 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100">
                Inchide
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
