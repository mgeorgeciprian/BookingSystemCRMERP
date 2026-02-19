"use client";

import { useState, useMemo } from "react";
import {
  MOCK_APPOINTMENTS_WEEK,
  MOCK_APPOINTMENTS_TODAY,
  MOCK_EMPLOYEES,
} from "@/lib/mock-data";

// ── Types ──────────────────────────────────────────────────────
interface Appointment {
  id: number;
  employee_id: number;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  status: string;
  employee_name: string;
  service_name: string;
  client_name: string;
  color?: string;
}

// ── Constants ──────────────────────────────────────────────────
const DAYS = [
  { label: "Luni", shortLabel: "Lun", date: 17, dayKey: "mon" },
  { label: "Marti", shortLabel: "Mar", date: 18, dayKey: "tue" },
  { label: "Miercuri", shortLabel: "Mie", date: 19, dayKey: "wed" },
  { label: "Joi", shortLabel: "Joi", date: 20, dayKey: "thu" },
  { label: "Vineri", shortLabel: "Vin", date: 21, dayKey: "fri" },
  { label: "Sambata", shortLabel: "Sam", date: 22, dayKey: "sat" },
] as const;

const HOURS = Array.from({ length: 13 }, (_, i) => 8 + i); // 08:00 .. 20:00
const ROW_HEIGHT = 72; // px per hour row
const TODAY_DATE = 19; // Wednesday 19 Feb 2026

// ── Helpers ────────────────────────────────────────────────────
function formatHour(h: number): string {
  return `${h.toString().padStart(2, "0")}:00`;
}

function parseTime(iso: string): { hours: number; minutes: number } {
  const d = new Date(iso);
  return { hours: d.getHours(), minutes: d.getMinutes() };
}

function formatTimeShort(iso: string): string {
  const { hours, minutes } = parseTime(iso);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

function getDurationMinutes(apt: Appointment): number {
  if (apt.duration_minutes) return apt.duration_minutes;
  const start = new Date(apt.start_time).getTime();
  const end = new Date(apt.end_time!).getTime();
  return (end - start) / 60000;
}

function getDateFromIso(iso: string): number {
  return new Date(iso).getDate();
}

/** Return top offset (px) and height (px) for an appointment block */
function blockPosition(apt: Appointment): { top: number; height: number } {
  const { hours, minutes } = parseTime(apt.start_time);
  const startOffsetHours = hours - 8 + minutes / 60;
  const durationHours = getDurationMinutes(apt) / 60;
  return {
    top: startOffsetHours * ROW_HEIGHT,
    height: Math.max(durationHours * ROW_HEIGHT, 28), // min 28px so text is visible
  };
}

/** Status badge styling */
function statusStyle(status: string): string {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-700";
    case "in_progress":
      return "bg-blue-100 text-blue-700";
    case "confirmed":
      return "bg-emerald-100 text-emerald-700";
    case "pending":
      return "bg-yellow-100 text-yellow-700";
    case "cancelled":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "completed":
      return "Finalizat";
    case "in_progress":
      return "In desfasurare";
    case "confirmed":
      return "Confirmat";
    case "pending":
      return "In asteptare";
    case "cancelled":
      return "Anulat";
    default:
      return status;
  }
}

// ── Component ──────────────────────────────────────────────────
export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState(TODAY_DATE);

  // Build the appointment list for the selected day
  const dayAppointments: Appointment[] = useMemo(() => {
    if (selectedDate === TODAY_DATE) {
      // Wednesday 19 -- use the richer MOCK_APPOINTMENTS_TODAY
      return MOCK_APPOINTMENTS_TODAY.map((a) => ({
        id: a.id,
        employee_id: a.employee_id,
        start_time: a.start_time,
        end_time: a.end_time,
        duration_minutes: a.duration_minutes,
        status: a.status,
        employee_name: a.employee_name,
        service_name: a.service_name,
        client_name: a.client_name,
        color:
          MOCK_EMPLOYEES.find((e) => e.id === a.employee_id)?.color ?? "#6b7280",
      }));
    }
    return MOCK_APPOINTMENTS_WEEK.filter(
      (a) => getDateFromIso(a.start_time) === selectedDate
    );
  }, [selectedDate]);

  // Group appointments by employee_id
  const byEmployee = useMemo(() => {
    const map = new Map<number, Appointment[]>();
    MOCK_EMPLOYEES.forEach((e) => map.set(e.id, []));
    dayAppointments.forEach((a) => {
      const list = map.get(a.employee_id);
      if (list) list.push(a);
    });
    return map;
  }, [dayAppointments]);

  const totalGridHeight = HOURS.length * ROW_HEIGHT;

  // Current-time indicator (only on "today")
  const now = useMemo(() => {
    if (selectedDate !== TODAY_DATE) return null;
    // For demo purposes, pin to 11:15 to be visually interesting
    const fakeHour = 11;
    const fakeMin = 15;
    const offset = (fakeHour - 8 + fakeMin / 60) * ROW_HEIGHT;
    return offset;
  }, [selectedDate]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Header ────────────────────────────────────── */}
      <div className="shrink-0 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Calendar</h2>
            <p className="text-sm text-gray-500">
              Saptamana 17 &ndash; 22 Februarie 2026
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 hidden sm:inline">
              {dayAppointments.length} programari
            </span>
            <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors">
              + Programare noua
            </button>
          </div>
        </div>

        {/* ── Day tabs ─────────────────────────────────── */}
        <div className="mt-4 flex gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1">
          {DAYS.map((day) => {
            const isSelected = selectedDate === day.date;
            const isToday = day.date === TODAY_DATE;
            return (
              <button
                key={day.date}
                onClick={() => setSelectedDate(day.date)}
                className={`
                  relative flex flex-col items-center rounded-lg px-4 py-2 text-sm font-medium transition-all min-w-[100px]
                  ${
                    isSelected
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
                  }
                `}
              >
                <span className="text-xs uppercase tracking-wide">
                  {day.label}
                </span>
                <span
                  className={`mt-0.5 text-lg font-bold ${
                    isToday && isSelected
                      ? "text-blue-600"
                      : isToday
                      ? "text-blue-500"
                      : ""
                  }`}
                >
                  {day.date}
                </span>
                {isToday && (
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-blue-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Calendar grid ──────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-auto rounded-xl border border-gray-200 bg-white">
        <div className="flex min-w-[700px]">
          {/* Time gutter */}
          <div
            className="shrink-0 w-16 border-r border-gray-100 bg-gray-50/50"
            style={{ paddingTop: 56 }} /* header height offset */
          >
            {HOURS.map((h) => (
              <div
                key={h}
                className="flex items-start justify-end pr-3 text-xs text-gray-400 font-medium"
                style={{ height: ROW_HEIGHT }}
              >
                {formatHour(h)}
              </div>
            ))}
          </div>

          {/* Employee columns */}
          <div className="flex flex-1">
            {MOCK_EMPLOYEES.map((emp) => (
              <div
                key={emp.id}
                className="flex-1 min-w-[160px] border-r border-gray-100 last:border-r-0"
              >
                {/* Column header */}
                <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-gray-200 bg-white px-3 py-3">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: emp.color }}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {emp.display_name}
                    </p>
                    <p className="truncate text-xs text-gray-400 capitalize">
                      {emp.role}
                    </p>
                  </div>
                </div>

                {/* Time grid body */}
                <div className="relative" style={{ height: totalGridHeight }}>
                  {/* Hour grid lines */}
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 border-t border-gray-100"
                      style={{ top: (h - 8) * ROW_HEIGHT }}
                    />
                  ))}

                  {/* Half-hour dashed lines */}
                  {HOURS.slice(0, -1).map((h) => (
                    <div
                      key={`half-${h}`}
                      className="absolute left-0 right-0 border-t border-dashed border-gray-50"
                      style={{ top: (h - 8) * ROW_HEIGHT + ROW_HEIGHT / 2 }}
                    />
                  ))}

                  {/* Current-time red line (today only) */}
                  {now !== null && (
                    <div
                      className="absolute left-0 right-0 z-20 flex items-center"
                      style={{ top: now }}
                    >
                      <span className="h-2 w-2 -ml-1 rounded-full bg-red-500" />
                      <span className="flex-1 border-t-2 border-red-500" />
                    </div>
                  )}

                  {/* Appointment blocks */}
                  {(byEmployee.get(emp.id) ?? []).map((apt) => {
                    const { top, height } = blockPosition(apt);
                    const empColor =
                      apt.color ??
                      MOCK_EMPLOYEES.find((e) => e.id === apt.employee_id)
                        ?.color ??
                      "#6b7280";
                    const isCompact = height < 52;

                    return (
                      <div
                        key={apt.id}
                        className="absolute left-1 right-1 z-10 cursor-pointer overflow-hidden rounded-lg border shadow-sm transition-shadow hover:shadow-md"
                        style={{
                          top,
                          height,
                          backgroundColor: `${empColor}15`,
                          borderColor: `${empColor}40`,
                        }}
                        title={`${apt.client_name} - ${apt.service_name}\n${formatTimeShort(apt.start_time)} (${getDurationMinutes(apt)} min)\n${statusLabel(apt.status)}`}
                      >
                        <div
                          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
                          style={{ backgroundColor: empColor }}
                        />
                        <div className="pl-3 pr-2 py-1">
                          {isCompact ? (
                            /* Compact: single line for small blocks */
                            <p className="truncate text-xs font-medium text-gray-800">
                              {apt.client_name} &middot; {apt.service_name}
                            </p>
                          ) : (
                            /* Full layout */
                            <>
                              <p className="truncate text-xs font-semibold text-gray-900">
                                {apt.client_name}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-gray-600">
                                {apt.service_name}
                              </p>
                              <div className="mt-1 flex items-center gap-2">
                                <span className="text-[10px] font-medium text-gray-500">
                                  {formatTimeShort(apt.start_time)}
                                  {" - "}
                                  {apt.end_time
                                    ? formatTimeShort(apt.end_time)
                                    : ""}
                                </span>
                                <span
                                  className={`inline-block rounded-full px-1.5 py-0 text-[10px] font-medium leading-4 ${statusStyle(apt.status)}`}
                                >
                                  {statusLabel(apt.status)}
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
            ))}
          </div>
        </div>
      </div>

      {/* ── Legend / footer ─────────────────────────────── */}
      <div className="shrink-0 mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-500">
        <span className="font-medium text-gray-700">Legenda:</span>
        {[
          { label: "Finalizat", cls: "bg-green-100 text-green-700" },
          { label: "In desfasurare", cls: "bg-blue-100 text-blue-700" },
          { label: "Confirmat", cls: "bg-emerald-100 text-emerald-700" },
          { label: "In asteptare", cls: "bg-yellow-100 text-yellow-700" },
        ].map((s) => (
          <span key={s.label} className="flex items-center gap-1">
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${s.cls}`}
            >
              {s.label}
            </span>
          </span>
        ))}
        <span className="ml-auto text-gray-400">
          Salon Elegance &middot; Februarie 2026
        </span>
      </div>
    </div>
  );
}
