import { useState, useEffect, useRef, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Receipt, Search, FileText, Package, Clock, CheckCircle,
  Upload, X, Eye, XCircle, LinkIcon, RotateCcw,
  SlidersHorizontal, ChevronLeft, ChevronRight, Download,
} from "lucide-react";
import { type AppDispatch, type RootState } from "../../../app/store";
import { addFiles, updateFile, removeFile } from "../slices/dashboardSlice";
import Sidebar from "../components/sidebar";
import UploadBox from "../components/upload_box";
import InvoicePreviewModal from "../components/invoice_preview";
import ProgressModal from "../components/progress_modal";
import ConfirmationModal from "../components/confirmation_modal";
import {
  extractInvoice, pollExtractionStatus, getInvoiceStats,
  submitInvoice, pollUploadStatus, overrideInvoice,
} from "../services/dashboardService";
import { filterInvoices, getInvoiceMatchings } from "../../view_document/services/documentService";
import type { ExtractedFile } from "../../../types/process";
import type { InvoiceData } from "../../../types/invoice";
import type { ToastState } from "../../../types/toast";
import Toast from "../../../components/common/toast";
import { fetchUser } from "../../auth/slices/authSlice";
import { formatCurrency } from "../../../lib/formatCurrency";
import { isApiError, type ApiError } from "../../../lib/apiError";
import logger from "../../../utils/logger";

const MAX_RETRIES = 3;
const PAGE_SIZE   = 10;

type ExtractedInvoiceFile = Extract<ExtractedFile, { type: "invoice" }>;

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}


export default function AssociateDashboard() {
  const dispatch       = useDispatch<AppDispatch>();
  const user           = useSelector((state: RootState) => state.auth.user);
  const extractedFiles = useSelector((state: RootState) => state.extraction.files);

  const [toast, setToast]                         = useState<ToastState>({ visible: false, message: "", type: "info" });
  const [sidebarOpen, setSidebarOpen]             = useState(true);
  const [stats, setStats]                         = useState({ total: 0, approved: 0, pending: 0, rejected: 0 });
  const [selectedFile, setSelectedFile]           = useState<ExtractedFile | null>(null);
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [uploadsInProgress, setUploadsInProgress] = useState(false);
  const [confirmationFile, setConfirmationFile]   = useState<ExtractedFile | null>(null);

  const [invoices, setInvoices]               = useState<InvoiceData[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  const [search, setSearch]                   = useState("");
  const [statusFilter, setStatusFilter]       = useState("all");
  const [page, setPage]                       = useState(1);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const retryCounts    = useRef<Map<string, number>>(new Map());
  const confirmOverrideRef = useRef<(() => void) | null>(null);
  const cancelOverrideRef  = useRef<(() => void) | null>(null);

  const handleConfirmOverride      = () => { setConfirmationFile(null); confirmOverrideRef.current?.(); };
  const handleCancelOverride       = () => { setConfirmationFile(null); cancelOverrideRef.current?.();  };
  const handleConfirmationRequired = (file: ExtractedFile) => { if (progressModalOpen) setConfirmationFile(file); };

  const fetchStats = async () => {
    try {
      const { total_invoices, approved, pending, rejected } = await getInvoiceStats();
      setStats({ total: total_invoices, approved, pending, rejected });
    } catch (err) { logger.error(err); }
  };

  const fetchInvoices = async () => {
    try {
      setInvoicesLoading(true);
      const data = await filterInvoices();
      setInvoices(data);
    } catch (err) { logger.error(err); }
    finally { setInvoicesLoading(false); }
  };

  useEffect(() => {
    const init = async () => { await dispatch(fetchUser()); };
    init();
    fetchStats();
    fetchInvoices();
  }, [dispatch]);

  useEffect(() => { setPage(1); }, [search, statusFilter]);

  // ── Extraction helpers ────────────────────────────────────────────────────
  const runExtraction = async (entry: ExtractedInvoiceFile, file: File) => {
    dispatch(updateFile({ ...entry, status: "extracting" }));
    try {
      const fileId = await extractInvoice(file);
      await pollExtractionStatus(fileId, (status: string, result: unknown, error: string | undefined) => {
        if (status === "completed") {
          const updated: ExtractedFile = { ...entry, extractedData: result as InvoiceData, status: "done" };
          dispatch(updateFile(updated));
          setSelectedFile((cur: ExtractedFile | null) => cur?.id === entry.id ? updated : cur);
        }
        if (status === "failed") {
          dispatch(updateFile({ ...entry, status: "error" }));
          setToast({ visible: true, message: error ?? "Extraction failed", type: "error" });
        }
      });
    } catch (err: unknown) {
      const apiErr = isApiError(err) ? err : ({} as ApiError);
      const responseData = apiErr.response?.data as { message?: string } | undefined;
      dispatch(updateFile({ ...entry, status: "error" }));
      setToast({ visible: true, message: responseData?.message ?? apiErr.message ?? String(err), type: "error" });
    }
  };

  const handleUpload = async (files: File[]) => {
    const newEntries: ExtractedInvoiceFile[] = files.map((file: File) => ({
      id: `${Date.now()}-${file.name}`,
      fileName: file.name,
      file,
      type: "invoice" as const,
      extractedData: undefined,
      status: "extracting" as const,
    }));
    dispatch(addFiles(newEntries));
    for (const entry of newEntries) {
      retryCounts.current.set(entry.id, 0);
      const file = files.find((f: File) => f.name === entry.fileName)!;
      await runExtraction(entry, file);
    }
  };

  const handleRetry = async (ef: ExtractedFile) => {
    const current = retryCounts.current.get(ef.id) ?? 0;
    if (current >= MAX_RETRIES) {
      setToast({ visible: true, message: `Retry limit exceeded for "${ef.fileName}"`, type: "error" });
      return;
    }
    retryCounts.current.set(ef.id, current + 1);
    if (!ef.file) {
      setToast({ visible: true, message: "Original file not available for retry", type: "error" });
      return;
    }
    await runExtraction(ef as ExtractedInvoiceFile, ef.file);
  };

  const handleSave = () => {
    if (!extractedFiles.some((f: ExtractedFile) => f.status === "done" && f.extractedData)) return;
    setUploadsInProgress(true);
    setProgressModalOpen(true);
  };

  const handleAllDone = async () => {
    setUploadsInProgress(false);
    setConfirmationFile(null);
    await fetchStats();
    await fetchInvoices();
  };

  if (!user) return <Navigate to="/" />;
  if (user.role !== "associate") return <Navigate to="/dashboard" />;

  const initials = user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase();
  const canSave  = extractedFiles.some((f: ExtractedFile) => f.status === "done" && f.extractedData)
    && !extractedFiles.some((f: ExtractedFile) => f.status === "uploading" || f.status === "extracting");

  const filtered = useMemo(() => invoices.filter((inv: InvoiceData) => {
    const matchSearch = !search ||
      inv.invoice_id?.toLowerCase().includes(search.toLowerCase()) ||
      (inv.vendor?.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (inv.po_id ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || inv.matching_status === statusFilter;
    return matchSearch && matchStatus;
  }), [invoices, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const statusConfig = [
    { key: "all",      label: "All",      count: invoices.length },
    { key: "approved", label: "Approved", count: invoices.filter((i: InvoiceData) => i.matching_status === "approved").length },
    { key: "pending",  label: "Pending",  count: invoices.filter((i: InvoiceData) => i.matching_status === "pending").length  },
    { key: "reviewed", label: "Reviewed", count: invoices.filter((i: InvoiceData) => i.matching_status === "reviewed").length },
    { key: "rejected", label: "Rejected", count: invoices.filter((i: InvoiceData) => i.matching_status === "rejected").length },
  ];

  const summaryCards = [
    { label: "My Uploads",  value: stats.total,    icon: <FileText    className="w-4 h-4" />, color: "bg-blue-50 text-blue-600"       },
    { label: "Approved",    value: stats.approved, icon: <CheckCircle className="w-4 h-4" />, color: "bg-emerald-50 text-emerald-600" },
    { label: "In Review",   value: stats.pending,  icon: <Clock       className="w-4 h-4" />, color: "bg-amber-50 text-amber-600"     },
    { label: "Rejected",    value: stats.rejected, icon: <XCircle     className="w-4 h-4" />, color: "bg-red-50 text-red-600"         },
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} user={{ ...user, initials }} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 shrink-0">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!sidebarOpen && (
                <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              )}
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
                  <Receipt style={{ width: 18, height: 18 }} className="text-white" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-gray-900">{getGreeting()}, {user.name.split(" ")[0]}</h1>
                  <p className="text-xs text-gray-400">Upload invoices and track their matching status here.</p>
                </div>
              </div>
            </div>
            <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">
              {invoices.length} invoice{invoices.length !== 1 ? "s" : ""}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 min-h-0">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
            {summaryCards.map((card) => (
              <div key={card.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400">{card.label}</span>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${card.color}`}>{card.icon}</div>
                </div>
                <p className="text-xl font-bold text-gray-800">{card.value}</p>
              </div>
            ))}
          </div>

          {/* Upload Button */}
          <div className="flex justify-end">
            <button
              onClick={() => setUploadModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
            >
              <Upload className="w-4 h-4" />
              Upload Invoice
            </button>
          </div>

          {/* Upload Modal */}
          <AnimatePresence>
            {uploadModalOpen && (
              <motion.div key="upload-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4"
                onClick={() => setUploadModalOpen(false)}>
                <motion.div key="upload-box" initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ duration: 0.15 }}
                  className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                  <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    <div className="bg-blue-600 px-5 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl bg-blue-50 text-blue-600`}>🧾</div>
                        <div>
                          <p className="font-semibold text-white text-sm">Invoice</p>
                          <p className="text-xs text-white">Upload invoice files</p>
                        </div>
                      </div>
                      <button onClick={() => setUploadModalOpen(false)} className="w-6 h-6 rounded-md bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-xs">✕</button>
                    </div>
                    <div className="p-4">
                      <UploadBox
                        type="Invoice"
                        accentClass="border-t-blue-600"
                        iconBg="bg-blue-50 text-blue-600"
                        icon="🧾"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onUpload={async (files) => { await handleUpload(files); setUploadModalOpen(false); }}
                      />
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Table + Extracted Files side by side */}
          <div className="flex gap-4 flex-1 min-h-0">

          {/* ── Invoice Matchings Table ───────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">

            {/* Toolbar */}
            <div className="px-5 py-3 border-b border-gray-100 bg-blue-600 shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-white" />
                  <span className="text-sm font-semibold text-white">Invoices</span>
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
                <button key={s.key} onClick={() => setStatusFilter(s.key)}
                  className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-all
                    ${statusFilter === s.key ? "bg-blue-600 text-white shadow-sm" : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"}`}>
                  {s.label}
                  <span className={`text-[10px] px-1 rounded font-semibold ${statusFilter === s.key ? "bg-white/25 text-white" : "bg-gray-100 text-gray-400"}`}>{s.count}</span>
                </button>
              ))}
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto min-h-0">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Invoice ID</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Vendor</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Date</th>
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Amount</th>
                    <th className="text-center px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">File</th>
                  </tr>
                </thead>
                <tbody>
                  {invoicesLoading ? (
                    <tr><td colSpan={7} className="text-center py-16 text-gray-400 text-sm">Loading…</td></tr>
                  ) : paginated.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-16 text-gray-400">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                            <FileText className="w-5 h-5 opacity-40" />
                          </div>
                          <p className="text-xs font-medium">No invoices found</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginated.map((inv: InvoiceData, idx: number) => (
                      <motion.tr
                        key={`${inv.invoice_id}-${inv.po_id ?? "nopo"}`}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors cursor-pointer group"
                        onClick={() => setSelectedInvoice((prev: InvoiceData | null) =>
                          prev?.invoice_id === inv.invoice_id && (prev?.po_id ?? null) === (inv.po_id ?? null) ? null : inv
                        )}
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
                        {/* Vendor */}
                        <td className="px-4 py-3 text-gray-500 max-w-35 truncate">{inv.vendor?.name ?? "—"}</td>
                        {/* Date */}
                        <td className="px-4 py-3 text-gray-500">{inv.invoice_date ?? "—"}</td>
                        {/* Amount */}
                        <td className="px-4 py-3 text-right font-bold text-gray-800">{formatCurrency(inv.total_amount ?? 0, inv.currency_code)}</td>
                        {/* File */}
                        <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <a
                              href={inv.file_url ?? "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => { e.stopPropagation(); if (!inv.file_url) e.preventDefault(); }}
                              title="View File"
                              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${inv.file_url ? "bg-gray-50 hover:bg-blue-100 text-gray-500 hover:text-blue-600" : "bg-gray-50 text-gray-300 cursor-not-allowed"}`}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </a>
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
                    ))
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
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white text-gray-500 transition-all">
                  <ChevronLeft className="w-3 h-3" /> Prev
                </button>
                <div className="flex items-center gap-0.5">
                  {(() => {
                    const pages: number[] = [];
                    if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
                    else {
                      pages.push(1);
                      if (page > 3) pages.push(-1);
                      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
                      if (page < totalPages - 2) pages.push(-2);
                      pages.push(totalPages);
                    }
                    return pages.map((p, i) =>
                      p < 0 ? (
                        <span key={`e${i}`} className="w-7 h-7 flex items-center justify-center text-xs text-gray-300">…</span>
                      ) : (
                        <button key={p} onClick={() => setPage(p)}
                          className={`w-7 h-7 text-xs font-semibold rounded-md transition-all ${page === p ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-100"}`}>
                          {p}
                        </button>
                      )
                    );
                  })()}
                </div>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white text-gray-500 transition-all">
                  Next <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

            {/* Extracted Files Panel — shown beside table only when files exist */}
            {extractedFiles.length > 0 && (
              <div className="w-100 shrink-0 bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col min-h-0 overflow-hidden">
                <div className="flex items-center justify-between mb-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-gray-500" />
                    <p className="text-sm font-semibold text-gray-700">Extracted Files</p>
                  </div>
                  {uploadsInProgress && !progressModalOpen && (
                    <button onClick={() => setProgressModalOpen(true)} className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full font-medium">
                      <span className="animate-pulse w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" /> Uploading…
                    </button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
                  {extractedFiles.map((ef: ExtractedFile) => {
                    const isConfirmRequired = ef.status === "confirmation_required";
                    const retryCount  = retryCounts.current.get(ef.id) ?? 0;
                    const retriesLeft = MAX_RETRIES - retryCount;
                    return (
                      <div key={ef.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-all group
                          ${isConfirmRequired ? "border-orange-200 bg-orange-50/50"
                            : selectedFile?.id === ef.id ? "border-blue-300 bg-blue-50/50"
                            : "border-gray-100 hover:border-blue-200 bg-white"}`}>
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0 ${isConfirmRequired ? "bg-orange-100 text-orange-500" : "bg-blue-50 text-blue-600"}`}>
                          {ef.fileName.match(/\.(png|jpe?g|webp)$/i) ? "🖼️" : "📄"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-700 truncate">{ef.fileName}</p>
                          <p className="text-xs mt-0.5">
                            {ef.status === "extracting" && <span className="text-amber-500">⏳ Processing…</span>}
                            {ef.status === "uploading"  && <span className="text-blue-500">⬆️ Uploading…</span>}
                            {ef.status === "done"       && <span className="text-emerald-600">✅ Ready to view</span>}
                            {ef.status === "error"      && (
                              <span className="text-red-500">
                                ❌ Failed
                                {retryCount > 0 && <span className="ml-1 text-red-400">({retryCount}/{MAX_RETRIES} retried)</span>}
                              </span>
                            )}
                            {isConfirmRequired && <span className="text-orange-500 font-medium">⚠️ Already exists</span>}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {ef.status === "done" && (
                            <button onClick={() => setSelectedFile(ef)} className="p-1.5 rounded-md text-blue-500 hover:bg-blue-50 transition-colors">
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {ef.status === "error" && retriesLeft > 0 && (
                            <button onClick={() => handleRetry(ef)} title={`Retry (${retriesLeft} left)`} className="p-1.5 rounded-md text-amber-500 hover:bg-amber-50 transition-colors">
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {isConfirmRequired && !progressModalOpen && (
                            <>
                              <button onClick={handleConfirmOverride} className="text-xs font-medium px-2 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-700">Override</button>
                              <button onClick={handleCancelOverride}  className="text-xs font-medium px-2 py-1 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50">Skip</button>
                            </>
                          )}
                          {!isConfirmRequired && ef.status !== "extracting" && ef.status !== "uploading" && (
                            <button
                              onClick={() => { dispatch(removeFile(ef.id)); if (selectedFile?.id === ef.id) setSelectedFile(null); }}
                              className="p-1.5 rounded-md text-gray-300 hover:text-red-400 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="pt-3 mt-2 border-t border-gray-100 shrink-0">
                  <button onClick={handleSave} disabled={!canSave}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium py-2 rounded-lg transition-all">
                    {uploadsInProgress ? "Uploads in progress…" : "Save All Done Files"}
                  </button>
                </div>
              </div>
            )}
          </div>{/* end flex wrapper */}
        </main>
      </div>

      {/* Detail Side Panel */}
      <AnimatePresence>
        {selectedInvoice && (
          <>
            <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 bg-black/20" onClick={() => setSelectedInvoice(null)} />
            <motion.div key="panel" initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 60 }}
              transition={{ duration: 0.2 }} className="fixed right-0 top-0 h-full w-110 z-40 shadow-2xl bg-white overflow-auto">
              {/* Panel Header */}
              <div className="bg-blue-600 px-5 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                      <Receipt style={{ width: 18, height: 18 }} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-white font-mono">{selectedInvoice.invoice_id}</h2>
                      <p className="text-xs text-blue-200 mt-0.5">{selectedInvoice.vendor?.name}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedInvoice(null)} className="w-6 h-6 rounded-md bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-xs">✕</button>
                </div>
                <div className="mt-3 flex items-center gap-4 flex-wrap">
                  <div>
                    <p className="text-xl font-bold text-white">{formatCurrency(selectedInvoice.total_amount ?? 0, selectedInvoice.currency_code)}</p>
                    <p className="text-xs text-blue-200 mt-0.5">Invoice date: {selectedInvoice.invoice_date}</p>
                  </div>
                  {selectedInvoice.po_id && (
                    <span className="text-xs bg-white/20 text-white px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                      <LinkIcon className="w-3 h-3" />{selectedInvoice.po_id}
                      {!selectedInvoice.is_po_matched && <XCircle className="w-3 h-3 text-orange-300 ml-0.5" />}
                    </span>
                  )}
                </div>
              </div>
              <div className="p-5 space-y-4">
                {/* Vendor */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Vendor Details</p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div><p className="text-gray-400">Name</p><p className="font-medium text-gray-800 mt-0.5">{selectedInvoice.vendor?.name}</p></div>
                    {selectedInvoice.vendor?.email         && <div><p className="text-gray-400">Email</p>  <p className="font-medium text-gray-800 mt-0.5">{selectedInvoice.vendor.email}</p></div>}
                    {selectedInvoice.vendor?.mobile_number && <div><p className="text-gray-400">Phone</p>  <p className="font-medium text-gray-800 mt-0.5">{selectedInvoice.vendor.mobile_number}</p></div>}
                    {selectedInvoice.vendor?.address       && <div><p className="text-gray-400">Address</p><p className="font-medium text-gray-800 mt-0.5">{selectedInvoice.vendor.address}</p></div>}
                  </div>
                </div>
                {/* Line Items */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Line Items</p>
                  <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="text-left px-3 py-2 font-semibold text-gray-500">Description</th>
                          <th className="text-right px-3 py-2 font-semibold text-gray-500">Qty</th>
                          <th className="text-right px-3 py-2 font-semibold text-gray-500">Unit Price</th>
                          <th className="text-right px-3 py-2 font-semibold text-gray-500">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedInvoice.invoice_items?.map((item, i: number) => (
                          <tr key={i} className="border-t border-gray-50">
                            <td className="px-3 py-2.5 text-gray-700">{item.item_description}</td>
                            <td className="px-3 py-2.5 text-right text-gray-600">{item.quantity ?? "—"}</td>
                            <td className="px-3 py-2.5 text-right text-gray-600">{item.unit_price ? formatCurrency(item.unit_price, selectedInvoice.currency_code) : "—"}</td>
                            <td className="px-3 py-2.5 text-right font-semibold text-gray-800">{formatCurrency(item.total_price, selectedInvoice.currency_code)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="bg-blue-600 px-4 py-2.5 flex justify-between items-center">
                      <span className="text-xs font-bold text-white">Total Amount</span>
                      <span className="text-sm font-bold text-white">{formatCurrency(selectedInvoice.total_amount ?? 0, selectedInvoice.currency_code)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modals */}
      {selectedFile && (
        <InvoicePreviewModal file={selectedFile} onClose={() => setSelectedFile(null)}
          onUpdate={(updatedFile: ExtractedFile) => { dispatch(updateFile(updatedFile)); setSelectedFile(updatedFile); }} />
      )}
      {uploadsInProgress && (
        <div style={{ display: progressModalOpen ? undefined : "none" }}>
          <ProgressModal
            files={extractedFiles.filter((f: ExtractedFile) => f.status === "done" && f.extractedData)}
            submitFn={submitInvoice} overrideFn={overrideInvoice} pollFn={pollUploadStatus}
            onClose={() => setProgressModalOpen(false)}
            onSuccess={async (msg: string) => { setToast({ visible: true, message: msg, type: "success" }); await fetchStats(); await fetchInvoices(); }}
            onError={(msg: string) => setToast({ visible: true, message: msg, type: "error" })}
            onConfirmationRequired={handleConfirmationRequired}
            confirmOverrideRef={confirmOverrideRef} cancelOverrideRef={cancelOverrideRef}
            onAllDone={handleAllDone}
          />
        </div>
      )}
      {confirmationFile && progressModalOpen && (
        <ConfirmationModal open={true} message={`"${confirmationFile.fileName}" already exists.`}
          onConfirm={handleConfirmOverride} onCancel={handleCancelOverride} />
      )}
      {toast.visible && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast({ visible: false, message: "", type: "info" })} />
      )}
    </div>
  );
}