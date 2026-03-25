import { useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search, FileText, SlidersHorizontal, ChevronLeft, ChevronRight,
  Receipt, CheckCircle2, AlertTriangle, XCircle, LinkIcon,
} from "lucide-react";
import type { AxiosError } from "axios";
import type { InvoiceData } from "../../../types/invoice";
import { formatCurrency } from "../../../lib/formatCurrency";
import { approveInvoice } from "../services/documentService";
import { DecisionDetailModal } from "./detail_panel";

// ── Typed error helper ────────────────────────────────────────────────────────
interface ApiErrorResponse {
  message?: string;
}

function extractErrorMessage(err: unknown, fallback: string): string {
  const axiosErr = err as AxiosError<ApiErrorResponse>;
  return axiosErr?.response?.data?.message ?? axiosErr?.message ?? fallback;
}

// ── Matching status badge (pending/approved/reviewed/rejected) ─────────────────
function MatchingStatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    approved: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Approved" },
    pending:  { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-400",   label: "Pending"  },
    reviewed: { bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-500",    label: "Reviewed" },
    rejected: { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-500",     label: "Rejected" },
  };
  const c = cfg[status] ?? cfg["pending"];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

// ── Confirm Approve Modal ─────────────────────────────────────────────────────
function ConfirmApproveModal({ invoiceId, onConfirm, onCancel }: {
  invoiceId: string; onConfirm: () => void; onCancel: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handleConfirm = async () => {
    setLoading(true); setError("");
    try {
      await approveInvoice(invoiceId);
      onConfirm();
    } catch (err: unknown) {
      setError(extractErrorMessage(err, "Approval failed."));
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
        <div className="px-5 py-5 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
          <p className="text-sm font-bold text-gray-800 mb-1">Approve Invoice?</p>
          <p className="text-xs text-gray-500">Approving <span className="font-mono font-semibold text-gray-700">{invoiceId}</span> will allow payment processing.</p>
          {error && <p className="mt-2 text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2 w-full">{error}</p>}
        </div>
        <div className="px-5 pb-5 flex items-center gap-2.5">
          <button onClick={onCancel} disabled={loading} className="flex-1 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={handleConfirm} disabled={loading} className="flex-1 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
            {loading ? "Approving…" : "Yes, Approve"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main List ─────────────────────────────────────────────────────────────────
interface Props {
  invoices: InvoiceData[];
  selectedId: string | null;
  selectedPoId: string | null;
  onSelect: (inv: InvoiceData) => void;
  onStatusChange?: (invoiceId: string, poId: string | null, newStatus: "approved" | "reviewed" | "rejected") => void;
}

const PAGE_SIZE = 10;

export default function InvoiceList({ invoices, selectedId, selectedPoId, onSelect, onStatusChange }: Props) {
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage]                 = useState(1);
  const [confirmApprove, setConfirmApprove] = useState<InvoiceData | null>(null);
  const [decisionModal, setDecisionModal]   = useState<{ row: InvoiceData; type: "review" | "reject" } | null>(null);

  const filtered = useMemo(() => {
    setPage(1);
    return invoices.filter((inv) => {
      const matchSearch = !search ||
        inv.invoice_id.toLowerCase().includes(search.toLowerCase()) ||
        inv.vendor?.name?.toLowerCase().includes(search.toLowerCase()) ||
        (inv.po_id ?? "").toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || inv.matching_status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [invoices, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleApproveConfirmed = (row: InvoiceData) => {
    setConfirmApprove(null);
    onStatusChange?.(row.invoice_id, row.po_id ?? null, "approved");
  };

  const statusConfig = [
    { key: "all",      label: "All",      count: invoices.length },
    { key: "approved", label: "Approved", count: invoices.filter(i => i.matching_status === "approved").length },
    { key: "pending",  label: "Pending",  count: invoices.filter(i => i.matching_status === "pending").length  },
    { key: "reviewed", label: "Reviewed", count: invoices.filter(i => i.matching_status === "reviewed").length },
    { key: "rejected", label: "Rejected", count: invoices.filter(i => i.matching_status === "rejected").length },
  ];

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="p-3 space-y-2.5 border-b border-gray-100 bg-gray-50/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by invoice, vendor, PO…"
              className="w-full pl-8 pr-3 py-2 text-xs bg-white rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-400 transition-all placeholder:text-gray-400" />
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <SlidersHorizontal className="w-3 h-3 text-gray-400 mr-0.5 shrink-0" />
            {statusConfig.map((s) => (
              <button key={s.key} onClick={() => setStatusFilter(s.key)}
                className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-all
                  ${statusFilter === s.key ? "bg-blue-600 text-white shadow-sm" : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"}`}>
                {s.label}
                <span className={`text-[10px] px-1 rounded font-semibold ${statusFilter === s.key ? "bg-white/25 text-white" : "bg-gray-100 text-gray-400"}`}>{s.count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 py-1.5 text-[11px] text-gray-400 border-b border-gray-100 bg-gray-50/30">
          {filtered.length} matching{filtered.length !== 1 ? "s" : ""} · page {page}/{totalPages}
        </div>

        <div className="flex-1 overflow-y-auto">
          <AnimatePresence>
            {paginated.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16 text-gray-400">
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mb-2"><FileText className="w-5 h-5 opacity-40" /></div>
                <p className="text-xs font-medium">No matchings found</p>
              </motion.div>
            )}

            {paginated.map((inv, idx) => {
              const isSelected = selectedId === inv.invoice_id && selectedPoId === (inv.po_id ?? null);
              const showActions = inv.matching_status === "pending";

              return (
                <motion.div key={`${inv.invoice_id}-${inv.po_id ?? "nopo"}`} layout
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  transition={{ delay: idx * 0.025 }}
                  className={`border-b border-gray-50 transition-colors group ${isSelected ? "bg-blue-50 border-l-2 border-l-blue-500" : "hover:bg-gray-50/60"}`}>

                  <button onClick={() => onSelect(inv)} className="w-full text-left px-4 pt-3.5 pb-2">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${isSelected ? "bg-blue-100" : "bg-gray-100 group-hover:bg-blue-50"}`}>
                          <Receipt className={`w-3.5 h-3.5 ${isSelected ? "text-blue-600" : "text-gray-400 group-hover:text-blue-500"}`} />
                        </div>
                        <span className="text-xs font-bold text-gray-800 font-mono truncate">{inv.invoice_id}</span>
                      </div>
                      <MatchingStatusBadge status={inv.matching_status ?? "pending"} />
                    </div>

                    <p className="text-xs text-gray-500 mb-1.5 ml-9 truncate">{inv.vendor?.name}</p>

                    <div className="flex items-center justify-between ml-9">
                      <span className="text-[11px] text-gray-400">{inv.invoice_date}</span>
                      <span className="text-xs font-bold text-gray-800">{formatCurrency(inv.total_amount, inv.currency_code)}</span>
                    </div>

                    <div className="ml-9 mt-1 flex items-center gap-1.5 flex-wrap">
                      {inv.po_id && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 text-gray-400 flex items-center gap-1">
                          <LinkIcon className="w-2.5 h-2.5" />
                          {inv.po_id}
                        </span>
                      )}
                      {inv.po_id && !inv.is_po_matched && (
                        <span className="text-[10px] font-semibold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded">Not Matched</span>
                      )}
                    </div>
                  </button>

                  {showActions && (
                    <div className="px-4 pb-3 ml-9 flex items-center gap-1.5">
                      {inv.decision === "approve" && (
                        <button onClick={(e) => { e.stopPropagation(); setConfirmApprove(inv); }}
                          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md bg-emerald-600 hover:bg-emerald-700 text-white transition-colors">
                          <CheckCircle2 className="w-3 h-3" /> Approve
                        </button>
                      )}
                      {inv.decision === "review" && (
                        <button onClick={(e) => { e.stopPropagation(); setDecisionModal({ row: inv, type: "review" }); }}
                          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md bg-amber-500 hover:bg-amber-600 text-white transition-colors">
                          <AlertTriangle className="w-3 h-3" /> Review
                        </button>
                      )}
                      {inv.decision === "reject" && (
                        <button onClick={(e) => { e.stopPropagation(); setDecisionModal({ row: inv, type: "reject" }); }}
                          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md bg-red-500 hover:bg-red-600 text-white transition-colors">
                          <XCircle className="w-3 h-3" /> Reject
                        </button>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 bg-gray-50/40">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white text-gray-500 transition-all">
              <ChevronLeft className="w-3 h-3" /> Prev
            </button>
            <div className="flex items-center gap-0.5">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)} className={`w-6 h-6 text-xs font-semibold rounded-md transition-all ${page === p ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-100"}`}>{p}</button>
              ))}
            </div>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white text-gray-500 transition-all">
              Next <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {confirmApprove && (
          <ConfirmApproveModal
            invoiceId={confirmApprove.invoice_id}
            onConfirm={() => handleApproveConfirmed(confirmApprove)}
            onCancel={() => setConfirmApprove(null)}
          />
        )}
        {decisionModal && (
          <DecisionDetailModal
            invoiceId={decisionModal.row.invoice_id}
            type={decisionModal.type}
            invoiceRow={decisionModal.row}
            onClose={() => setDecisionModal(null)}
            onStatusChange={(invoiceId, newStatus) => {
              onStatusChange?.(invoiceId, decisionModal.row.po_id ?? null, newStatus as "reviewed" | "rejected");
              setDecisionModal(null);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}