"use client";

import { useState, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { employees as employeesApi, services as servicesApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import { MOCK_EMPLOYEES, MOCK_SERVICES } from "@/lib/mock-data";
import { X } from "lucide-react";

// ============================================================
// Types
// ============================================================
interface EmployeeData {
  id: number;
  business_id: number;
  user_id: number | null;
  full_name: string;
  display_name: string | null;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string;
  color: string;
  weekly_schedule: Record<string, { start: string; end: string }[]> | null;
  commission_type: string;
  commission_value: number | null;
  is_active: boolean;
  sort_order: number;
}

interface ServiceData {
  id: number;
  name: string;
  duration_minutes: number;
  price: number;
}

// ============================================================
// Constants
// ============================================================
const WEEK_DAYS = [
  { key: "mon", label: "Luni" },
  { key: "tue", label: "Marti" },
  { key: "wed", label: "Miercuri" },
  { key: "thu", label: "Joi" },
  { key: "fri", label: "Vineri" },
  { key: "sat", label: "Sambata" },
  { key: "sun", label: "Duminica" },
] as const;

const COLOR_OPTIONS = [
  "#8b5cf6", "#ec4899", "#f59e0b", "#06b6d4", "#2563eb",
  "#10b981", "#ef4444", "#6366f1", "#14b8a6", "#f97316",
  "#84cc16", "#a855f7",
];

// ============================================================
// Component
// ============================================================
export default function EmployeesPage() {
  const activeBusiness = useAppStore((s) => s.activeBusiness);
  const businessId = activeBusiness?.id;

  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeData | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleEmployee, setScheduleEmployee] = useState<EmployeeData | null>(null);
  const [showServiceAssignModal, setShowServiceAssignModal] = useState(false);
  const [assignEmployee, setAssignEmployee] = useState<EmployeeData | null>(null);

  // Data fetching
  const { data: employeesData, isUsingMockData, refetch: refetchEmployees } = useFetch(
    () => (businessId ? employeesApi.list(businessId) : Promise.resolve([])),
    MOCK_EMPLOYEES,
    [businessId]
  );

  const { data: servicesData } = useFetch(
    () => (businessId ? servicesApi.list(businessId) : Promise.resolve([])),
    MOCK_SERVICES,
    [businessId]
  );

  const employeesList: EmployeeData[] = employeesData || [];
  const servicesList: ServiceData[] = servicesData || [];

  const activeCount = employeesList.filter((e) => e.is_active).length;

  const handleEditEmployee = (employee: EmployeeData) => {
    setEditingEmployee(employee);
    setShowEmployeeModal(true);
  };

  const handleToggleActive = async (employee: EmployeeData) => {
    if (!businessId) return;
    try {
      await employeesApi.update(businessId, employee.id, { is_active: !employee.is_active });
      refetchEmployees();
    } catch {
      // silently fail
    }
  };

  const handleOpenSchedule = (employee: EmployeeData) => {
    setScheduleEmployee(employee);
    setShowScheduleModal(true);
  };

  const handleOpenServiceAssign = (employee: EmployeeData) => {
    setAssignEmployee(employee);
    setShowServiceAssignModal(true);
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Echipa</h1>
          <p className="text-sm text-gray-500">
            {employeesList.length} membri &middot; {activeCount} activi
          </p>
          {isUsingMockData && (
            <p className="mt-1 text-[10px] text-amber-500 font-medium">
              Date demo &mdash; backend-ul nu este conectat
            </p>
          )}
        </div>
        <button
          onClick={() => {
            setEditingEmployee(null);
            setShowEmployeeModal(true);
          }}
          className="rounded-lg bg-brand-blue px-4 py-2 min-h-[44px] text-sm font-medium text-white hover:bg-brand-blue-light transition-colors"
        >
          + Angajat nou
        </button>
      </div>

      {/* Employee grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {employeesList.map((employee) => (
          <div key={employee.id} className={`rounded-xl border bg-white overflow-hidden ${!employee.is_active ? "opacity-60" : ""}`}>
            {/* Color bar */}
            <div className="h-2" style={{ backgroundColor: employee.color || "#2563eb" }} />
            <div className="p-5">
              {/* Header */}
              <div className="flex items-center gap-4 mb-4">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold text-white shrink-0"
                  style={{ backgroundColor: employee.color || "#2563eb" }}
                >
                  {employee.full_name.split(" ").map((namePart: string) => namePart[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">{employee.full_name}</h3>
                  <p className="text-sm text-gray-500 truncate">{employee.display_name || ""}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                      {employee.role === "manager" ? "Manager" : "Specialist"}
                    </span>
                    {employee.commission_type === "percent" && employee.commission_value && (
                      <span className="text-[10px] text-gray-400">Comision: {employee.commission_value}%</span>
                    )}
                    {employee.commission_type === "fixed" && employee.commission_value && (
                      <span className="text-[10px] text-gray-400">Fix: {employee.commission_value?.toLocaleString("ro-RO")} RON</span>
                    )}
                  </div>
                </div>
                <button onClick={() => handleToggleActive(employee)} title={employee.is_active ? "Dezactiveaza" : "Activeaza"}>
                  <span className={`h-3 w-3 rounded-full block ${employee.is_active ? "bg-emerald-500" : "bg-gray-300"}`} />
                </button>
              </div>

              {/* Contact */}
              <div className="mb-4 flex gap-4 text-xs text-gray-500">
                {employee.phone && <span>{employee.phone}</span>}
                {employee.email && <span>{employee.email}</span>}
              </div>

              {/* Schedule preview */}
              {employee.weekly_schedule && (
                <div className="mb-4">
                  <p className="mb-2 text-xs font-semibold text-gray-700">Program saptamanal</p>
                  <div className="grid grid-cols-7 gap-1">
                    {WEEK_DAYS.map(({ key, label }) => {
                      const intervals = employee.weekly_schedule?.[key] || [];
                      const hasSchedule = intervals.length > 0;
                      return (
                        <div key={key} className={`rounded-lg p-2 text-center ${hasSchedule ? "bg-blue-50" : "bg-gray-50"}`}>
                          <p className="text-[10px] font-medium text-gray-500">{label.slice(0, 2)}</p>
                          {hasSchedule ? (
                            intervals.map((interval: any, intervalIndex: number) => (
                              <p key={intervalIndex} className="text-[9px] text-brand-blue font-medium mt-0.5">
                                {interval.start}-{interval.end}
                              </p>
                            ))
                          ) : (
                            <p className="text-[9px] text-gray-300 mt-0.5">Liber</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 border-t pt-3">
                <button
                  onClick={() => handleEditEmployee(employee)}
                  className="flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Editeaza
                </button>
                <button
                  onClick={() => handleOpenServiceAssign(employee)}
                  className="flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Asigneaza servicii
                </button>
                <button
                  onClick={() => handleOpenSchedule(employee)}
                  className="flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Program
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Employee Create/Edit Modal */}
      {showEmployeeModal && (
        <EmployeeModal
          businessId={businessId!}
          editingEmployee={editingEmployee}
          onClose={() => {
            setShowEmployeeModal(false);
            setEditingEmployee(null);
          }}
          onSaved={() => {
            setShowEmployeeModal(false);
            setEditingEmployee(null);
            refetchEmployees();
          }}
        />
      )}

      {/* Schedule Editor Modal */}
      {showScheduleModal && scheduleEmployee && (
        <ScheduleEditorModal
          businessId={businessId!}
          employee={scheduleEmployee}
          onClose={() => {
            setShowScheduleModal(false);
            setScheduleEmployee(null);
          }}
          onSaved={() => {
            setShowScheduleModal(false);
            setScheduleEmployee(null);
            refetchEmployees();
          }}
        />
      )}

      {/* Service Assignment Modal */}
      {showServiceAssignModal && assignEmployee && (
        <ServiceAssignModal
          businessId={businessId!}
          employee={assignEmployee}
          servicesList={servicesList}
          onClose={() => {
            setShowServiceAssignModal(false);
            setAssignEmployee(null);
          }}
          onSaved={() => {
            setShowServiceAssignModal(false);
            setAssignEmployee(null);
          }}
        />
      )}
    </div>
  );
}

// ============================================================
// Employee Create/Edit Modal
// ============================================================
function EmployeeModal({
  businessId,
  editingEmployee,
  onClose,
  onSaved,
}: {
  businessId: number;
  editingEmployee: EmployeeData | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEditing = editingEmployee !== null;

  const [fullName, setFullName] = useState(editingEmployee?.full_name || "");
  const [displayName, setDisplayName] = useState(editingEmployee?.display_name || "");
  const [phone, setPhone] = useState(editingEmployee?.phone || "");
  const [email, setEmail] = useState(editingEmployee?.email || "");
  const [role, setRole] = useState(editingEmployee?.role || "specialist");
  const [color, setColor] = useState(editingEmployee?.color || COLOR_OPTIONS[0]);
  const [commissionType, setCommissionType] = useState(editingEmployee?.commission_type || "none");
  const [commissionValue, setCommissionValue] = useState(editingEmployee?.commission_value ? String(editingEmployee.commission_value) : "");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!fullName.trim()) {
      setErrorMessage("Numele complet este obligatoriu");
      return;
    }
    setErrorMessage(null);
    setSubmitting(true);

    const payload: any = {
      full_name: fullName.trim(),
      display_name: displayName.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      role,
      color,
      commission_type: commissionType,
      commission_value: commissionValue ? parseFloat(commissionValue) : null,
    };

    try {
      if (isEditing) {
        await employeesApi.update(businessId, editingEmployee!.id, payload);
      } else {
        // Default schedule for new employees
        payload.weekly_schedule = {
          mon: [{ start: "09:00", end: "18:00" }],
          tue: [{ start: "09:00", end: "18:00" }],
          wed: [{ start: "09:00", end: "18:00" }],
          thu: [{ start: "09:00", end: "18:00" }],
          fri: [{ start: "09:00", end: "18:00" }],
          sat: [],
          sun: [],
        };
        await employeesApi.create(businessId, payload);
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
          <h3 className="text-lg font-bold text-gray-900">{isEditing ? "Editeaza angajat" : "Angajat nou"}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          {errorMessage && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nume complet *</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue" placeholder="ex: Ana Popescu" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nume de afisat</label>
            <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue" placeholder="ex: Ana P." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue" placeholder="+40722..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue" placeholder="ana@salon.ro" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue">
              <option value="specialist">Specialist</option>
              <option value="manager">Manager</option>
            </select>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Culoare</label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_OPTIONS.map((colorOption) => (
                <button
                  key={colorOption}
                  onClick={() => setColor(colorOption)}
                  className={`h-8 w-8 rounded-full border-2 transition-transform ${color === colorOption ? "border-gray-800 scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: colorOption }}
                />
              ))}
            </div>
          </div>

          {/* Commission */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tip comision</label>
              <select value={commissionType} onChange={(e) => setCommissionType(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue">
                <option value="none">Fara comision</option>
                <option value="percent">Procentual</option>
                <option value="fixed">Fix (RON)</option>
              </select>
            </div>
            {commissionType !== "none" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valoare {commissionType === "percent" ? "(%)" : "(RON)"}
                </label>
                <input
                  type="number"
                  value={commissionValue}
                  onChange={(e) => setCommissionValue(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  min={0}
                  step={commissionType === "percent" ? 1 : 100}
                />
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t bg-gray-50 px-6 py-4 rounded-b-2xl">
          <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">Anuleaza</button>
          <button onClick={handleSubmit} disabled={submitting} className="rounded-lg bg-brand-blue px-6 py-2 text-sm font-medium text-white hover:bg-brand-blue-light disabled:opacity-50">
            {submitting ? "Se salveaza..." : isEditing ? "Actualizeaza" : "Adauga angajat"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Schedule Editor Modal
// ============================================================
function ScheduleEditorModal({
  businessId,
  employee,
  onClose,
  onSaved,
}: {
  businessId: number;
  employee: EmployeeData;
  onClose: () => void;
  onSaved: () => void;
}) {
  const initialSchedule = employee.weekly_schedule || {};
  const [schedule, setSchedule] = useState<Record<string, { start: string; end: string }[]>>(() => {
    const defaultSchedule: Record<string, { start: string; end: string }[]> = {};
    WEEK_DAYS.forEach(({ key }) => {
      defaultSchedule[key] = initialSchedule[key] ? [...initialSchedule[key]] : [];
    });
    return defaultSchedule;
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const toggleDayOff = (dayKey: string) => {
    setSchedule((prevSchedule) => {
      const updated = { ...prevSchedule };
      if (updated[dayKey].length > 0) {
        updated[dayKey] = [];
      } else {
        updated[dayKey] = [{ start: "09:00", end: "18:00" }];
      }
      return updated;
    });
  };

  const updateInterval = (dayKey: string, intervalIndex: number, field: "start" | "end", value: string) => {
    setSchedule((prevSchedule) => {
      const updated = { ...prevSchedule };
      updated[dayKey] = [...updated[dayKey]];
      updated[dayKey][intervalIndex] = { ...updated[dayKey][intervalIndex], [field]: value };
      return updated;
    });
  };

  const addInterval = (dayKey: string) => {
    setSchedule((prevSchedule) => {
      const updated = { ...prevSchedule };
      updated[dayKey] = [...updated[dayKey], { start: "14:00", end: "18:00" }];
      return updated;
    });
  };

  const removeInterval = (dayKey: string, intervalIndex: number) => {
    setSchedule((prevSchedule) => {
      const updated = { ...prevSchedule };
      updated[dayKey] = updated[dayKey].filter((_, currentIndex) => currentIndex !== intervalIndex);
      return updated;
    });
  };

  const handleSave = async () => {
    setErrorMessage(null);
    setSubmitting(true);
    try {
      await employeesApi.update(businessId, employee.id, { weekly_schedule: schedule });
      onSaved();
    } catch (caughtError: any) {
      setErrorMessage(caughtError.message || "Eroare la salvare");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl" onClick={(clickEvent) => clickEvent.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4 rounded-t-2xl">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Program saptamanal</h3>
            <p className="text-sm text-gray-500">{employee.full_name}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-6 space-y-3">
          {errorMessage && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>}

          {WEEK_DAYS.map(({ key, label }) => {
            const intervals = schedule[key] || [];
            const isDayOff = intervals.length === 0;

            return (
              <div key={key} className={`rounded-lg border p-4 ${isDayOff ? "bg-gray-50 border-gray-200" : "bg-white"}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">{label}</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs text-gray-500">{isDayOff ? "Liber" : "Lucreaza"}</span>
                    <button
                      onClick={() => toggleDayOff(key)}
                      className={`relative h-5 w-9 rounded-full transition-colors ${isDayOff ? "bg-gray-300" : "bg-brand-blue"}`}
                    >
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform shadow-sm ${isDayOff ? "left-0.5" : "left-4"}`} />
                    </button>
                  </label>
                </div>

                {!isDayOff && (
                  <div className="space-y-2">
                    {intervals.map((interval, intervalIndex) => (
                      <div key={intervalIndex} className="flex items-center gap-2">
                        <input
                          type="time"
                          value={interval.start}
                          onChange={(changeEvent) => updateInterval(key, intervalIndex, "start", changeEvent.target.value)}
                          className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
                        />
                        <span className="text-xs text-gray-400">-</span>
                        <input
                          type="time"
                          value={interval.end}
                          onChange={(changeEvent) => updateInterval(key, intervalIndex, "end", changeEvent.target.value)}
                          className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
                        />
                        {intervals.length > 1 && (
                          <button onClick={() => removeInterval(key, intervalIndex)} className="text-red-400 hover:text-red-600 text-xs">
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button onClick={() => addInterval(key)} className="text-xs text-brand-blue font-medium hover:underline">
                      + Adauga pauza / interval
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t bg-gray-50 px-6 py-4 rounded-b-2xl">
          <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">Anuleaza</button>
          <button onClick={handleSave} disabled={submitting} className="rounded-lg bg-brand-blue px-6 py-2 text-sm font-medium text-white hover:bg-brand-blue-light disabled:opacity-50">
            {submitting ? "Se salveaza..." : "Salveaza program"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Service Assignment Modal
// ============================================================
function ServiceAssignModal({
  businessId,
  employee,
  servicesList,
  onClose,
  onSaved,
}: {
  businessId: number;
  employee: EmployeeData;
  servicesList: ServiceData[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [assigningServiceId, setAssigningServiceId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleAssignService = async (serviceId: number) => {
    setAssigningServiceId(serviceId);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await employeesApi.assignService(businessId, employee.id, { service_id: serviceId });
      setSuccessMessage("Serviciu asignat cu succes!");
    } catch (caughtError: any) {
      setErrorMessage(caughtError.message || "Eroare la asignare");
    } finally {
      setAssigningServiceId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="relative w-full max-w-md max-h-[80vh] overflow-y-auto rounded-2xl bg-white shadow-2xl" onClick={(clickEvent) => clickEvent.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4 rounded-t-2xl">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Asigneaza servicii</h3>
            <p className="text-sm text-gray-500">{employee.full_name}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-6 space-y-2">
          {errorMessage && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-3">{errorMessage}</div>}
          {successMessage && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 mb-3">{successMessage}</div>}

          {servicesList.map((service) => (
            <div key={service.id} className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50 transition-colors">
              <div>
                <p className="text-sm font-medium text-gray-900">{service.name}</p>
                <p className="text-xs text-gray-400">{service.duration_minutes} min &middot; {service.price} RON</p>
              </div>
              <button
                onClick={() => handleAssignService(service.id)}
                disabled={assigningServiceId === service.id}
                className="rounded-lg bg-brand-blue/10 px-3 py-1.5 text-xs font-medium text-brand-blue hover:bg-brand-blue/20 disabled:opacity-50 transition-colors"
              >
                {assigningServiceId === service.id ? "..." : "Asigneaza"}
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end border-t px-6 py-4">
          <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">Inchide</button>
        </div>
      </div>
    </div>
  );
}
