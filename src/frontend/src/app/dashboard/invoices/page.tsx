"use client";

import { MOCK_INVOICES } from "@/lib/mock-data";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  issued: "bg-blue-100 text-blue-700",
  sent: "bg-sky-100 text-sky-700",
  paid: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

const efacturaColors: Record<string, string> = {
  uploaded: "bg-amber-100 text-amber-700",
  accepted: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

export default function InvoicesPage() {
  const totalRevenue = MOCK_INVOICES.reduce((a, b) => a + b.total, 0);
  const paidAmount = MOCK_INVOICES.filter((i) => i.payment_status === "paid").reduce((a, b) => a + b.total, 0);
  const unpaidAmount = totalRevenue - paidAmount;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturi</h1>
          <p className="text-sm text-gray-500">e-Factura ANAF integrat nativ</p>
        </div>
        <button className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-light">
          + Factura noua
        </button>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-l-4 border-l-brand-blue bg-white p-4">
          <p className="text-xs text-gray-500">Total facturat</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{totalRevenue.toLocaleString("ro-RO")} RON</p>
        </div>
        <div className="rounded-xl border border-l-4 border-l-brand-green bg-white p-4">
          <p className="text-xs text-gray-500">Incasat</p>
          <p className="mt-1 text-2xl font-bold text-brand-green">{paidAmount.toLocaleString("ro-RO")} RON</p>
        </div>
        <div className="rounded-xl border border-l-4 border-l-amber-500 bg-white p-4">
          <p className="text-xs text-gray-500">De incasat</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{unpaidAmount.toLocaleString("ro-RO")} RON</p>
        </div>
      </div>

      {/* Invoice table */}
      <div className="rounded-xl border bg-white overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Nr.</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Client</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Data</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500">Subtotal</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500">TVA</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500">Total</th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500">Status</th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500">e-Factura</th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500">Actiuni</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {MOCK_INVOICES.map((inv) => (
              <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3">
                  <p className="text-sm font-semibold text-brand-blue">
                    {inv.series}{inv.number}
                  </p>
                </td>
                <td className="px-5 py-3">
                  <p className="text-sm font-medium text-gray-900">{inv.buyer_name}</p>
                  {inv.buyer_cui && (
                    <p className="text-[10px] text-gray-400">CUI: {inv.buyer_cui}</p>
                  )}
                  {inv.buyer_is_company && (
                    <span className="text-[10px] text-brand-blue font-medium">PJ</span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <p className="text-sm text-gray-700">
                    {new Date(inv.invoice_date).toLocaleDateString("ro-RO")}
                  </p>
                </td>
                <td className="px-5 py-3 text-right">
                  <p className="text-sm text-gray-700">{inv.subtotal.toFixed(2)}</p>
                </td>
                <td className="px-5 py-3 text-right">
                  <p className="text-sm text-gray-500">{inv.vat_amount.toFixed(2)}</p>
                </td>
                <td className="px-5 py-3 text-right">
                  <p className="text-sm font-bold text-gray-900">{inv.total.toFixed(2)} RON</p>
                </td>
                <td className="px-5 py-3 text-center">
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${statusColors[inv.status]}`}>
                    {inv.status === "paid" ? "Platit" : inv.status === "issued" ? "Emis" : inv.status === "draft" ? "Draft" : inv.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-center">
                  {inv.efactura_status ? (
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${efacturaColors[inv.efactura_status] || "bg-gray-100 text-gray-600"}`}>
                      {inv.efactura_status === "uploaded" ? "Trimis ANAF" : inv.efactura_status === "accepted" ? "Acceptat ANAF" : inv.efactura_status}
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-300">-</span>
                  )}
                </td>
                <td className="px-5 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button className="rounded px-2 py-1 text-[10px] text-gray-500 hover:bg-gray-100">PDF</button>
                    {inv.efactura_status !== "accepted" && inv.efactura_status !== "uploaded" && (
                      <button className="rounded px-2 py-1 text-[10px] text-brand-blue font-medium hover:bg-blue-50">
                        Trimite ANAF
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* e-Factura info */}
      <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🧾</span>
          <div>
            <p className="text-sm font-semibold text-emerald-800">e-Factura ANAF activ</p>
            <p className="text-xs text-emerald-600">
              Facturile sunt generate automat in format UBL 2.1 si trimise catre SPV/ANAF.
              Token OAuth valid pana pe 15.08.2026.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
