import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FileText, Receipt, Search, CheckCircle, Clock, XCircle, IndianRupee } from "lucide-react";
import type { InvoiceData } from "../../../types/invoice";
import { getInvoiceMatchings, getInvoiceStats } from "../services/documentService";
import InvoiceList from "../components/list";
import InvoiceDetailPanel from "../components/detail_panel";
import { useDispatch, useSelector } from "react-redux";
import { type AppDispatch, type RootState } from "../../../app/store";
import { fetchUser } from "../../auth/slices/authSlice";
import Sidebar from "../../dashboard/components/sidebar";
import { Navigate } from "react-router-dom";
import { formatCurrency } from "../../../lib/formatCurrency";
import logger from "../../../utils/logger";

interface InvoiceStats {
  total_invoices: number;
  approved: number;
  pending: number;
  rejected: number;
  total_value: number;
}

export default function Invoices() {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);

  // ── InvoiceMatching rows (each row = one (invoice, PO) pair with decision embedded)
  const [matchings, setMatchings]             = useState<InvoiceData[]>([]);
  const [selectedMatching, setSelectedMatching] = useState<InvoiceData | null>(null);
  const [loading, setLoading]                 = useState(true);
  const [stats, setStats]                     = useState<InvoiceStats | null>(null);
  const [sidebarOpen, setSidebarOpen]         = useState(false);

  useEffect(() => {
    dispatch(fetchUser());
    const fetchData = async () => {
      try {
        const [matchingData, statsData] = await Promise.all([
          getInvoiceMatchings(),   // ← replaces filterInvoices()
          getInvoiceStats(),
        ]);
        setMatchings(matchingData);
        setStats(statsData);
      } catch (error) {
        logger.error("Failed to load invoice matchings", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Status lives on InvoiceMatching.status (pending/approved/reviewed/rejected)
  const handleStatusChange = (invoiceId: string, poId: string | null, newStatus: "approved" | "reviewed" | "rejected") => {
    const update = (m: InvoiceData) =>
      m.invoice_id === invoiceId && (poId === null || m.po_id === poId)
        ? { ...m, matching_status: newStatus }
        : m;
    setMatchings((prev) => prev.map(update));
    setSelectedMatching((prev) => (prev ? update(prev) : prev));
  };

  if (!user) return <Navigate to="/" />;

  const initials = user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 gap-3">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        <p className="text-sm text-gray-500">Loading invoices…</p>
      </div>
    );
  }

  const summaryCards = [
    {
      label: "Total Invoices",
      value: stats?.total_invoices ?? 0,
      icon: <FileText className="w-4 h-4" />,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Approved",
      value: stats?.approved ?? 0,
      icon: <CheckCircle className="w-4 h-4" />,
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Pending",
      value: stats?.pending ?? 0,
      icon: <Clock className="w-4 h-4" />,
      color: "bg-amber-50 text-amber-600",
    },
    {
      label: "Rejected",
      value: stats?.rejected ?? 0,
      icon: <XCircle className="w-4 h-4" />,
      color: "bg-red-50 text-red-600",
    },
    {
      label: "Invoice Value",
      value: formatCurrency(stats?.total_value ?? 0),
      icon: <IndianRupee className="w-4 h-4" />,
      color: "bg-violet-50 text-violet-600",
    },
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} user={{ ...user, initials }} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
                <Receipt className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-base font-semibold text-gray-800">Invoices</h1>
                <p className="text-xs text-gray-400">Manage and review invoice matchings</p>
              </div>
            </div>
          </div>
          <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">
            {matchings.length} matching{matchings.length !== 1 ? "s" : ""}
          </span>
        </header>

        <main className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 min-h-0">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 shrink-0">
            {summaryCards.map((card) => (
              <div key={card.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400">{card.label}</span>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${card.color}`}>
                    {card.icon}
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-800">{card.value}</p>
              </div>
            ))}
          </div>

          {/* Split layout */}
          <div className="flex gap-4 flex-1 min-h-0">
            {/* Matching List */}
            <div className="w-96 shrink-0 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-gray-100 bg-blue-600">
                <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-lg">
                  <Search className="w-3.5 h-3.5 text-white/70" />
                  <span className="text-sm font-semibold text-white">Invoice Matchings</span>
                  <span className="ml-auto text-xs text-blue-200 font-medium">{matchings.length}</span>
                </div>
              </div>
              <InvoiceList
                invoices={matchings}
                selectedId={selectedMatching?.invoice_id ?? null}
                selectedPoId={selectedMatching?.po_id ?? null}
                onSelect={(m) =>
                  setSelectedMatching((prev) =>
                    prev?.invoice_id === m.invoice_id && prev?.po_id === m.po_id ? null : m
                  )
                }
                onStatusChange={handleStatusChange}
              />
            </div>

            {/* Detail Panel */}
            <div className="flex-1 min-w-0">
              <AnimatePresence mode="wait">
                {selectedMatching ? (
                  <motion.div
                    key={`${selectedMatching.invoice_id}-${selectedMatching.po_id}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="h-full bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
                  >
                    <InvoiceDetailPanel
                      invoice={selectedMatching}
                      onClose={() => setSelectedMatching(null)}
                      onStatusChange={handleStatusChange}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="h-full flex flex-col items-center justify-center bg-white rounded-xl border border-gray-100 shadow-sm"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mb-4 shadow-sm">
                      <FileText className="w-7 h-7 text-white" />
                    </div>
                    <p className="text-sm font-semibold text-gray-700">Select a matching to view details</p>
                    <p className="text-xs text-gray-400 mt-1">Click any invoice from the list on the left</p>
                    <div className="flex flex-wrap items-center justify-center gap-2 mt-5 max-w-xs">
                      {["Invoice Details", "Vendor Info", "File Preview", "Upload History", "AI Result"].map((f) => (
                        <span key={f} className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">{f}</span>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}