"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { services as servicesApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import { MOCK_SERVICES, MOCK_CATEGORIES } from "@/lib/mock-data";

export default function ServicesPage() {
  const activeBusiness = useAppStore((s) => s.activeBusiness);
  const businessId = activeBusiness?.id;

  const { data: servicesData, isUsingMockData } = useFetch(
    () => (businessId ? servicesApi.list(businessId) : Promise.resolve([])),
    MOCK_SERVICES,
    [businessId]
  );

  const servicesList = servicesData || [];

  // Extract categories from services data or use mock
  const categories = isUsingMockData
    ? MOCK_CATEGORIES
    : Array.from(
        new Map(
          servicesList
            .filter((s: any) => s.category_id && s.category_name)
            .map((s: any) => [s.category_id, { id: s.category_id, name: s.category_name }])
        ).values()
      );

  const [activeCategory, setActiveCategory] = useState<number | null>(null);

  const filtered = activeCategory
    ? servicesList.filter((s: any) => s.category_id === activeCategory)
    : servicesList;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Servicii</h1>
          <p className="text-sm text-gray-500">
            {servicesList.length} servicii in {categories.length} categorii
          </p>
          {isUsingMockData && (
            <p className="mt-1 text-[10px] text-amber-500 font-medium">
              Date demo — backend-ul nu este conectat
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            + Categorie
          </button>
          <button className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-light">
            + Serviciu nou
          </button>
        </div>
      </div>

      {/* Category filter */}
      <div className="mb-6 flex gap-2 flex-wrap">
        <button
          onClick={() => setActiveCategory(null)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            activeCategory === null
              ? "bg-brand-blue text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Toate ({servicesList.length})
        </button>
        {categories.map((cat: any) => {
          const count = servicesList.filter((s: any) => s.category_id === cat.id).length;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeCategory === cat.id
                  ? "bg-brand-blue text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Services grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((svc: any) => {
          const cat = categories.find((c: any) => c.id === svc.category_id);
          return (
            <div
              key={svc.id}
              className="rounded-xl border bg-white p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-white text-sm font-bold"
                  style={{ backgroundColor: svc.color || "#2563eb" }}
                >
                  {svc.name.charAt(0)}
                </div>
                <div className="flex items-center gap-2">
                  {svc.is_public && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                      Public
                    </span>
                  )}
                  {svc.is_active !== false ? (
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-gray-300" />
                  )}
                </div>
              </div>

              <h3 className="text-sm font-semibold text-gray-900">{svc.name}</h3>
              {svc.description && (
                <p className="mt-1 text-xs text-gray-500 line-clamp-2">{svc.description}</p>
              )}

              <div className="mt-4 flex items-center justify-between">
                <div>
                  <span className="text-lg font-bold text-brand-blue">{svc.price}</span>
                  {svc.price_max && (
                    <span className="text-sm text-gray-400"> - {svc.price_max}</span>
                  )}
                  <span className="text-sm text-gray-400"> {svc.currency || "RON"}</span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">{svc.duration_minutes} min</p>
                  {(svc.buffer_after_minutes || 0) > 0 && (
                    <p className="text-[10px] text-gray-400">+{svc.buffer_after_minutes} min buffer</p>
                  )}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t pt-3">
                <span className="text-[10px] text-gray-400">
                  {(cat as any)?.name || "General"} &middot; TVA {svc.vat_rate || 19}%
                </span>
                <div className="flex gap-1">
                  <button className="rounded px-2 py-1 text-[10px] text-gray-500 hover:bg-gray-100">
                    Editeaza
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
