"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Scissors,
  Stethoscope,
  Brain,
  Dumbbell,
  Hand,
  GraduationCap,
  HeartPulse,
  MoreHorizontal,
  ChevronRight,
  ChevronLeft,
  Building2,
  Check,
} from "lucide-react";
import { businesses } from "@/lib/api";
import { useAppStore } from "@/lib/store";

/* ── Verticals ── */
const VERTICALS = [
  { value: "salon", label: "Salon", icon: Scissors, description: "Coafura, manichiura, cosmetica" },
  { value: "dental", label: "Dental", icon: Stethoscope, description: "Cabinet stomatologic" },
  { value: "therapy", label: "Terapie", icon: Brain, description: "Psihologie, kinetoterapie" },
  { value: "fitness", label: "Fitness", icon: Dumbbell, description: "Sala, antrenor personal" },
  { value: "massage", label: "Masaj", icon: Hand, description: "Salon de masaj, spa" },
  { value: "tutor", label: "Meditatii", icon: GraduationCap, description: "Cursuri, tutoring" },
  { value: "medical", label: "Medical", icon: HeartPulse, description: "Cabinet medical, clinica" },
  { value: "other", label: "Altele", icon: MoreHorizontal, description: "Alt tip de afacere" },
] as const;

const STEPS = ["Tip afacere", "Informatii firma", "Contact", "Confirmare"];

interface FormData {
  vertical: string;
  name: string;
  cui: string;
  reg_com: string;
  address: string;
  city: string;
  county: string;
  postal_code: string;
  phone: string;
  email: string;
  website: string;
}

const INITIAL_FORM: FormData = {
  vertical: "",
  name: "",
  cui: "",
  reg_com: "",
  address: "",
  city: "",
  county: "",
  postal_code: "",
  phone: "",
  email: "",
  website: "",
};

export default function OnboardingPage() {
  const router = useRouter();
  const setActiveBusiness = useAppStore((s) => s.setActiveBusiness);

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const canGoNext = () => {
    if (currentStep === 0) return formData.vertical !== "";
    if (currentStep === 1) return formData.name.trim().length >= 2;
    return true;
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      const payload: Record<string, string | undefined> = {
        name: formData.name.trim(),
        vertical: formData.vertical,
      };
      if (formData.cui) payload.cui = formData.cui;
      if (formData.reg_com) payload.reg_com = formData.reg_com;
      if (formData.address) payload.address = formData.address;
      if (formData.city) payload.city = formData.city;
      if (formData.county) payload.county = formData.county;
      if (formData.postal_code) payload.postal_code = formData.postal_code;
      if (formData.phone) payload.phone = formData.phone;
      if (formData.email) payload.email = formData.email;
      if (formData.website) payload.website = formData.website;

      const createdBusiness = await businesses.create(payload);
      setActiveBusiness({
        id: createdBusiness.id,
        name: createdBusiness.name,
        slug: createdBusiness.slug,
        vertical: createdBusiness.vertical,
      });
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Eroare la crearea afacerii");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-navy to-slate-900 p-4">
      <div className="w-full max-w-2xl">
        {/* ── Progress bar ── */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {STEPS.map((stepLabel, index) => (
            <div key={stepLabel} className="flex items-center gap-2">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors ${
                    index < currentStep
                      ? "border-green-500 bg-green-500 text-white"
                      : index === currentStep
                      ? "border-brand-blue bg-brand-blue text-white"
                      : "border-white/20 bg-white/5 text-gray-500"
                  }`}
                >
                  {index < currentStep ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                <span
                  className={`mt-1 text-[10px] ${
                    index <= currentStep ? "text-white" : "text-gray-600"
                  }`}
                >
                  {stepLabel}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`h-0.5 w-12 rounded transition-colors ${
                    index < currentStep ? "bg-green-500" : "bg-white/10"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* ── Card ── */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
          {/* Step 0: Vertical selection */}
          {currentStep === 0 && (
            <div>
              <h2 className="mb-2 text-2xl font-bold text-white">Ce tip de afacere ai?</h2>
              <p className="mb-6 text-sm text-gray-400">
                Selecteaza domeniul de activitate. Vom configura platforma pentru nevoile tale.
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {VERTICALS.map(({ value, label, icon: Icon, description }) => (
                  <button
                    key={value}
                    onClick={() => updateField("vertical", value)}
                    className={`group flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all ${
                      formData.vertical === value
                        ? "border-brand-blue bg-brand-blue/10 text-white"
                        : "border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    <Icon
                      className={`h-8 w-8 ${
                        formData.vertical === value
                          ? "text-brand-blue"
                          : "text-gray-500 group-hover:text-gray-300"
                      }`}
                    />
                    <span className="text-sm font-semibold">{label}</span>
                    <span className="text-[10px] text-gray-500">{description}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Company info */}
          {currentStep === 1 && (
            <div>
              <h2 className="mb-2 text-2xl font-bold text-white">Informatii firma</h2>
              <p className="mb-6 text-sm text-gray-400">
                Completeaza datele firmei. Doar numele este obligatoriu.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-300">
                    Nume afacere <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="Ex: Salon Elegance"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-brand-blue focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-300">CUI</label>
                    <input
                      type="text"
                      value={formData.cui}
                      onChange={(e) => updateField("cui", e.target.value)}
                      placeholder="RO12345678"
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-brand-blue focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-300">
                      Reg. Comertului
                    </label>
                    <input
                      type="text"
                      value={formData.reg_com}
                      onChange={(e) => updateField("reg_com", e.target.value)}
                      placeholder="J40/1234/2024"
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-brand-blue focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-300">Adresa</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => updateField("address", e.target.value)}
                    placeholder="Str. Victoriei 42, Sector 1"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-brand-blue focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-300">Oras</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => updateField("city", e.target.value)}
                      placeholder="Bucuresti"
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-brand-blue focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-300">Judet</label>
                    <input
                      type="text"
                      value={formData.county}
                      onChange={(e) => updateField("county", e.target.value)}
                      placeholder="Bucuresti"
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-brand-blue focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-300">
                      Cod postal
                    </label>
                    <input
                      type="text"
                      value={formData.postal_code}
                      onChange={(e) => updateField("postal_code", e.target.value)}
                      placeholder="010061"
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-brand-blue focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Contact */}
          {currentStep === 2 && (
            <div>
              <h2 className="mb-2 text-2xl font-bold text-white">Date de contact</h2>
              <p className="mb-6 text-sm text-gray-400">
                Cum te pot contacta clientii? Toate campurile sunt optionale.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-300">Telefon</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="+40721234567"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-brand-blue focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-300">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="contact@firma.ro"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-brand-blue focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-300">Website</label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => updateField("website", e.target.value)}
                    placeholder="https://firma.ro"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-brand-blue focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {currentStep === 3 && (
            <div>
              <h2 className="mb-2 text-2xl font-bold text-white">Confirma datele</h2>
              <p className="mb-6 text-sm text-gray-400">
                Verifica informatiile si creeaza afacerea.
              </p>

              {error && (
                <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <SummaryRow
                  label="Tip afacere"
                  value={VERTICALS.find((v) => v.value === formData.vertical)?.label || "—"}
                />
                <SummaryRow label="Nume" value={formData.name || "—"} />
                {formData.cui && <SummaryRow label="CUI" value={formData.cui} />}
                {formData.reg_com && <SummaryRow label="Reg. Com." value={formData.reg_com} />}
                {formData.address && <SummaryRow label="Adresa" value={formData.address} />}
                {(formData.city || formData.county) && (
                  <SummaryRow
                    label="Localitate"
                    value={[formData.city, formData.county].filter(Boolean).join(", ")}
                  />
                )}
                {formData.postal_code && (
                  <SummaryRow label="Cod postal" value={formData.postal_code} />
                )}
                {formData.phone && <SummaryRow label="Telefon" value={formData.phone} />}
                {formData.email && <SummaryRow label="Email" value={formData.email} />}
                {formData.website && <SummaryRow label="Website" value={formData.website} />}
              </div>
            </div>
          )}

          {/* ── Navigation buttons ── */}
          <div className="mt-8 flex items-center justify-between">
            {currentStep > 0 ? (
              <button
                onClick={handleBack}
                className="flex items-center gap-1 rounded-lg px-4 py-2.5 min-h-[44px] text-sm text-gray-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Inapoi
              </button>
            ) : (
              <div />
            )}

            {currentStep < STEPS.length - 1 ? (
              <button
                onClick={handleNext}
                disabled={!canGoNext()}
                className="flex items-center gap-1 rounded-lg bg-brand-blue px-6 py-2.5 min-h-[44px] text-sm font-semibold text-white hover:bg-brand-blue-light disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Continua
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2.5 min-h-[44px] text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50 transition-colors"
              >
                <Building2 className="h-4 w-4" />
                {loading ? "Se creeaza..." : "Creeaza afacerea"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-3">
      <span className="text-sm text-gray-400">{label}</span>
      <span className="text-sm font-medium text-white">{value}</span>
    </div>
  );
}
