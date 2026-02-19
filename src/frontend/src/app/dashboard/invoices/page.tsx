"use client";

import { useState, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { invoices as invoicesApi, clients as clientsApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import { MOCK_INVOICES, MOCK_CLIENTS } from "@/lib/mock-data";

// ============================================================
// Types
// ============================================================
interface InvoiceData {
  id: number;
  business_id: number;
  client_id: number | null;
  series: string;
  number: number;
  invoice_number_display?: string;
  invoice_date: string;
  due_date: string | null;
  buyer_name: string;
  buyer_cui: string | null;
  buyer_address: string | null;
  buyer_reg_com: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  buyer_is_company: boolean;
  subtotal: number;
  vat_amount: number;
  total: number;
  currency: string;
  line_items: LineItem[];
  status: string;
  payment_status: string;
  paid_amount: number;
  paid_at: string | null;
  efactura_status: string | null;
  efactura_upload_id: string | null;
  pdf_url: string | null;
  notes: string | null;
  created_at: string;
}

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  total: number;
  unit_measure?: string;
}

interface ClientData {
  id: number;
  full_name: string;
  phone: string | null;
  email: string | null;
}

// ============================================================
// Constants
// ============================================================
const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  issued: "bg-blue-100 text-blue-700",
  sent: "bg-sky-100 text-sky-700",
  paid: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
  storno: "bg-orange-100 text-orange-700",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  issued: "Emis",
  sent: "Trimis",
  paid: "Platit",
  cancelled: "Anulat",
  storno: "Storno",
};

const EFACTURA_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600",
  uploaded: "bg-amber-100 text-amber-700",
  accepted: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

const EFACTURA_LABELS: Record<string, string> = {
  pending: "In asteptare",
  uploaded: "Trimis ANAF",
  accepted: "Acceptat ANAF",
  rejected: "Respins ANAF",
};

type FilterTab = "all" | "draft" | "issued" | "paid" | "unpaid";

// ============================================================
// Component
// ============================================================
export default function InvoicesPage() {
  const activeBusiness = useAppStore((s) => s.activeBusiness);
  const businessId = activeBusiness?.id;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  // Data fetching
  const { data: invoicesData, isUsingMockData, refetch: refetchInvoices } = useFetch(
    () => (businessId ? invoicesApi.list(businessId) : Promise.resolve([])),
    MOCK_INVOICES,
    [businessId]
  );

  const { data: clientsData } = useFetch(
    () => (businessId ? clientsApi.list(businessId) : Promise.resolve([])),
    MOCK_CLIENTS,
    [businessId]
  );

  const invoicesList: InvoiceData[] = invoicesData || [];
  const clientsList: ClientData[] = clientsData || [];

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    switch (activeTab) {
      case "draft": return invoicesList.filter((inv) => inv.status === "draft");
      case "issued": return invoicesList.filter((inv) => inv.status === "issued" || inv.status === "sent");
      case "paid": return invoicesList.filter((inv) => inv.status === "paid");
      case "unpaid": return invoicesList.filter((inv) => inv.payment_status === "unpaid" && inv.status !== "cancelled");
      default: return invoicesList;
    }
  }, [invoicesList, activeTab]);

  // Stats
  const totalRevenue = invoicesList.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const paidAmount = invoicesList
    .filter((inv) => inv.payment_status === "paid" || inv.status === "paid")
    .reduce((sum, inv) => sum + (inv.total || 0), 0);
  const unpaidAmount = totalRevenue - paidAmount;

  // Mark as paid handler
  const handleMarkPaid = async (invoiceId: number) => {
    if (!businessId) return;
    try {
      await invoicesApi.markPaid(businessId, invoiceId, { payment_method: "cash" });
      refetchInvoices();
    } catch {
      // silent fail, could add toast notification
    }
  };

  const tabCounts = useMemo(() => ({
    all: invoicesList.length,
    draft: invoicesList.filter((inv) => inv.status === "draft").length,
    issued: invoicesList.filter((inv) => inv.status === "issued" || inv.status === "sent").length,
    paid: invoicesList.filter((inv) => inv.status === "paid").length,
    unpaid: invoicesList.filter((inv) => inv.payment_status === "unpaid" && inv.status !== "cancelled").length,
  }), [invoicesList]);

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturi</h1>
          <p className="text-sm text-gray-500">e-Factura ANAF integrat nativ</p>
          {isUsingMockData && (
            <p className="mt-1 text-[10px] text-amber-500 font-medium">Date demo &mdash; backend-ul nu este conectat</p>
          )}
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-light transition-colors"
        >
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

      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b">
        {[
          { key: "all" as FilterTab, label: "Toate" },
          { key: "draft" as FilterTab, label: "Draft" },
          { key: "issued" as FilterTab, label: "Emise" },
          { key: "paid" as FilterTab, label: "Platite" },
          { key: "unpaid" as FilterTab, label: "De incasat" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-brand-blue text-brand-blue"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
            <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
              {tabCounts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Invoice table */}
      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="overflow-x-auto">
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
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-gray-400">
                    Nicio factura gasita.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-sm font-semibold text-brand-blue">
                        {invoice.series}{String(invoice.number).padStart(6, "0")}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-gray-900">{invoice.buyer_name}</p>
                      {invoice.buyer_cui && (
                        <p className="text-[10px] text-gray-400">CUI: {invoice.buyer_cui}</p>
                      )}
                      {invoice.buyer_is_company && (
                        <span className="text-[10px] text-brand-blue font-medium">PJ</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-sm text-gray-700">
                        {new Date(invoice.invoice_date).toLocaleDateString("ro-RO")}
                      </p>
                      {invoice.due_date && (
                        <p className="text-[10px] text-gray-400">
                          Scadenta: {new Date(invoice.due_date).toLocaleDateString("ro-RO")}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <p className="text-sm text-gray-700">{(invoice.subtotal || 0).toFixed(2)}</p>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <p className="text-sm text-gray-500">{(invoice.vat_amount || 0).toFixed(2)}</p>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <p className="text-sm font-bold text-gray-900">{(invoice.total || 0).toFixed(2)} RON</p>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${STATUS_COLORS[invoice.status] || "bg-gray-100 text-gray-600"}`}>
                        {STATUS_LABELS[invoice.status] || invoice.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      {invoice.efactura_status ? (
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${EFACTURA_COLORS[invoice.efactura_status] || "bg-gray-100 text-gray-600"}`}>
                          {EFACTURA_LABELS[invoice.efactura_status] || invoice.efactura_status}
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {invoice.pdf_url && (
                          <a href={invoice.pdf_url} target="_blank" rel="noopener noreferrer" className="rounded px-2 py-1 text-[10px] text-gray-500 hover:bg-gray-100">
                            PDF
                          </a>
                        )}
                        {(invoice.status === "issued" || invoice.status === "sent") && invoice.payment_status !== "paid" && (
                          <button
                            onClick={() => handleMarkPaid(invoice.id)}
                            className="rounded px-2 py-1 text-[10px] text-green-600 font-medium hover:bg-green-50"
                          >
                            Platit
                          </button>
                        )}
                        {!invoice.efactura_status && invoice.status !== "draft" && invoice.status !== "cancelled" && (
                          <button className="rounded px-2 py-1 text-[10px] text-brand-blue font-medium hover:bg-blue-50">
                            Trimite ANAF
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* e-Factura status */}
      <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
            <svg className="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-800">e-Factura ANAF integrat</p>
            <p className="text-xs text-emerald-600">
              Facturile sunt generate automat in format UBL 2.1 si trimise catre SPV/ANAF.
              Conformitate cu legislatia romaneasca in vigoare.
            </p>
          </div>
        </div>
      </div>

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <CreateInvoiceModal
          businessId={businessId!}
          clientsList={clientsList}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            refetchInvoices();
          }}
        />
      )}
    </div>
  );
}

// ============================================================
// Create Invoice Modal
// ============================================================
function CreateInvoiceModal({
  businessId,
  clientsList,
  onClose,
  onCreated,
}: {
  businessId: number;
  clientsList: ClientData[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [buyerName, setBuyerName] = useState("");
  const [buyerCui, setBuyerCui] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [buyerRegCom, setBuyerRegCom] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerIsCompany, setBuyerIsCompany] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<number | string>("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unit_price: 0, vat_rate: 19, total: 0 },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-fill buyer from client
  const handleClientSelect = (clientIdString: string) => {
    setSelectedClientId(clientIdString);
    if (clientIdString) {
      const selectedClient = clientsList.find((client) => client.id === Number(clientIdString));
      if (selectedClient) {
        setBuyerName(selectedClient.full_name);
        setBuyerEmail(selectedClient.email || "");
        setBuyerPhone(selectedClient.phone || "");
      }
    }
  };

  // Line item management
  const addLineItem = () => {
    setLineItems([...lineItems, { description: "", quantity: 1, unit_price: 0, vat_rate: 19, total: 0 }]);
  };

  const removeLineItem = (itemIndex: number) => {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((_, currentIndex) => currentIndex !== itemIndex));
  };

  const updateLineItem = (itemIndex: number, field: keyof LineItem, value: any) => {
    const updatedItems = [...lineItems];
    updatedItems[itemIndex] = { ...updatedItems[itemIndex], [field]: value };
    // Auto-calc total
    const item = updatedItems[itemIndex];
    const subtotal = item.quantity * item.unit_price;
    const vatAmount = subtotal * item.vat_rate / 100;
    updatedItems[itemIndex].total = Math.round((subtotal + vatAmount) * 100) / 100;
    setLineItems(updatedItems);
  };

  // Totals
  const invoiceSubtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const invoiceVatAmount = lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price * item.vat_rate / 100), 0);
  const invoiceTotal = invoiceSubtotal + invoiceVatAmount;

  const handleSubmit = async () => {
    if (!buyerName.trim()) {
      setErrorMessage("Numele cumparatorului este obligatoriu");
      return;
    }
    if (lineItems.some((item) => !item.description.trim())) {
      setErrorMessage("Descrierea fiecarui articol este obligatorie");
      return;
    }
    setErrorMessage(null);
    setSubmitting(true);

    const payload: any = {
      buyer_name: buyerName.trim(),
      buyer_cui: buyerCui.trim() || null,
      buyer_address: buyerAddress.trim() || null,
      buyer_reg_com: buyerRegCom.trim() || null,
      buyer_email: buyerEmail.trim() || null,
      buyer_phone: buyerPhone.trim() || null,
      buyer_is_company: buyerIsCompany,
      client_id: selectedClientId ? Number(selectedClientId) : null,
      due_date: dueDate || null,
      notes: notes.trim() || null,
      line_items: lineItems.map((item) => ({
        description: item.description.trim(),
        quantity: item.quantity,
        unit_price: item.unit_price,
        vat_rate: item.vat_rate,
      })),
    };

    try {
      await invoicesApi.create(businessId, payload);
      onCreated();
    } catch (caughtError: any) {
      setErrorMessage(caughtError.message || "Eroare la creare");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl" onClick={(clickEvent) => clickEvent.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4 rounded-t-2xl">
          <h3 className="text-lg font-bold text-gray-900">Factura noua</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg></button>
        </div>

        <div className="p-6 space-y-5">
          {errorMessage && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>}

          {/* Client selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Selecteaza client (optional)</label>
            <select
              value={selectedClientId}
              onChange={(changeEvent) => handleClientSelect(changeEvent.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            >
              <option value="">- Selecteaza -</option>
              {clientsList.map((client) => (
                <option key={client.id} value={client.id}>{client.full_name} {client.phone ? `(${client.phone})` : ""}</option>
              ))}
            </select>
          </div>

          {/* Buyer info */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-700">Date cumparator</p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={buyerIsCompany} onChange={(e) => setBuyerIsCompany(e.target.checked)} className="rounded border-gray-300 text-brand-blue focus:ring-brand-blue" />
                <span className="text-xs text-gray-600">Persoana juridica (PJ)</span>
              </label>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Nume / Denumire *</label>
              <input type="text" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue" />
            </div>

            {buyerIsCompany && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">CUI</label>
                  <input type="text" value={buyerCui} onChange={(e) => setBuyerCui(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue" placeholder="RO12345678" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Nr. Reg. Com.</label>
                  <input type="text" value={buyerRegCom} onChange={(e) => setBuyerRegCom(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue" placeholder="J40/1234/2023" />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs text-gray-500 mb-1">Adresa</label>
              <input type="text" value={buyerAddress} onChange={(e) => setBuyerAddress(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Email</label>
                <input type="email" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Telefon</label>
                <input type="tel" value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue" />
              </div>
            </div>
          </div>

          {/* Due date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scadenta</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue" />
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-700">Articole factura</p>
              <button onClick={addLineItem} className="text-xs font-medium text-brand-blue hover:underline">
                + Adauga articol
              </button>
            </div>

            <div className="space-y-3">
              {lineItems.map((item, itemIndex) => (
                <div key={itemIndex} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(changeEvent) => updateLineItem(itemIndex, "description", changeEvent.target.value)}
                        placeholder="Descriere articol *"
                        className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                      />
                    </div>
                    {lineItems.length > 1 && (
                      <button onClick={() => removeLineItem(itemIndex)} className="text-red-400 hover:text-red-600 p-1">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-0.5">Cantitate</label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(changeEvent) => updateLineItem(itemIndex, "quantity", Number(changeEvent.target.value))}
                        className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
                        min={0.01}
                        step={0.01}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-0.5">Pret unitar</label>
                      <input
                        type="number"
                        value={item.unit_price}
                        onChange={(changeEvent) => updateLineItem(itemIndex, "unit_price", Number(changeEvent.target.value))}
                        className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
                        min={0}
                        step={0.01}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-0.5">TVA (%)</label>
                      <select
                        value={item.vat_rate}
                        onChange={(changeEvent) => updateLineItem(itemIndex, "vat_rate", Number(changeEvent.target.value))}
                        className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
                      >
                        <option value={19}>19%</option>
                        <option value={9}>9%</option>
                        <option value={5}>5%</option>
                        <option value={0}>0%</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-0.5">Total (cu TVA)</label>
                      <p className="px-2 py-1.5 text-sm font-semibold text-gray-900">{item.total.toFixed(2)} RON</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Invoice totals */}
            <div className="mt-4 rounded-lg bg-gray-50 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal:</span>
                <span className="font-medium text-gray-900">{invoiceSubtotal.toFixed(2)} RON</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-500">TVA:</span>
                <span className="font-medium text-gray-900">{invoiceVatAmount.toFixed(2)} RON</span>
              </div>
              <div className="flex justify-between text-sm mt-2 pt-2 border-t border-gray-200">
                <span className="font-semibold text-gray-700">Total:</span>
                <span className="text-lg font-bold text-brand-blue">{invoiceTotal.toFixed(2)} RON</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notite</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue" rows={2} placeholder="Mentiuni suplimentare pe factura" />
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t bg-gray-50 px-6 py-4 rounded-b-2xl">
          <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">Anuleaza</button>
          <button onClick={handleSubmit} disabled={submitting} className="rounded-lg bg-brand-blue px-6 py-2 text-sm font-medium text-white hover:bg-brand-blue-light disabled:opacity-50">
            {submitting ? "Se genereaza..." : "Emite factura"}
          </button>
        </div>
      </div>
    </div>
  );
}
