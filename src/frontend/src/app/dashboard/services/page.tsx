"use client";

import { useState, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { services as servicesApi, serviceCategories as categoriesApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import { MOCK_SERVICES, MOCK_CATEGORIES } from "@/lib/mock-data";

// ============================================================
// Types
// ============================================================
interface ServiceData {
  id: number;
  business_id: number;
  category_id: number | null;
  name: string;
  description: string | null;
  duration_minutes: number;
  buffer_after_minutes: number;
  price: number;
  price_max: number | null;
  currency: string;
  vat_rate: number;
  color: string;
  is_active: boolean;
  is_public: boolean;
  sort_order: number;
}

interface CategoryData {
  id: number;
  name: string;
  sort_order: number;
}

// ============================================================
// Color palette for service creation
// ============================================================
const COLOR_OPTIONS = [
  "#2563eb", "#8b5cf6", "#ec4899", "#f59e0b", "#06b6d4",
  "#10b981", "#ef4444", "#6366f1", "#14b8a6", "#f97316",
  "#84cc16", "#a855f7",
];

// ============================================================
// Component
// ============================================================
export default function ServicesPage() {
  const activeBusiness = useAppStore((s) => s.activeBusiness);
  const businessId = activeBusiness?.id;

  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingService, setEditingService] = useState<ServiceData | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Data fetching
  const { data: servicesData, isUsingMockData, refetch: refetchServices } = useFetch(
    () => (businessId ? servicesApi.list(businessId) : Promise.resolve([])),
    MOCK_SERVICES,
    [businessId]
  );

  const { data: categoriesData, refetch: refetchCategories } = useFetch(
    () => (businessId ? categoriesApi.list(businessId) : Promise.resolve([])),
    MOCK_CATEGORIES,
    [businessId]
  );

  const servicesList: ServiceData[] = servicesData || [];
  const categories: CategoryData[] = categoriesData || [];

  // Filtering
  const filteredServices = useMemo(() => {
    if (activeCategory === null) return servicesList;
    return servicesList.filter((service) => service.category_id === activeCategory);
  }, [servicesList, activeCategory]);

  // Stats
  const activeServicesCount = servicesList.filter((s) => s.is_active).length;
  const avgPrice = servicesList.length > 0
    ? Math.round(servicesList.reduce((sum, s) => sum + s.price, 0) / servicesList.length)
    : 0;

  const handleEditService = (service: ServiceData) => {
    setEditingService(service);
    setShowServiceModal(true);
  };

  const handleToggleActive = async (service: ServiceData) => {
    if (!businessId) return;
    try {
      await servicesApi.update(businessId, service.id, { is_active: !service.is_active });
      refetchServices();
    } catch {
      // silently fail, user sees no change
    }
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Servicii</h1>
          <p className="text-sm text-gray-500">
            {servicesList.length} servicii in {categories.length} categorii &middot; {activeServicesCount} active
          </p>
          {isUsingMockData && (
            <p className="mt-1 text-[10px] text-amber-500 font-medium">
              Date demo &mdash; backend-ul nu este conectat
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            + Categorie
          </button>
          <button
            onClick={() => {
              setEditingService(null);
              setShowServiceModal(true);
            }}
            className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-light transition-colors"
          >
            + Serviciu nou
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs text-gray-500">Total servicii</p>
          <p className="mt-1 text-2xl font-bold text-brand-navy">{servicesList.length}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs text-gray-500">Servicii active</p>
          <p className="mt-1 text-2xl font-bold text-brand-green">{activeServicesCount}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs text-gray-500">Pret mediu</p>
          <p className="mt-1 text-2xl font-bold text-brand-blue">{avgPrice} RON</p>
        </div>
      </div>

      {/* Category filter + View toggle */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 flex-wrap">
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
          {categories.map((category) => {
            const categoryServiceCount = servicesList.filter((s) => s.category_id === category.id).length;
            return (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeCategory === category.id
                    ? "bg-brand-blue text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {category.name} ({categoryServiceCount})
              </button>
            );
          })}
        </div>
        <div className="flex gap-1 border rounded-lg p-0.5">
          <button
            onClick={() => setViewMode("grid")}
            className={`rounded-md px-2.5 py-1 text-xs ${viewMode === "grid" ? "bg-gray-100 text-gray-900" : "text-gray-400"}`}
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`rounded-md px-2.5 py-1 text-xs ${viewMode === "list" ? "bg-gray-100 text-gray-900" : "text-gray-400"}`}
          >
            Lista
          </button>
        </div>
      </div>

      {/* Services grid/list */}
      {viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredServices.map((service) => {
            const categoryName = categories.find((c) => c.id === service.category_id)?.name || "General";
            return (
              <div
                key={service.id}
                className={`rounded-xl border bg-white p-5 hover:shadow-md transition-shadow ${!service.is_active ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-white text-sm font-bold"
                    style={{ backgroundColor: service.color || "#2563eb" }}
                  >
                    {service.name.charAt(0)}
                  </div>
                  <div className="flex items-center gap-2">
                    {service.is_public && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                        Public
                      </span>
                    )}
                    <button
                      onClick={() => handleToggleActive(service)}
                      title={service.is_active ? "Dezactiveaza" : "Activeaza"}
                      className="cursor-pointer"
                    >
                      {service.is_active ? (
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 block" />
                      ) : (
                        <span className="h-2.5 w-2.5 rounded-full bg-gray-300 block" />
                      )}
                    </button>
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-gray-900">{service.name}</h3>
                {service.description && (
                  <p className="mt-1 text-xs text-gray-500 line-clamp-2">{service.description}</p>
                )}

                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <span className="text-lg font-bold text-brand-blue">{service.price}</span>
                    {service.price_max && (
                      <span className="text-sm text-gray-400"> - {service.price_max}</span>
                    )}
                    <span className="text-sm text-gray-400"> {service.currency || "RON"}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{service.duration_minutes} min</p>
                    {service.buffer_after_minutes > 0 && (
                      <p className="text-[10px] text-gray-400">+{service.buffer_after_minutes} min buffer</p>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t pt-3">
                  <span className="text-[10px] text-gray-400">
                    {categoryName} &middot; TVA {service.vat_rate}%
                  </span>
                  <button
                    onClick={() => handleEditService(service)}
                    className="rounded px-2 py-1 text-[10px] font-medium text-brand-blue hover:bg-blue-50 transition-colors"
                  >
                    Editeaza
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border bg-white overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Serviciu</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Categorie</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">Durata</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Pret</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">TVA</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">Actiuni</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredServices.map((service) => {
                const categoryName = categories.find((c) => c.id === service.category_id)?.name || "General";
                return (
                  <tr key={service.id} className={`hover:bg-gray-50 transition-colors ${!service.is_active ? "opacity-60" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: service.color }} />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{service.name}</p>
                          {service.description && <p className="text-xs text-gray-400 truncate max-w-[200px]">{service.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{categoryName}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">
                      {service.duration_minutes} min
                      {service.buffer_after_minutes > 0 && (
                        <span className="text-[10px] text-gray-400 block">+{service.buffer_after_minutes} buffer</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-semibold text-gray-900">{service.price}</span>
                      {service.price_max && <span className="text-xs text-gray-400"> - {service.price_max}</span>}
                      <span className="text-xs text-gray-400"> RON</span>
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-gray-500">{service.vat_rate}%</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleToggleActive(service)}>
                        {service.is_active ? (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">Activ</span>
                        ) : (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">Inactiv</span>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleEditService(service)} className="rounded px-2 py-1 text-xs text-brand-blue font-medium hover:bg-blue-50">
                        Editeaza
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Service Modal */}
      {showServiceModal && (
        <ServiceModal
          businessId={businessId!}
          categories={categories}
          editingService={editingService}
          onClose={() => {
            setShowServiceModal(false);
            setEditingService(null);
          }}
          onSaved={() => {
            setShowServiceModal(false);
            setEditingService(null);
            refetchServices();
          }}
        />
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <CategoryModal
          businessId={businessId!}
          onClose={() => setShowCategoryModal(false)}
          onSaved={() => {
            setShowCategoryModal(false);
            refetchCategories();
          }}
        />
      )}
    </div>
  );
}

// ============================================================
// Service Modal (Create/Edit)
// ============================================================
function ServiceModal({
  businessId,
  categories,
  editingService,
  onClose,
  onSaved,
}: {
  businessId: number;
  categories: CategoryData[];
  editingService: ServiceData | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEditing = editingService !== null;

  const [name, setName] = useState(editingService?.name || "");
  const [description, setDescription] = useState(editingService?.description || "");
  const [categoryId, setCategoryId] = useState<number | string>(editingService?.category_id || "");
  const [durationMinutes, setDurationMinutes] = useState(String(editingService?.duration_minutes || 60));
  const [bufferAfterMinutes, setBufferAfterMinutes] = useState(String(editingService?.buffer_after_minutes || 0));
  const [price, setPrice] = useState(String(editingService?.price || ""));
  const [priceMax, setPriceMax] = useState(editingService?.price_max ? String(editingService.price_max) : "");
  const [vatRate, setVatRate] = useState(String(editingService?.vat_rate ?? 19));
  const [color, setColor] = useState(editingService?.color || "#2563eb");
  const [isPublic, setIsPublic] = useState(editingService?.is_public ?? true);
  const [isActive, setIsActive] = useState(editingService?.is_active ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim() || !price) {
      setErrorMessage("Numele si pretul sunt obligatorii");
      return;
    }

    setErrorMessage(null);
    setSubmitting(true);

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      category_id: categoryId ? Number(categoryId) : null,
      duration_minutes: Number(durationMinutes),
      buffer_after_minutes: Number(bufferAfterMinutes),
      price: parseFloat(price),
      price_max: priceMax ? parseFloat(priceMax) : null,
      vat_rate: parseFloat(vatRate),
      color,
      is_public: isPublic,
      is_active: isActive,
    };

    try {
      if (isEditing) {
        await servicesApi.update(businessId, editingService!.id, payload);
      } else {
        await servicesApi.create(businessId, payload);
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
          <h3 className="text-lg font-bold text-gray-900">{isEditing ? "Editeaza serviciu" : "Serviciu nou"}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg></button>
        </div>

        <div className="p-6 space-y-4">
          {errorMessage && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nume serviciu *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue" placeholder="ex: Tuns dama" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descriere</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue" rows={2} placeholder="Descriere scurta a serviciului" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categorie</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue">
              <option value="">Fara categorie</option>
              {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Durata (minute) *</label>
              <input type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue" min={5} step={5} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Buffer dupa (min)</label>
              <input type="number" value={bufferAfterMinutes} onChange={(e) => setBufferAfterMinutes(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue" min={0} step={5} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pret (RON) *</label>
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue" min={0} step={0.01} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pret max</label>
              <input type="number" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue" min={0} step={0.01} placeholder="Optional" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">TVA (%)</label>
              <select value={vatRate} onChange={(e) => setVatRate(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue">
                <option value="19">19%</option>
                <option value="9">9%</option>
                <option value="5">5%</option>
                <option value="0">0%</option>
              </select>
            </div>
          </div>

          {/* Color picker */}
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

          {/* Toggles */}
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="rounded border-gray-300 text-brand-blue focus:ring-brand-blue" />
              <span className="text-sm text-gray-700">Vizibil public</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded border-gray-300 text-brand-blue focus:ring-brand-blue" />
              <span className="text-sm text-gray-700">Activ</span>
            </label>
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t bg-gray-50 px-6 py-4 rounded-b-2xl">
          <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">Anuleaza</button>
          <button onClick={handleSubmit} disabled={submitting} className="rounded-lg bg-brand-blue px-6 py-2 text-sm font-medium text-white hover:bg-brand-blue-light disabled:opacity-50 transition-colors">
            {submitting ? "Se salveaza..." : isEditing ? "Actualizeaza" : "Creeaza serviciu"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Category Modal
// ============================================================
function CategoryModal({
  businessId,
  onClose,
  onSaved,
}: {
  businessId: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setErrorMessage("Numele categoriei este obligatoriu");
      return;
    }
    setErrorMessage(null);
    setSubmitting(true);
    try {
      await categoriesApi.create(businessId, { name: name.trim() });
      onSaved();
    } catch (caughtError: any) {
      setErrorMessage(caughtError.message || "Eroare la creare");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl" onClick={(clickEvent) => clickEvent.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-lg font-bold text-gray-900">Categorie noua</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg></button>
        </div>
        <div className="p-6 space-y-4">
          {errorMessage && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nume categorie *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue" placeholder="ex: Coafura" autoFocus onKeyDown={(keyEvent) => keyEvent.key === "Enter" && handleSubmit()} />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
          <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">Anuleaza</button>
          <button onClick={handleSubmit} disabled={submitting} className="rounded-lg bg-brand-blue px-6 py-2 text-sm font-medium text-white hover:bg-brand-blue-light disabled:opacity-50">
            {submitting ? "Se salveaza..." : "Creeaza"}
          </button>
        </div>
      </div>
    </div>
  );
}
