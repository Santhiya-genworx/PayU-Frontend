import { useState, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FileText, Receipt, CheckCircle, Clock, XCircle, IndianRupee,
  Search, SlidersHorizontal, ChevronLeft, ChevronRight,
  Eye, Download, CheckCircle2, AlertTriangle, XCircle as XCircleIcon,
  LinkIcon, RefreshCw,
} from "lucide-react";
import type { InvoiceData } from "../../../types/invoice";
import { getInvoiceMatchings, getInvoiceStats, approveInvoice, reviewInvoice, rejectInvoice } from "../services/documentService";
import InvoiceDetailPanel, { DecisionDetailModal } from "../components/detail_panel";
import { useDispatch, useSelector } from "react-redux";
import { type AppDispatch, type RootState } from "../../../app/store";
import { fetchUser } from "../../auth/slices/authSlice";
import Sidebar from "../../dashboard/components/sidebar";
import { Navigate } from "react-router-dom";
import { formatCurrency } from "../../../lib/formatCurrency";
import logger from "../../../utils/logger";
import FileViewer from "../components/file_viewer";
import type { AxiosError } from "axios";

interface InvoiceStats {
  total_invoices: number;
  approved: number;
  pending: number;
  rejected: number;
  total_value: number;
}

interface ApiErrorResponse {
  message?: string;
}

function extractErrorMessage(err: unknown, fallback: string): string {
  const axiosErr = err as AxiosError<ApiErrorResponse>;
  return axiosErr?.response?.data?.message ?? axiosErr?.message ?? fallback;
}

// ── Matching Status Badge ─────────────────────────────────────────────────────
function MatchingStatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    approved: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Approved" },
    approve:  { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Approve"  },
    pending:  { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-400",   label: "Pending"  },
    reviewed: { bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-500",    label: "Reviewed" },
    review:   { bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-500",    label: "Review"   },
    rejected: { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-500",     label: "Rejected" },
    reject:   { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-500",     label: "Reject"   },
  };
  const c = cfg[status] ?? cfg["pending"];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

// ── Confirm Approve Modal ────────────────────────────────────────────────────
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

// ── Change Status Modal ───────────────────────────────────────────────────────
type ChangeableStatus = "approved" | "reviewed" | "rejected";

function ChangeStatusModal({ invoice, onConfirm, onCancel }: {
  invoice: InvoiceData;
  onConfirm: (newStatus: ChangeableStatus, fields: { mail_to: string; mail_subject: string; mail_body: string; command: string }) => void;
  onCancel: () => void;
}) {
  const statuses: { key: ChangeableStatus; label: string; icon: React.ReactNode; activeClass: string }[] = [
    { key: "approved", label: "Approve", icon: <CheckCircle2 className="w-3.5 h-3.5" />, activeClass: "bg-emerald-600 text-white border-emerald-600" },
    { key: "reviewed", label: "Review",  icon: <AlertTriangle className="w-3.5 h-3.5" />, activeClass: "bg-blue-600 text-white border-blue-600" },
    { key: "rejected", label: "Reject",  icon: <XCircleIcon className="w-3.5 h-3.5" />,  activeClass: "bg-red-500 text-white border-red-500"     },
  ];

  // Show AI decision as "Current" and display the other 2 statuses to choose from
  const decisionKey = invoice.decision === "approve" ? "approved" : invoice.decision === "review" ? "reviewed" : invoice.decision === "reject" ? "rejected" : null;
  const decisionLabel = invoice.decision ?? "pending";
  const availableStatuses = statuses.filter(s => s.key !== decisionKey);
  const defaultStatus = availableStatuses[0]?.key ?? "approved";

  const [selected, setSelected] = useState<ChangeableStatus>(defaultStatus);
  const [command, setCommand]       = useState(invoice.command ?? "");
  const [mailTo, setMailTo]         = useState(invoice.mail_to ?? "");
  const [mailSubject, setMailSubject] = useState(invoice.mail_subject ?? "");
  const [mailBody, setMailBody]     = useState(invoice.mail_body ?? "");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");

  const handleSubmit = async () => {
    setLoading(true); setError("");
    try {
      const overrides = {
        ...(mailTo      ? { mail_to: mailTo }           : {}),
        ...(mailSubject ? { mail_subject: mailSubject } : {}),
        ...(mailBody    ? { mail_body: mailBody }       : {}),
      };
      if (selected === "approved") await approveInvoice(invoice.invoice_id);
      else if (selected === "reviewed") await reviewInvoice(invoice.invoice_id, overrides);
      else await rejectInvoice(invoice.invoice_id, overrides);
      onConfirm(selected, { mail_to: mailTo, mail_subject: mailSubject, mail_body: mailBody, command });
    } catch (err: unknown) {
      setError(extractErrorMessage(err, "Failed to update status."));
      setLoading(false);
    }
  };

  const inputCls = "w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-400 transition-all";
  const labelCls = "text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-blue-600 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Change Status</p>
              <p className="text-[11px] text-blue-200 font-mono">{invoice.invoice_id}</p>
            </div>
          </div>
          <button onClick={onCancel} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
            <XCircleIcon className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
            <span className="text-gray-400">Decision:</span>
            <MatchingStatusBadge status={decisionLabel} />
          </div>

          <div>
            <label className={labelCls}>Select New Status</label>
            <div className="flex items-center gap-2">
              {availableStatuses.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setSelected(s.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all
                    ${selected === s.key ? s.activeClass : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}
                >
                  {s.icon}{s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Command</label>
            <textarea value={command} onChange={(e) => setCommand(e.target.value)} rows={2}
              className={`${inputCls} resize-none font-mono`} placeholder="Optional command…" />
          </div>
          <div>
            <label className={labelCls}>Mail To</label>
            <input value={mailTo} onChange={(e) => setMailTo(e.target.value)} className={inputCls} placeholder="recipient@example.com" />
          </div>
          <div>
            <label className={labelCls}>Mail Subject</label>
            <input value={mailSubject} onChange={(e) => setMailSubject(e.target.value)} className={inputCls} placeholder="Subject…" />
          </div>
          <div>
            <label className={labelCls}>Mail Body</label>
            <textarea value={mailBody} onChange={(e) => setMailBody(e.target.value)} rows={4}
              className={`${inputCls} resize-none`} placeholder="Message body…" />
          </div>

          {error && <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex items-center gap-2.5 shrink-0">
          <button onClick={onCancel} className="flex-1 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
            {loading ? "Updating…" : "Apply Status"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── File View Modal ───────────────────────────────────────────────────────────
function FileViewModal({ invoice, onClose }: { invoice: InvoiceData; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-blue-600 shrink-0">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-white" />
            <p className="text-sm font-bold text-white font-mono">{invoice.invoice_id}</p>
            <span className="text-blue-200 text-xs">· {invoice.vendor?.name}</span>
          </div>
          <div className="flex items-center gap-2">
            {invoice.file_url && (
              <a
                href={invoice.file_url}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Download
              </a>
            )}
            <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
              <XCircleIcon className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <FileViewer
            fileUrl={invoice.file_url}
            id={invoice.invoice_id}
            vendor={invoice.vendor?.name ?? ""}
            date={invoice.invoice_date ?? ""}
          />
        </div>
      </motion.div>
    </div>
  );
}

const PAGE_SIZE = 10;

export default function Invoices() {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);

  const [matchings, setMatchings]               = useState<InvoiceData[]>([]);
  const [selectedMatching, setSelectedMatching] = useState<InvoiceData | null>(null);
  const [loading, setLoading]                   = useState(true);
  const [stats, setStats]                       = useState<InvoiceStats | null>(null);
  const [sidebarOpen, setSidebarOpen]           = useState(false);

  // Table controls
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage]                 = useState(1);

  // Modals
  const [fileViewInvoice, setFileViewInvoice]     = useState<InvoiceData | null>(null);
  const [confirmApprove, setConfirmApprove]       = useState<InvoiceData | null>(null);
  const [decisionModal, setDecisionModal]         = useState<{ row: InvoiceData; type: "review" | "reject" } | null>(null);
  const [changeStatusInvoice, setChangeStatusInvoice] = useState<InvoiceData | null>(null);

  useEffect(() => {
    dispatch(fetchUser());
    const fetchData = async () => {
      try {
        const [matchingData, statsData] = await Promise.all([
          getInvoiceMatchings(),
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

  // Update both matchings and stats in sync
  const handleStatusChange = (invoiceId: string, poId: string | null, newStatus: "approved" | "reviewed" | "rejected") => {
    const oldRow = matchings.find(
      (m) => m.invoice_id === invoiceId && (poId === null || m.po_id === poId)
    );
    const oldStatus = oldRow?.matching_status ?? "pending";

    const update = (m: InvoiceData) =>
      m.invoice_id === invoiceId && (poId === null || m.po_id === poId)
        ? { ...m, matching_status: newStatus }
        : m;

    setMatchings((prev) => prev.map(update));
    setSelectedMatching((prev) => (prev ? update(prev) : prev));

    // Live stats update
    if (oldStatus !== newStatus) {
      setStats((prev) => {
        if (!prev) return prev;
        const s = { ...prev };
        // Decrement old bucket
        if (oldStatus === "approved")  s.approved  = Math.max(0, s.approved  - 1);
        if (oldStatus === "pending")   s.pending   = Math.max(0, s.pending   - 1);
        if (oldStatus === "reviewed")  s.pending   = Math.max(0, s.pending   - 1); // reviewed was counted as pending? adjust as needed
        if (oldStatus === "rejected")  s.rejected  = Math.max(0, s.rejected  - 1);
        // Increment new bucket
        if (newStatus === "approved")  s.approved  = s.approved  + 1;
        if (newStatus === "reviewed")  s.pending   = Math.max(0, s.pending   - 1); // still not rejected/approved
        if (newStatus === "rejected")  s.rejected  = s.rejected  + 1;
        return s;
      });
    }
  };

  const filtered = useMemo(() => {
    return matchings.filter((inv) => {
      const matchSearch = !search ||
        inv.invoice_id.toLowerCase().includes(search.toLowerCase()) ||
        inv.vendor?.name?.toLowerCase().includes(search.toLowerCase()) ||
        (inv.po_id ?? "").toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || inv.matching_status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [matchings, search, statusFilter]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
    { label: "Total Invoices", value: stats?.total_invoices ?? 0,           icon: <FileText className="w-4 h-4" />,    color: "bg-blue-50 text-blue-600"     },
    { label: "Approved",       value: stats?.approved ?? 0,                  icon: <CheckCircle className="w-4 h-4" />, color: "bg-emerald-50 text-emerald-600"},
    { label: "Pending",        value: stats?.pending ?? 0,                   icon: <Clock className="w-4 h-4" />,       color: "bg-amber-50 text-amber-600"   },
    { label: "Rejected",       value: stats?.rejected ?? 0,                  icon: <XCircle className="w-4 h-4" />,     color: "bg-red-50 text-red-600"       },
    { label: "Invoice Value",  value: formatCurrency(stats?.total_value ?? 0), icon: <IndianRupee className="w-4 h-4" />, color: "bg-violet-50 text-violet-600" },
  ];

  const statusConfig = [
    { key: "all",      label: "All",      count: matchings.length                                                 },
    { key: "approved", label: "Approved", count: matchings.filter(i => i.matching_status === "approved").length  },
    { key: "pending",  label: "Pending",  count: matchings.filter(i => i.matching_status === "pending").length   },
    { key: "reviewed", label: "Reviewed", count: matchings.filter(i => i.matching_status === "reviewed").length  },
    { key: "rejected", label: "Rejected", count: matchings.filter(i => i.matching_status === "rejected").length  },
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

          {/* Invoice Table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">

            {/* Table toolbar */}
            <div className="px-5 py-3 border-b border-gray-100 bg-blue-600 shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-white" />
                  <span className="text-sm font-semibold text-white">Invoice Matchings</span>
                  <span className="text-xs text-blue-200 font-medium ml-1">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-300" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search invoice, vendor, PO…"
                    className="pl-8 pr-3 py-1.5 text-xs bg-white/15 text-white placeholder:text-blue-300 rounded-lg border border-white/20 focus:outline-none focus:ring-1 focus:ring-white/40 w-56"
                  />
                </div>
              </div>
            </div>

            {/* Status filters */}
            <div className="px-5 py-2.5 border-b border-gray-100 bg-gray-50/50 flex items-center gap-1.5 flex-wrap shrink-0">
              <SlidersHorizontal className="w-3 h-3 text-gray-400 mr-0.5 shrink-0" />
              {statusConfig.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setStatusFilter(s.key)}
                  className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-all
                    ${statusFilter === s.key ? "bg-blue-600 text-white shadow-sm" : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"}`}
                >
                  {s.label}
                  <span className={`text-[10px] px-1 rounded font-semibold ${statusFilter === s.key ? "bg-white/25 text-white" : "bg-gray-100 text-gray-400"}`}>{s.count}</span>
                </button>
              ))}
            </div>

            {/* Table body */}
            <div className="flex-1 overflow-auto min-h-0">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Invoice ID</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Date</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap w-px">PO Ref</th>
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Amount</th>
                    <th className="text-center px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Status</th>
                    <th className="text-center px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Actions</th>
                    <th className="text-center px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">File</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-16 text-gray-400">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                            <FileText className="w-5 h-5 opacity-40" />
                          </div>
                          <p className="text-xs font-medium">No matchings found</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginated.map((inv, idx) => {
                      const isPending      = inv.matching_status === "pending";
                      const showDecisionBtn = isPending && !!inv.decision;

                      return (
                        <motion.tr
                          key={`${inv.invoice_id}-${inv.po_id ?? "nopo"}`}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.02 }}
                          className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors group cursor-pointer"
                          onClick={() =>
                            setSelectedMatching((prev) =>
                              prev?.invoice_id === inv.invoice_id && prev?.po_id === inv.po_id ? null : inv
                            )
                          }
                        >
                          {/* Invoice ID */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center shrink-0 transition-colors">
                                <Receipt className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-500" />
                              </div>
                              <span className="font-mono font-bold text-gray-800">{inv.invoice_id}</span>
                            </div>
                          </td>

                          {/* Date */}
                          <td className="px-4 py-3">
                            <span className="text-gray-500">{inv.invoice_date ?? "—"}</span>
                          </td>

                          {/* PO Ref */}
                          <td className="px-4 py-3 w-px whitespace-nowrap">
                            {inv.po_id ? (
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 flex items-center gap-1">
                                  <LinkIcon className="w-2.5 h-2.5" />{inv.po_id}
                                </span>
                                {!inv.is_po_matched && (
                                  <span className="text-[10px] font-semibold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded">Unmatched</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>

                          {/* Amount */}
                          <td className="px-4 py-3 text-right">
                            <span className="font-bold text-gray-800">{formatCurrency(inv.total_amount, inv.currency_code)}</span>
                          </td>

                          {/* Status — own column */}
                          <td className="px-4 py-3 text-center">
                            <MatchingStatusBadge status={inv.matching_status ?? "pending"} />
                          </td>

                          {/* Actions — own column: only shown for pending invoices */}
                          <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                            {isPending ? (
                              <div className="flex flex-row items-center justify-center gap-1.5">
                                {/* Specific decision button based on AI decision */}
                                {showDecisionBtn && (
                                  <>
                                    {inv.decision === "approve" && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setConfirmApprove(inv); }}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md bg-emerald-600 hover:bg-emerald-700 text-white transition-colors whitespace-nowrap"
                                      >
                                        <CheckCircle2 className="w-3 h-3 shrink-0" /> Approve
                                      </button>
                                    )}
                                    {inv.decision === "review" && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setDecisionModal({ row: inv, type: "review" }); }}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md bg-amber-500 hover:bg-amber-600 text-white transition-colors whitespace-nowrap"
                                      >
                                        <AlertTriangle className="w-3 h-3 shrink-0" /> Review
                                      </button>
                                    )}
                                    {inv.decision === "reject" && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setDecisionModal({ row: inv, type: "reject" }); }}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md bg-red-500 hover:bg-red-600 text-white transition-colors whitespace-nowrap"
                                      >
                                        <XCircleIcon className="w-3 h-3 shrink-0" /> Reject
                                      </button>
                                    )}
                                  </>
                                )}
                                {/* Change Status — always shown for pending */}
                                <button
                                  onClick={(e) => { e.stopPropagation(); setChangeStatusInvoice(inv); }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md bg-gray-100 hover:bg-blue-100 text-gray-600 hover:text-blue-700 border border-gray-200 hover:border-blue-300 transition-colors whitespace-nowrap"
                                >
                                  <RefreshCw className="w-3 h-3 shrink-0" /> Change Status
                                </button>
                              </div>
                            ) : (
                              <span className="text-gray-300 text-[11px]">—</span>
                            )}
                          </td>

                          {/* File view / download — always show both buttons */}
                          <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={(e) => { e.stopPropagation(); setFileViewInvoice(inv); }}
                                title="View File"
                                className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-600 transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <a
                                href={inv.file_url ?? "#"}
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => { e.stopPropagation(); if (!inv.file_url) e.preventDefault(); }}
                                title="Download File"
                                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${inv.file_url ? "bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-700" : "bg-gray-50 text-gray-300 cursor-not-allowed"}`}
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/40 shrink-0">
              <p className="text-xs text-gray-400">
                Showing{" "}
                <span className="font-semibold text-gray-600">
                  {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}
                </span>{" "}
                of <span className="font-semibold text-gray-600">{filtered.length}</span>
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white text-gray-500 transition-all"
                >
                  <ChevronLeft className="w-3 h-3" /> Prev
                </button>
                <div className="flex items-center gap-0.5">
                  {(() => {
                    const pages: number[] = [];
                    if (totalPages <= 7) {
                      for (let i = 1; i <= totalPages; i++) pages.push(i);
                    } else {
                      pages.push(1);
                      if (page > 3) pages.push(-1); // ellipsis
                      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
                      if (page < totalPages - 2) pages.push(-2); // ellipsis
                      pages.push(totalPages);
                    }
                    return pages.map((p, i) =>
                      p < 0 ? (
                        <span key={`ellipsis-${i}`} className="w-7 h-7 flex items-center justify-center text-xs text-gray-300">…</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`w-7 h-7 text-xs font-semibold rounded-md transition-all ${page === p ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-100"}`}
                        >
                          {p}
                        </button>
                      )
                    );
                  })()}
                </div>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white text-gray-500 transition-all"
                >
                  Next <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Detail Side Panel (slides in from right over main content) */}
      <AnimatePresence>
        {selectedMatching && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 bg-black/20"
              onClick={() => setSelectedMatching(null)}
            />
            <motion.div
              key="panel"
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 60 }}
              transition={{ duration: 0.2 }}
              className="fixed right-0 top-0 h-full w-[480px] z-40 shadow-2xl"
            >
              <InvoiceDetailPanel
                invoice={selectedMatching}
                onClose={() => setSelectedMatching(null)}
                onStatusChange={handleStatusChange}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {fileViewInvoice && (
          <FileViewModal
            invoice={fileViewInvoice}
            onClose={() => setFileViewInvoice(null)}
          />
        )}
        {changeStatusInvoice && (
          <ChangeStatusModal
            invoice={changeStatusInvoice}
            onConfirm={(newStatus) => {
              handleStatusChange(changeStatusInvoice.invoice_id, changeStatusInvoice.po_id ?? null, newStatus);
              setChangeStatusInvoice(null);
            }}
            onCancel={() => setChangeStatusInvoice(null)}
          />
        )}
        {confirmApprove && (
          <ConfirmApproveModal
            invoiceId={confirmApprove.invoice_id}
            onConfirm={() => {
              handleStatusChange(confirmApprove.invoice_id, confirmApprove.po_id ?? null, "approved");
              setConfirmApprove(null);
            }}
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
              handleStatusChange(invoiceId, decisionModal.row.po_id ?? null, newStatus as "reviewed" | "rejected");
              setDecisionModal(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}