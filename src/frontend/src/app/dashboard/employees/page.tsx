"use client";

import { useAppStore } from "@/lib/store";
import { employees as employeesApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import { MOCK_EMPLOYEES } from "@/lib/mock-data";

const dayLabels: Record<string, string> = {
  mon: "Luni",
  tue: "Marti",
  wed: "Miercuri",
  thu: "Joi",
  fri: "Vineri",
  sat: "Sambata",
  sun: "Duminica",
};

export default function EmployeesPage() {
  const activeBusiness = useAppStore((s) => s.activeBusiness);
  const businessId = activeBusiness?.id;

  const { data: employeesData, isUsingMockData } = useFetch(
    () => (businessId ? employeesApi.list(businessId) : Promise.resolve([])),
    MOCK_EMPLOYEES,
    [businessId]
  );

  const employeesList = employeesData || [];

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Echipa</h1>
          <p className="text-sm text-gray-500">
            {employeesList.length} membri &middot;{" "}
            {employeesList.filter((e: any) => e.is_active !== false).length} activi
          </p>
          {isUsingMockData && (
            <p className="mt-1 text-[10px] text-amber-500 font-medium">
              Date demo — backend-ul nu este conectat
            </p>
          )}
        </div>
        <button className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-light">
          + Angajat nou
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {employeesList.map((emp: any) => (
          <div key={emp.id} className="rounded-xl border bg-white overflow-hidden">
            {/* Header with color */}
            <div className="h-2" style={{ backgroundColor: emp.color || "#2563eb" }} />
            <div className="p-5">
              <div className="flex items-center gap-4 mb-4">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold text-white"
                  style={{ backgroundColor: emp.color || "#2563eb" }}
                >
                  {emp.full_name.split(" ").map((n: string) => n[0]).join("")}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{emp.full_name}</h3>
                  <p className="text-sm text-gray-500">{emp.display_name || ""}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                      {emp.role === "manager" ? "Manager" : "Specialist"}
                    </span>
                    {emp.commission_type === "percent" && (
                      <span className="text-[10px] text-gray-400">
                        Comision: {emp.commission_value}%
                      </span>
                    )}
                    {emp.commission_type === "fixed" && (
                      <span className="text-[10px] text-gray-400">
                        Fix: {emp.commission_value?.toLocaleString("ro-RO")} RON
                      </span>
                    )}
                  </div>
                </div>
                <span className={`h-3 w-3 rounded-full ${emp.is_active !== false ? "bg-emerald-500" : "bg-gray-300"}`} />
              </div>

              {/* Contact */}
              <div className="mb-4 flex gap-4 text-xs text-gray-500">
                {emp.phone && <span>{emp.phone}</span>}
                {emp.email && <span>{emp.email}</span>}
              </div>

              {/* Schedule */}
              {emp.weekly_schedule && (
                <div className="mb-4">
                  <p className="mb-2 text-xs font-semibold text-gray-700">Program saptamanal</p>
                  <div className="grid grid-cols-7 gap-1">
                    {(["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const).map((day) => {
                      const intervals = emp.weekly_schedule[day] || [];
                      const hasSchedule = intervals.length > 0;
                      return (
                        <div
                          key={day}
                          className={`rounded-lg p-2 text-center ${hasSchedule ? "bg-blue-50" : "bg-gray-50"}`}
                        >
                          <p className="text-[10px] font-medium text-gray-500">
                            {dayLabels[day]?.slice(0, 2)}
                          </p>
                          {hasSchedule ? (
                            intervals.map((iv: any, i: number) => (
                              <p key={i} className="text-[9px] text-brand-blue font-medium mt-0.5">
                                {iv.start}-{iv.end}
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
                <button className="flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
                  Editeaza
                </button>
                <button className="flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
                  Asigneaza servicii
                </button>
                <button className="flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
                  Program special
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
