import { useState, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FileText, Receipt, CheckCircle, Clock, XCircle, IndianRupee,
  Search, SlidersHorizontal, ChevronLeft, ChevronRight,
  Eye, Download, CheckCircle2, AlertTriangle, XCircle as XCircleIcon,
  RefreshCw, Users, Layers,
} from "lucide-react";
import type { InvoiceData } from "../../../types/invoice";
import {
  groupInvoiceId, groupTotalAmount, groupCurrencyCode,
  groupInvoiceDate, groupVendorName, 
} from "../../../types/invoice";
import {
  getInvoiceMatchings, getInvoiceStats,
  approveInvoice, reviewInvoice, rejectInvoice,
} from "../services/documentService";
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

// ── PO Match Status Badge ──────────────────────────────────────────────────────
function PoMatchBadge({ value, hasPo }: { value: boolean | null; hasPo: boolean }) {
  if (!hasPo)
    return <span className="text-gray-300">—</span>;

  if (value !== true)
    return (
      <span className="text-[10px] font-semibold text-orange-500 bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded">
        Waiting POs
      </span>
    );

  return (
    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">
      Matched
    </span>
  );
}

// ── Group Pills: compact list of invoice/PO ids ───────────────────────────────
function IdPillList({
  ids,
  colorClass,
  max = 2,
}: {
  ids: string[];
  colorClass: string;
  max?: number;
}) {
  const visible = ids.slice(0, max);
  const overflow = ids.length - max;
  return (
    <div className="flex flex-wrap gap-1 items-center">
      {visible.map((id) => (
        <span
          key={id}
          className={`inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded ${colorClass}`}
        >
          {id}
        </span>
      ))}
      {overflow > 0 && (
        <span className="text-[10px] text-gray-400 font-semibold">+{overflow}</span>
      )}
    </div>
  );
}

// ── Confirm Approve Modal ─────────────────────────────────────────────────────
function ConfirmApproveModal({
  group,
  onConfirm,
  onCancel,
}: {
  group: InvoiceData;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  // Use first invoice_id in the group for the approve API call
  const representativeId = groupInvoiceId(group);

  const handleConfirm = async () => {
    setLoading(true); setError("");
    try {
      await approveInvoice(representativeId);
      onConfirm();
    } catch (err: unknown) {
      setError(extractErrorMessage(err, "Approval failed."));
      setLoading(false);
    }
  };

  const invoiceIds  = group.invoice_ids ?? (group.invoice_id ? [group.invoice_id] : []);
  const poIds       = group.po_ids ?? (group.po_id ? [group.po_id] : []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden"
      >
        <div className="px-5 py-5 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
          <p className="text-sm font-bold text-gray-800 mb-1">Approve Matching Group?</p>
          <p className="text-xs text-gray-500 mb-3">
            Approving this group will allow payment processing for all invoices below.
          </p>
          {/* Show all invoice IDs in the group */}
          <div className="w-full bg-gray-50 rounded-lg px-3 py-2 mb-1 text-left space-y-1.5">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Invoices</p>
            <div className="flex flex-wrap gap-1">
              {invoiceIds.map((id) => (
                <span key={id} className="font-mono text-[11px] font-semibold text-gray-700 bg-white border border-gray-200 px-1.5 py-0.5 rounded">
                  {id}
                </span>
              ))}
            </div>
            {poIds.length > 0 && (
              <>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-1.5">POs</p>
                <div className="flex flex-wrap gap-1">
                  {poIds.map((id) => (
                    <span key={id} className="font-mono text-[11px] text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded">
                      {id}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
          {error && (
            <p className="mt-2 text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2 w-full">
              {error}
            </p>
          )}
        </div>
        <div className="px-5 pb-5 flex items-center gap-2.5">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Approving…" : "Yes, Approve"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Change Status Modal ───────────────────────────────────────────────────────
type ChangeableStatus = "approved" | "reviewed" | "rejected";

function ChangeStatusModal({
  group,
  onConfirm,
  onCancel,
}: {
  group: InvoiceData;
  onConfirm: (newStatus: ChangeableStatus, fields: { mail_to: string; mail_subject: string; mail_body: string; command: string }) => void;
  onCancel: () => void;
}) {
  const statuses: { key: ChangeableStatus; label: string; icon: React.ReactNode; activeClass: string }[] = [
    { key: "approved", label: "Approve", icon: <CheckCircle2 className="w-3.5 h-3.5" />, activeClass: "bg-emerald-600 text-white border-emerald-600" },
    { key: "reviewed", label: "Review",  icon: <AlertTriangle className="w-3.5 h-3.5" />, activeClass: "bg-blue-600 text-white border-blue-600" },
    { key: "rejected", label: "Reject",  icon: <XCircleIcon className="w-3.5 h-3.5" />,  activeClass: "bg-red-500 text-white border-red-500"     },
  ];

  const decisionKey =
    group.decision === "approve" ? "approved"
    : group.decision === "review" ? "reviewed"
    : group.decision === "reject" ? "rejected"
    : null;
  const decisionLabel    = group.decision ?? "pending";
  const availableStatuses = statuses.filter((s) => s.key !== decisionKey);
  const defaultStatus     = availableStatuses[0]?.key ?? "approved";

  const [selected, setSelected]         = useState<ChangeableStatus>(defaultStatus);
  const [command, setCommand]           = useState(group.command ?? "");
  const [mailTo, setMailTo]             = useState(group.mail_to ?? "");
  const [mailSubject, setMailSubject]   = useState(group.mail_subject ?? "");
  const [mailBody, setMailBody]         = useState(group.mail_body ?? "");
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");

  // Use first invoice_id in the group for API calls
  const representativeId = groupInvoiceId(group);

  const handleSubmit = async () => {
    setLoading(true); setError("");
    try {
      const overrides = {
        ...(mailTo      ? { mail_to: mailTo }           : {}),
        ...(mailSubject ? { mail_subject: mailSubject } : {}),
        ...(mailBody    ? { mail_body: mailBody }       : {}),
      };
      if (selected === "approved")      await approveInvoice(representativeId);
      else if (selected === "reviewed") await reviewInvoice(representativeId, overrides);
      else                              await rejectInvoice(representativeId, overrides);
      onConfirm(selected, { mail_to: mailTo, mail_subject: mailSubject, mail_body: mailBody, command });
    } catch (err: unknown) {
      setError(extractErrorMessage(err, "Failed to update status."));
      setLoading(false);
    }
  };

  const inputCls = "w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-400 transition-all";
  const labelCls = "text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1";

  const invoiceIds = group.invoice_ids ?? (group.invoice_id ? [group.invoice_id] : []);
  const poIds      = group.po_ids ?? (group.po_id ? [group.po_id] : []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-blue-600 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Change Group Status</p>
              <p className="text-[11px] text-blue-200">
                {invoiceIds.length} invoice{invoiceIds.length !== 1 ? "s" : ""}
                {poIds.length > 0 ? ` · ${poIds.length} PO${poIds.length !== 1 ? "s" : ""}` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <XCircleIcon className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Group summary */}
          <div className="bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-100 space-y-2">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Invoices</p>
              <div className="flex flex-wrap gap-1">
                {invoiceIds.map((id) => (
                  <span key={id} className="font-mono text-[11px] font-semibold text-gray-700 bg-white border border-gray-200 px-1.5 py-0.5 rounded">{id}</span>
                ))}
              </div>
            </div>
            {poIds.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">POs</p>
                <div className="flex flex-wrap gap-1">
                  {poIds.map((id) => (
                    <span key={id} className="font-mono text-[11px] text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded">{id}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
            <span className="text-gray-400">AI Decision:</span>
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
            <textarea
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              rows={2}
              className={`${inputCls} resize-none font-mono`}
              placeholder="Optional command…"
            />
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
            <textarea
              value={mailBody}
              onChange={(e) => setMailBody(e.target.value)}
              rows={4}
              className={`${inputCls} resize-none`}
              placeholder="Message body…"
            />
          </div>
          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex items-center gap-2.5 shrink-0">
          <button
            onClick={onCancel}
            className="flex-1 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Updating…" : "Apply Status"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── File View Modal ───────────────────────────────────────────────────────────
function FileViewModal({ group, onClose }: { group: InvoiceData; onClose: () => void }) {
  const invoiceId  = groupInvoiceId(group);
  const vendorName = groupVendorName(group);
  const date       = groupInvoiceDate(group);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-blue-600 shrink-0">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-white" />
            <p className="text-sm font-bold text-white font-mono">{invoiceId}</p>
            {vendorName && <span className="text-blue-200 text-xs">· {vendorName}</span>}
          </div>
          <div className="flex items-center gap-2">
            {group.file_url && (
              <a
                href={group.file_url}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Download
              </a>
            )}
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <XCircleIcon className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <FileViewer
            fileUrl={group.file_url}
            id={invoiceId}
            vendor={vendorName}
            date={date}
          />
        </div>
      </motion.div>
    </div>
  );
}

const PAGE_SIZE = 10;

export default function Invoices() {
  const dispatch = useDispatch<AppDispatch>();
  const user     = useSelector((state: RootState) => state.auth.user);

  const [matchings, setMatchings]               = useState<InvoiceData[]>([]);
  const [selectedMatching, setSelectedMatching] = useState<InvoiceData | null>(null);
  const [stats, setStats]                       = useState<InvoiceStats | null>(null);
  const [sidebarOpen, setSidebarOpen]           = useState(true);

  // Table controls
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage]                 = useState(1);

  // Modals
  const [fileViewGroup, setFileViewGroup]         = useState<InvoiceData | null>(null);
  const [confirmApprove, setConfirmApprove]       = useState<InvoiceData | null>(null);
  const [decisionModal, setDecisionModal]         = useState<{ row: InvoiceData; type: "review" | "reject" } | null>(null);
  const [changeStatusGroup, setChangeStatusGroup] = useState<InvoiceData | null>(null);

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
      }
    };
    fetchData();
  }, []);

  // Update group status in place — keyed by group_id
  const handleStatusChange = (
    groupId: number | undefined,
    invoiceId: string,
    newStatus: "approved" | "reviewed" | "rejected"
  ) => {
    const updateGroup = (g: InvoiceData): InvoiceData => {
      // Match by group_id if available, else fall back to invoice_id membership
      const isTarget = groupId != null
        ? g.group_id === groupId
        : g.invoice_ids?.includes(invoiceId) || g.invoice_id === invoiceId;
      return isTarget ? { ...g, matching_status: newStatus } : g;
    };

    setMatchings((prev) => prev.map(updateGroup));
    setSelectedMatching((prev) => (prev ? updateGroup(prev) : prev));

    // Live stats update
    setStats((prev) => {
      if (!prev) return prev;
      const s = { ...prev };
      if (newStatus === "approved") s.approved = s.approved + 1;
      if (newStatus === "rejected") s.rejected = s.rejected + 1;
      s.pending = Math.max(0, s.pending - 1);
      return s;
    });
  };

  const filtered = useMemo(() => {
    return matchings.filter((group) => {
      const lc = search.toLowerCase();
      const matchSearch = !search ||
        (group.invoice_ids ?? []).some((id) => id.toLowerCase().includes(lc)) ||
        (group.po_ids ?? []).some((id) => id.toLowerCase().includes(lc)) ||
        groupVendorName(group).toLowerCase().includes(lc) ||
        // legacy single-invoice fallback
        group.invoice_id?.toLowerCase().includes(lc) ||
        group.vendor?.name?.toLowerCase().includes(lc);
      const matchStatus = statusFilter === "all" || group.matching_status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [matchings, search, statusFilter]);

  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (!user) return <Navigate to="/" />;

  const initials = user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase();

  const summaryCards = [
    { label: "Total Matchings", value: stats?.total_invoices ?? 0,              icon: <FileText className="w-4 h-4" />,    color: "bg-blue-50 text-blue-600"      },
    { label: "Approved",       value: stats?.approved ?? 0,                     icon: <CheckCircle className="w-4 h-4" />, color: "bg-emerald-50 text-emerald-600" },
    { label: "Pending",        value: stats?.pending ?? 0,                      icon: <Clock className="w-4 h-4" />,       color: "bg-amber-50 text-amber-600"    },
    { label: "Rejected",       value: stats?.rejected ?? 0,                     icon: <XCircle className="w-4 h-4" />,     color: "bg-red-50 text-red-600"        },
    { label: "Invoice Value",  value: formatCurrency(stats?.total_value ?? 0),  icon: <IndianRupee className="w-4 h-4" />, color: "bg-violet-50 text-violet-600"  },
  ];

  const statusConfig = [
    { key: "all",      label: "All",      count: matchings.length },
    { key: "approved", label: "Approved", count: matchings.filter((g) => g.matching_status === "approved").length  },
    { key: "pending",  label: "Pending",  count: matchings.filter((g) => g.matching_status === "pending").length   },
    { key: "reviewed", label: "Reviewed", count: matchings.filter((g) => g.matching_status === "reviewed").length  },
    { key: "rejected", label: "Rejected", count: matchings.filter((g) => g.matching_status === "rejected").length  },
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} user={{ ...user, initials }} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
                <Receipt className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-base font-semibold text-gray-800">Invoice Matchings</h1>
                <p className="text-xs text-gray-400">Manage and review invoice matching groups</p>
              </div>
            </div>
          </div>
          <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">
            {matchings.length} group{matchings.length !== 1 ? "s" : ""}
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

          {/* Invoice Matchings Table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">

            {/* Toolbar */}
            <div className="px-5 py-3 border-b border-gray-100 bg-blue-600 shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-white" />
                  <span className="text-sm font-semibold text-white">Matching Groups</span>
                  <span className="text-xs text-blue-200 font-medium ml-1">
                    {filtered.length} group{filtered.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-300" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search invoice ID, PO, vendor…"
                    className="pl-8 pr-3 py-1.5 text-xs bg-white/15 text-white placeholder:text-blue-300 rounded-lg border border-white/20 focus:outline-none focus:ring-1 focus:ring-white/40 w-60"
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
                    ${statusFilter === s.key
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"}`}
                >
                  {s.label}
                  <span className={`text-[10px] px-1 rounded font-semibold ${statusFilter === s.key ? "bg-white/25 text-white" : "bg-gray-100 text-gray-400"}`}>
                    {s.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto min-h-0">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      Invoices
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      Date
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      PO Refs
                    </th>
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      Total Amount
                    </th>
                    <th className="text-center px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      PO Status
                    </th>
                    <th className="text-center px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      Status
                    </th>
                    <th className="text-center px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      Actions
                    </th>
                    <th className="text-center px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      File
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-16 text-gray-400">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                            <FileText className="w-5 h-5 opacity-40" />
                          </div>
                          <p className="text-xs font-medium">No matching groups found</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginated.map((group, idx) => {
                      const isPending       = group.matching_status === "pending";
                      const showDecisionBtn = isPending && !!group.decision;

                      // Derived display values
                      const invoiceIds  = group.invoice_ids ?? (group.invoice_id ? [group.invoice_id] : []);
                      const poIds       = group.po_ids ?? (group.po_id ? [group.po_id] : []);
                      const totalAmt    = groupTotalAmount(group);
                      const currency    = groupCurrencyCode(group);
                      const date        = groupInvoiceDate(group);
                      const vendor      = groupVendorName(group);
                      const isMultiInv  = invoiceIds.length > 1;

                      return (
                        <motion.tr
                          key={group.group_id ?? invoiceIds.join("-")}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.02 }}
                          className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors group cursor-pointer"
                          onClick={() =>
                            setSelectedMatching((prev) =>
                              prev?.group_id === group.group_id ? null : group
                            )
                          }
                        >
                          {/* Invoices column */}
                          <td className="px-4 py-3">
                            <div className="flex items-start gap-2">
                              <div className="w-7 h-7 rounded-lg bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center shrink-0 transition-colors mt-0.5">
                                {isMultiInv
                                  ? <Users className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-500" />
                                  : <Receipt className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-500" />
                                }
                              </div>
                              <div className="min-w-0">
                                <IdPillList
                                  ids={invoiceIds}
                                  colorClass="bg-gray-100 text-gray-700"
                                  max={2}
                                />
                                {vendor && (
                                  <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-40">{vendor}</p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Date */}
                          <td className="px-4 py-3">
                            <span className="text-gray-500">{date || "—"}</span>
                          </td>

                          {/* PO Refs */}
                          <td className="px-4 py-3">
                            {poIds.length > 0 ? (
                              <IdPillList
                                ids={poIds}
                                colorClass="bg-blue-50 text-blue-600"
                                max={2}
                              />
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>

                          {/* Total Amount — summed across all invoices in group */}
                          <td className="px-4 py-3 text-right">
                            <span className="font-bold text-gray-800">
                              {formatCurrency(totalAmt, currency)}
                            </span>
                            {isMultiInv && (
                              <p className="text-[10px] text-gray-400">{invoiceIds.length} invoices</p>
                            )}
                          </td>

                          {/* PO Match Status */}
                          <td className="px-4 py-3 text-center">
                            <PoMatchBadge value={group.is_po_matched} hasPo={poIds.length > 0} />
                          </td>

                          {/* Matching Status */}
                          <td className="px-4 py-3 text-center">
                            <MatchingStatusBadge status={group.matching_status ?? "pending"} />
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                            {isPending ? (
                              <div className="flex flex-row items-center justify-center gap-1.5 flex-wrap">
                                {showDecisionBtn && (
                                  <>
                                    {group.decision === "approve" && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setConfirmApprove(group); }}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md bg-emerald-600 hover:bg-emerald-700 text-white transition-colors whitespace-nowrap"
                                      >
                                        <CheckCircle2 className="w-3 h-3 shrink-0" /> Approve
                                      </button>
                                    )}
                                    {group.decision === "review" && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setDecisionModal({ row: group, type: "review" }); }}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md bg-amber-500 hover:bg-amber-600 text-white transition-colors whitespace-nowrap"
                                      >
                                        <AlertTriangle className="w-3 h-3 shrink-0" /> Review
                                      </button>
                                    )}
                                    {group.decision === "reject" && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setDecisionModal({ row: group, type: "reject" }); }}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md bg-red-500 hover:bg-red-600 text-white transition-colors whitespace-nowrap"
                                      >
                                        <XCircleIcon className="w-3 h-3 shrink-0" /> Reject
                                      </button>
                                    )}
                                  </>
                                )}
                                <button
                                  onClick={(e) => { e.stopPropagation(); setChangeStatusGroup(group); }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md bg-gray-100 hover:bg-blue-100 text-gray-600 hover:text-blue-700 border border-gray-200 hover:border-blue-300 transition-colors whitespace-nowrap"
                                >
                                  <RefreshCw className="w-3 h-3 shrink-0" /> Change Status
                                </button>
                              </div>
                            ) : (
                              <span className="text-gray-300 text-[11px]">—</span>
                            )}
                          </td>

                          {/* File */}
                          <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={(e) => { e.stopPropagation(); setFileViewGroup(group); }}
                                title="View File"
                                className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-600 transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <a
                                href={group.file_url ?? "#"}
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => { e.stopPropagation(); if (!group.file_url) e.preventDefault(); }}
                                title="Download File"
                                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                                  group.file_url
                                    ? "bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                                    : "bg-gray-50 text-gray-300 cursor-not-allowed"
                                }`}
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
                      if (page > 3) pages.push(-1);
                      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
                      if (page < totalPages - 2) pages.push(-2);
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

      {/* Detail Side Panel */}
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
              className="fixed right-0 top-0 h-full w-120 z-40 shadow-2xl"
            >
              <InvoiceDetailPanel
                invoice={selectedMatching}
                onClose={() => setSelectedMatching(null)}
                onStatusChange={(invoiceId, newStatus) =>
                  handleStatusChange(
                    selectedMatching.group_id,
                    invoiceId,
                    newStatus as "approved" | "reviewed" | "rejected"
                  )
                }
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {fileViewGroup && (
          <FileViewModal group={fileViewGroup} onClose={() => setFileViewGroup(null)} />
        )}
        {changeStatusGroup && (
          <ChangeStatusModal
            group={changeStatusGroup}
            onConfirm={(newStatus) => {
              handleStatusChange(changeStatusGroup.group_id, groupInvoiceId(changeStatusGroup), newStatus);
              setChangeStatusGroup(null);
            }}
            onCancel={() => setChangeStatusGroup(null)}
          />
        )}
        {confirmApprove && (
          <ConfirmApproveModal
            group={confirmApprove}
            onConfirm={() => {
              handleStatusChange(confirmApprove.group_id, groupInvoiceId(confirmApprove), "approved");
              setConfirmApprove(null);
            }}
            onCancel={() => setConfirmApprove(null)}
          />
        )}
        {decisionModal && (
          <DecisionDetailModal
            invoiceId={groupInvoiceId(decisionModal.row)}
            type={decisionModal.type}
            invoiceRow={decisionModal.row}
            onClose={() => setDecisionModal(null)}
            onStatusChange={(invoiceId, newStatus) => {
              handleStatusChange(
                decisionModal.row.group_id,
                invoiceId,
                newStatus as "reviewed" | "rejected"
              );
              setDecisionModal(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}