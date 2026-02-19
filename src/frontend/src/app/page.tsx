"use client";

import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-navy via-slate-900 to-brand-navy">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-4">
        <div className="text-2xl font-bold text-white">
          Booking<span className="text-brand-blue">CRM</span>
        </div>
        <div className="flex gap-4">
          <Link
            href="/login"
            className="rounded-lg px-5 py-2 text-sm font-medium text-white hover:bg-white/10"
          >
            Autentificare
          </Link>
          <Link
            href="/login?register=true"
            className="rounded-lg bg-brand-blue px-5 py-2 text-sm font-medium text-white hover:bg-brand-blue-light"
          >
            Incepe gratuit
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-8 py-24 text-center">
        <h1 className="text-5xl font-bold leading-tight text-white sm:text-6xl">
          Programari online
          <br />
          <span className="text-brand-blue">pentru orice afacere</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-300">
          Salon, cabinet dentar, terapie, fitness, masaj, tutoring &mdash; o
          singura platforma de programari, CRM si facturare. Cu notificari pe
          Viber, WhatsApp si SMS. Cu e-Factura ANAF. Cu sync Airbnb.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Link
            href="/login?register=true"
            className="rounded-xl bg-brand-blue px-8 py-3.5 text-lg font-semibold text-white shadow-lg shadow-blue-500/25 hover:bg-brand-blue-light"
          >
            Incepe gratuit &rarr;
          </Link>
          <Link
            href="#preturi"
            className="rounded-xl border border-white/20 px-8 py-3.5 text-lg font-semibold text-white hover:bg-white/5"
          >
            Vezi preturile
          </Link>
        </div>
      </section>

      {/* Features grid */}
      <section className="mx-auto max-w-6xl px-8 pb-24">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "Calendar & Programari",
              desc: "Calendar drag-and-drop cu detectie conflicte, multi-angajat, pagina publica de booking.",
              icon: "📅",
            },
            {
              title: "CRM Clienti",
              desc: "Fise client, istoric vizite, taguri, preferinte, no-show tracking, GDPR Article 9.",
              icon: "👥",
            },
            {
              title: "Viber / WhatsApp / SMS",
              desc: "Notificari automate: confirmare, reminder 24h, reminder 1h. Strategie Viber-first.",
              icon: "💬",
            },
            {
              title: "e-Factura ANAF",
              desc: "Genereaza facturi UBL 2.1 si trimite-le direct la SPV. Integrat nativ.",
              icon: "🧾",
            },
            {
              title: "Sync Airbnb / Booking.com",
              desc: "Importa calendare iCal externe. Blocheaza automat sloturile ocupate.",
              icon: "🔄",
            },
            {
              title: "Multi-vertical",
              desc: "Salon, dentar, terapie, fitness, masaj, tutoring. O platforma, orice nisa.",
              icon: "🏢",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
            >
              <div className="mb-3 text-3xl">{f.icon}</div>
              <h3 className="mb-2 text-lg font-semibold text-white">{f.title}</h3>
              <p className="text-sm text-gray-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="preturi" className="mx-auto max-w-5xl px-8 pb-24">
        <h2 className="mb-12 text-center text-3xl font-bold text-white">
          Preturi simple, fara surprize
        </h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            {
              name: "Starter",
              price: "29",
              features: [
                "1 angajat",
                "Pagina booking publica",
                "100 SMS/luna",
                "Calendar + CRM",
                "Viber notificari",
              ],
            },
            {
              name: "Professional",
              price: "59",
              popular: true,
              features: [
                "5 angajati",
                "Pagina booking publica",
                "500 SMS/luna",
                "Calendar + CRM",
                "Viber + WhatsApp",
                "e-Factura ANAF",
                "iCal Sync",
              ],
            },
            {
              name: "Enterprise",
              price: "99",
              features: [
                "Angajati nelimitati",
                "Pagina booking publica",
                "2000 SMS/luna",
                "Calendar + CRM",
                "Viber + WhatsApp + SMS",
                "e-Factura ANAF",
                "iCal Sync",
                "Suport prioritar",
                "API Access",
              ],
            },
          ].map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-6 ${
                plan.popular
                  ? "border-brand-blue bg-brand-blue/10 ring-2 ring-brand-blue"
                  : "border-white/10 bg-white/5"
              }`}
            >
              {plan.popular && (
                <span className="mb-4 inline-block rounded-full bg-brand-blue px-3 py-1 text-xs font-semibold text-white">
                  Recomandat
                </span>
              )}
              <h3 className="text-xl font-bold text-white">{plan.name}</h3>
              <div className="mt-3 mb-6">
                <span className="text-4xl font-bold text-white">{plan.price}</span>
                <span className="text-gray-400"> RON/luna</span>
              </div>
              <ul className="space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                    <span className="text-brand-green">✓</span> {f}
                  </li>
                ))}
              </ul>
              <button className="mt-6 w-full rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-blue-light">
                Alege {plan.name}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-8 py-8 text-center text-sm text-gray-500">
        &copy; 2026 BookingCRM. Toate drepturile rezervate.
      </footer>
    </div>
  );
}
