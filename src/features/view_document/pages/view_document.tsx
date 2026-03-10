import { useEffect, useState } from "react";
import { getDocumentStats, getInvoices, getPurchaseOrders } from "../services/documentService";
import Sidebar from "../../dashboard/components/sidebar";
import { useDispatch, useSelector } from "react-redux";
import { type AppDispatch, type RootState } from "../../../app/store";
import { Navigate } from "react-router-dom";
import type { InvoiceData } from "../../../types/invoice";
import type { POData } from "../../../types/purchase_order";
import { fetchUser } from "../../auth/slices/authSlice";
import SummaryBar from "../components/summary_bar";
import FileViewer from "../components/file_viewer";
import VendorBlock from "../components/vendor_block";

type DocStatus = "approved" | "pending" | "rejected";
type ActiveDocTab = "Invoice" | "Purchase Order";
type InvoiceDetailTab = "details" | "vendor" | "file";
type PODetailTab = "details" | "vendor" | "file";

const STATUS_CONFIG: Record<DocStatus, { pill: string; dot: string; label: string }> = {
  approved: { pill: "bg-green-100 text-green-700", dot: "bg-green-500", label: "Approved" },
  pending:  { pill: "bg-amber-100 text-amber-700", dot: "bg-amber-400",  label: "Pending"  },
  rejected: { pill: "bg-red-100 text-red-700",     dot: "bg-red-500",   label: "Rejected" },
};

function fmt(n: number, code = "INR") {
  const symbol = code === "INR" ? "₹" : code;
  return `${symbol} ${Number(n).toLocaleString("en-IN")}`;
}

function StatusBadge({ status }: { status: DocStatus }) {
  const c = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${c.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

function DocTypeTab({ label, icon, count, active, accentActive, onClick }: {label: string; icon: string; count: number; active: boolean; accentActive: string; onClick: () => void;}) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${active ? accentActive : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50"}`}>
      <span>{icon}</span>
      <span>{label}</span>
      <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold transition-colors ${active ? "bg-white/70 text-current" : "bg-gray-100 text-gray-500"}`}>{count}</span>
    </button>
  );
}

function FilterBar({ search, setSearch, placeholder }: {search: string; setSearch: (s: string) => void; placeholder?: string;}) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="relative flex-1 min-w-45">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={placeholder ?? "Search…"}
          className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white" />
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex-1 flex items-center justify-center py-16">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-gray-400">Loading…</p>
      </div>
    </div>
  );
}

function InvoiceTable({ invoices, selected, onSelect, loading }: {invoices: InvoiceData[]; selected: InvoiceData | null; onSelect: (inv: InvoiceData) => void; loading: boolean;}) {
  if (loading) return <Spinner />;
  return (
    <div className="flex-1 overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-white z-10 shadow-[0_1px_0_#f3f4f6]">
          <tr className="text-left text-gray-400">
            <th className="py-3 px-4 font-medium">Invoice ID</th>
            <th className="py-3 px-4 font-medium">Vendor</th>
            <th className="py-3 px-4 font-medium hidden md:table-cell">PO Ref</th>
            <th className="py-3 px-4 font-medium">Amount</th>
            <th className="py-3 px-4 font-medium">Status</th>
            <th className="py-3 px-4 font-medium hidden lg:table-cell">Date</th>
          </tr>
        </thead>
        <tbody>
          {invoices.length === 0 && (
            <tr><td colSpan={6} className="text-center py-16 text-gray-400 text-sm">No invoices found</td></tr>
          )}
          {invoices.map(inv => (
            <tr key={inv.invoice_id} onClick={() => onSelect(inv)}
              className={`border-b border-gray-50 last:border-0 cursor-pointer transition-colors
                ${selected?.invoice_id === inv.invoice_id ? "bg-blue-50" : "hover:bg-gray-50"}`}>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 bg-blue-50 text-blue-600">🧾</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{inv.invoice_id}</p>
                    <p className="text-xs text-gray-400">{inv.currency_code}</p>
                  </div>
                </div>
              </td>
              <td className="py-3 px-4 text-sm text-gray-600 max-w-35 truncate">{inv.vendor.name}</td>
              <td className="py-3 px-4 text-xs text-gray-400 hidden md:table-cell">{inv.po_id || "—"}</td>
              <td className="py-3 px-4 text-sm text-gray-700 font-medium whitespace-nowrap">{fmt(inv.total_amount, inv.currency_code)}</td>
              <td className="py-3 px-4"><StatusBadge status="pending" /></td>
              <td className="py-3 px-4 text-xs text-gray-400 hidden lg:table-cell whitespace-nowrap">{inv.invoice_date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InvoiceDetailPanel({ inv, onClose }: { inv: InvoiceData; onClose: () => void }) {
  const [tab, setTab] = useState<InvoiceDetailTab>("details");
  useEffect(() => { setTab("details"); }, [inv.invoice_id]);

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm overflow-hidden border-t-4 border-t-blue-600">
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-blue-50 text-blue-600">🧾</span>
          <div>
            <p className="text-base font-bold text-gray-800">{inv.invoice_id}</p>
            <p className="text-xs text-gray-400 truncate max-w-40">{inv.vendor.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status="pending" />
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-lg leading-none ml-1">✕</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 px-5 gap-4 shrink-0">
        {(["details", "vendor", "file"] as InvoiceDetailTab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t ? "border-blue-500 text-blue-600" : "border-transparent text-gray-400 hover:text-gray-600"}`}>
            {t === "details" ? "📄 Details" : t === "vendor" ? "🏢 Vendor" : "🖼️ File"}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {tab === "details" && (
          <div className="px-5 py-4 flex flex-col gap-5">
            {/* Invoice Meta */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Invoice Info</p>
              <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                {[
                  { label: "Invoice ID",value: inv.invoice_id },
                  { label: "PO Reference", value: inv.po_id || "—" },
                  { label: "Invoice Date", value: inv.invoice_date },
                  { label: "Due Date", value: inv.due_date },
                  { label: "Currency", value: inv.currency_code },
                ].map(f => (
                  <div key={f.label}>
                    <p className="text-xs text-gray-400">{f.label}</p>
                    <p className="text-sm font-medium text-gray-800 truncate">{f.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Line Items */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Invoice Items</p>
              <div className="rounded-lg border border-gray-100 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-gray-400">
                      <th className="px-3 py-2 font-medium">Description</th>
                      <th className="px-3 py-2 font-medium text-right">Qty</th>
                      <th className="px-3 py-2 font-medium text-right hidden sm:table-cell">Unit Price</th>
                      <th className="px-3 py-2 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(inv.invoice_items ?? []).map((item: any, i: number) => (
                      <tr key={i} className="border-t border-gray-50">
                        <td className="px-3 py-2 text-gray-700">{item.item_description}</td>
                        <td className="px-3 py-2 text-right text-gray-500">{item.quantity}</td>
                        <td className="px-3 py-2 text-right text-gray-500 hidden sm:table-cell">{fmt(item.unit_price, inv.currency_code)}</td>
                        <td className="px-3 py-2 text-right font-semibold text-gray-800">{fmt(item.total_price, inv.currency_code)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex flex-col gap-1 text-xs">
                <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{fmt(inv.subtotal, inv.currency_code)}</span></div>
                <div className="flex justify-between text-gray-500"><span>Tax</span><span>{fmt(inv.tax_amount, inv.currency_code)}</span></div>
                <div className="flex justify-between text-gray-500"><span>Discount</span><span>− {fmt(inv.discount_amount, inv.currency_code)}</span></div>
                <div className="flex justify-between font-bold text-gray-800 pt-1 border-t border-gray-100">
                  <span>Total</span><span>{fmt(inv.total_amount, inv.currency_code)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
        {tab === "vendor" && (<div className="px-5 py-4"><VendorBlock vendor={inv.vendor} /></div>)}
        {tab === "file" && (<FileViewer fileUrl={inv.file_url??""} id={inv.invoice_id} vendor={inv.vendor.name} date={inv.invoice_date}/>)}
      </div>

    </div>
  );
}

function POTable({ pos, selected, onSelect, loading }: {pos: POData[]; selected: POData | null; onSelect: (po: POData) => void; loading: boolean;}) {
  if (loading) return <Spinner />;
  return (
    <div className="flex-1 overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-white z-10 shadow-[0_1px_0_#f3f4f6]">
          <tr className="text-left text-gray-400">
            <th className="py-3 px-4 font-medium">PO ID</th>
            <th className="py-3 px-4 font-medium">Vendor</th>
            <th className="py-3 px-4 font-medium hidden md:table-cell">GL Code</th>
            <th className="py-3 px-4 font-medium">Amount</th>
            <th className="py-3 px-4 font-medium">Status</th>
            <th className="py-3 px-4 font-medium hidden lg:table-cell">Date</th>
          </tr>
        </thead>
        <tbody>
          {pos.length === 0 && (
            <tr><td colSpan={6} className="text-center py-16 text-gray-400 text-sm">No purchase orders found</td></tr>
          )}
          {pos.map(po => (
            <tr key={po.po_id} onClick={() => onSelect(po)} className={`border-b border-gray-50 last:border-0 cursor-pointer transition-colors ${selected?.po_id === po.po_id ? "bg-violet-50" : "hover:bg-gray-50"}`}>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 bg-violet-50 text-violet-600">📋</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{po.po_id}</p>
                    <p className="text-xs text-gray-400">{po.currency_code}</p>
                  </div>
                </div>
              </td>
              <td className="py-3 px-4 text-sm text-gray-600 max-w-35 truncate">{po.vendor.name}</td>
              <td className="py-3 px-4 text-xs text-gray-400 hidden md:table-cell">{po.gl_code || "—"}</td>
              <td className="py-3 px-4 text-sm text-gray-700 font-medium whitespace-nowrap">{fmt(po.total_amount, po.currency_code)}</td>
              <td className="py-3 px-4"><StatusBadge status="pending" /></td>
              <td className="py-3 px-4 text-xs text-gray-400 hidden lg:table-cell whitespace-nowrap">{po.ordered_date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PODetailPanel({ po, onClose }: { po: POData; onClose: () => void }) {
  const [tab, setTab] = useState<PODetailTab>("details");
  useEffect(() => { setTab("details"); }, [po.po_id]);

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm overflow-hidden border-t-4 border-t-violet-600">
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-violet-50 text-violet-600">📋</span>
          <div>
            <p className="text-base font-bold text-gray-800">{po.po_id}</p>
            <p className="text-xs text-gray-400 truncate max-w-40">{po.vendor.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status="pending" />
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-lg leading-none ml-1">✕</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 px-5 gap-4 shrink-0">
        {(["details", "vendor", "file"] as PODetailTab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t ? "border-violet-500 text-violet-600" : "border-transparent text-gray-400 hover:text-gray-600"}`}>
            {t === "details" ? "📄 Details" : t === "vendor" ? "🏢 Vendor" : "🖼️ File"}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {tab === "details" && (
          <div className="px-5 py-4 flex flex-col gap-5">
            {/* PO Meta */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">PO Info</p>
              <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                {[
                  { label: "PO ID", value: po.po_id },
                  { label: "GL Code", value: po.gl_code || "—" },
                  { label: "Ordered Date", value: po.ordered_date },
                  { label: "Currency", value: po.currency_code },
                  { label: "Total Amount", value: fmt(po.total_amount, po.currency_code) },
                ].map(f => (
                  <div key={f.label}>
                    <p className="text-xs text-gray-400">{f.label}</p>
                    <p className="text-sm font-medium text-gray-800 truncate">{f.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Ordered Items */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Ordered Items</p>
              <div className="rounded-lg border border-gray-100 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-gray-400">
                      <th className="px-3 py-2 font-medium">Description</th>
                      <th className="px-3 py-2 font-medium text-right">Qty</th>
                      <th className="px-3 py-2 font-medium text-right hidden sm:table-cell">Unit Price</th>
                      <th className="px-3 py-2 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(po.ordered_items ?? []).map((item: any, i: number) => (
                      <tr key={i} className="border-t border-gray-50">
                        <td className="px-3 py-2 text-gray-700">{item.item_description}</td>
                        <td className="px-3 py-2 text-right text-gray-500">{item.quantity}</td>
                        <td className="px-3 py-2 text-right text-gray-500 hidden sm:table-cell">{fmt(item.unit_price, po.currency_code)}</td>
                        <td className="px-3 py-2 text-right font-semibold text-gray-800">{fmt(item.total_price, po.currency_code)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex flex-col gap-1 text-xs">
                <div className="flex justify-between font-bold text-gray-800 pt-1 border-t border-gray-100">
                  <span>Total</span><span>{fmt(po.total_amount, po.currency_code)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
        {tab === "vendor" && (<div className="px-5 py-4"><VendorBlock vendor={po.vendor} /></div>)}
        {tab === "file" && (<FileViewer fileUrl={(po as any).fileUrl} id={po.po_id} vendor={po.vendor.name} date={po.ordered_date}/>)}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-gray-100 flex gap-2 shrink-0">
        <button className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">✅ Approve</button>
        <button className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium py-2.5 rounded-lg transition-colors">✕ Reject</button>
      </div>
    </div>
  );
}

function ViewDocuments() {
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [pos, setPos] = useState<POData[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [loadingPos, setLoadingPos] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveDocTab>("Invoice");
  const [invSearch, setInvSearch] = useState("");
  const [poSearch, setPoSearch] = useState("");
  const [selectedInv, setSelectedInv] = useState<InvoiceData | null>(null);
  const [selectedPo, setSelectedPo] = useState<POData | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const dispatch = useDispatch<AppDispatch>();
  const loading = useSelector((state: RootState) => state.auth.loading);
  const [stats, setStats] = useState({
    total_invoices: 0,
    total_pos: 0,
    invoice_value: 0,
    po_value: 0
  });

  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    const init = async () => {
      await dispatch(fetchUser());
      setAuthChecked(true);
    };

    init();

    (async () => {
      try {
        const [inv_data, po_data, stat_data] = await Promise.all([getInvoices(), getPurchaseOrders(), getDocumentStats()]);

        setInvoices(inv_data);
        setPos(po_data);
        setStats(stat_data);

      } catch (e) {
        console.error("Failed to fetch data:", e);
      } finally {
        setLoadingInvoices(false);
        setLoadingPos(false);
      }
    })();

  }, [dispatch]);

  if (!authChecked || loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }
  if (!user) return <Navigate to="/" />;

  const initials = user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase() ?? "";

  const filteredInvoices = invoices.filter(d => {
    const q = invSearch.toLowerCase();
    return !q || d.invoice_id.toLowerCase().includes(q) || d.vendor.name.toLowerCase().includes(q) || (d.po_id ?? "").toLowerCase().includes(q);});

  const filteredPos = pos.filter(d => {
    const q = poSearch.toLowerCase();
    return !q || d.po_id.toLowerCase().includes(q) || d.vendor.name.toLowerCase().includes(q) || (d.gl_code ?? "").toLowerCase().includes(q); });

  const handleTabChange = (tab: ActiveDocTab) => {
    setActiveTab(tab);
    setSelectedInv(null);
    setSelectedPo(null);
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} user={{ ...user, initials }} />

      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top Bar */}
        <header className="bg-white shadow-sm px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="text-gray-600 hover:text-gray-900 text-xl transition-colors cursor-pointer">☰</button>
            <h1 className="text-lg font-semibold text-gray-800">Documents</h1>
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
              {invoices.length + pos.length} total
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-sm">
              {initials}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-hidden flex flex-col gap-4 p-6 min-h-0">

          <SummaryBar stats={stats} />

          <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">

            {/* Table Card */}
            <div className={`flex flex-col bg-white rounded-xl shadow-sm overflow-hidden flex-1 min-w-0 border-t-4 transition-colors ${activeTab === "Invoice" ? "border-t-blue-600" : "border-t-violet-600"}`}>

              {/* Tab switcher */}
              <div className="flex border-b border-gray-100 px-2 shrink-0">
                <DocTypeTab label="Invoices" icon="🧾" count={invoices.length} active={activeTab === "Invoice"} accentActive="border-blue-600 text-blue-700 bg-blue-50/40" onClick={() => handleTabChange("Invoice")} />
                <DocTypeTab label="Purchase Orders" icon="📋" count={pos.length} active={activeTab === "Purchase Order"} accentActive="border-violet-600 text-violet-700 bg-violet-50/40" onClick={() => handleTabChange("Purchase Order")} />
              </div>

              {/* Search */}
              <div className="px-5 py-3 border-b border-gray-100 shrink-0">
                {activeTab === "Invoice" ? <FilterBar search={invSearch} setSearch={setInvSearch} placeholder="Search by invoice ID, vendor, PO ref…" /> : <FilterBar search={poSearch} setSearch={setPoSearch} placeholder="Search by PO ID, vendor, GL code…" />}
              </div>

              {/* Results count */}
              {activeTab === "Invoice" && !loadingInvoices && (
                <div className="px-5 py-2 shrink-0 border-b border-gray-50">
                  <p className="text-xs text-gray-400">
                    Showing <span className="font-medium text-gray-600">{filteredInvoices.length}</span> of{" "}
                    <span className="font-medium text-gray-600">{invoices.length}</span> invoices
                  </p>
                </div>
              )}
              {activeTab === "Purchase Order" && !loadingPos && (
                <div className="px-5 py-2 shrink-0 border-b border-gray-50">
                  <p className="text-xs text-gray-400">
                    Showing <span className="font-medium text-gray-600">{filteredPos.length}</span> of{" "}
                    <span className="font-medium text-gray-600">{pos.length}</span> purchase orders
                  </p>
                </div>
              )}

              <div className={`flex-1 flex flex-col min-h-0 ${activeTab === "Invoice" ? "" : "hidden"}`}>
                <InvoiceTable invoices={filteredInvoices} selected={selectedInv} onSelect={inv => setSelectedInv(s => s?.invoice_id === inv.invoice_id ? null : inv)} loading={loadingInvoices} />
              </div>
              <div className={`flex-1 flex flex-col min-h-0 ${activeTab === "Purchase Order" ? "" : "hidden"}`}>
                <POTable pos={filteredPos} selected={selectedPo} onSelect={po => setSelectedPo(s => s?.po_id === po.po_id ? null : po)} loading={loadingPos} />
              </div>
            </div>

            {/* Invoice Detail Panel */}
            {activeTab === "Invoice" && selectedInv && (
              <div className="w-105 shrink-0 flex flex-col overflow-hidden">
                <InvoiceDetailPanel inv={selectedInv} onClose={() => setSelectedInv(null)} />
              </div>
            )}

            {/* PO Detail Panel */}
            {activeTab === "Purchase Order" && selectedPo && (
              <div className="w-105 shrink-0 flex flex-col overflow-hidden">
                <PODetailPanel po={selectedPo} onClose={() => setSelectedPo(null)} />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default ViewDocuments;