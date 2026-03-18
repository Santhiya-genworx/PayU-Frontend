import { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Receipt, Search, FileText, Package, Clock, CheckCircle, Upload, Trash2, Eye, XCircle } from "lucide-react";
import { type AppDispatch, type RootState } from "../../../app/store";
import { addFiles, updateFile, removeFile } from "../slices/dashboardSlice";
import Sidebar from "../components/sidebar";
import UploadBox from "../components/upload_box";
import InvoicePreviewModal from "../components/invoice_preview";
import ProgressModal from "../components/progress_modal";
import ConfirmationModal from "../components/confirmation_modal";
import { extractInvoice, pollExtractionStatus, getDocumentCounts, submitInvoice, pollUploadStatus, overrideInvoice } from "../services/dashboardService";
import { filterInvoices } from "../../view_document/services/documentService";
import type { ExtractedFile } from "../../../types/process";
import type { InvoiceData } from "../../../types/invoice";
import type { ToastState } from "../../../types/toast";
import Toast from "../../../components/common/toast";
import { fetchUser } from "../../auth/slices/authSlice";
import { formatCurrency } from "../../../lib/formatCurrency";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function AssociateDashboard() {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const extractedFiles = useSelector((state: RootState) => state.extraction.files);
  const loading = useSelector((state: RootState) => state.auth.loading);

  const [authChecked, setAuthChecked]             = useState(false);
  const [toast, setToast]                         = useState<ToastState>({ visible: false, message: "", type: "info" });
  const [sidebarOpen, setSidebarOpen]             = useState(false);
  const [stats, setStats]                         = useState({ total: 0, approved: 0, pending: 0, rejected: 0 });
  const [selectedFile, setSelectedFile]           = useState<ExtractedFile | null>(null);
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [uploadsInProgress, setUploadsInProgress] = useState(false);
  const [confirmationFile, setConfirmationFile]   = useState<ExtractedFile | null>(null);
  const [invoices, setInvoices]                   = useState<InvoiceData[]>([]);
  const [invoicesLoading, setInvoicesLoading]     = useState(true);
  const [selectedInvoice, setSelectedInvoice]     = useState<InvoiceData | null>(null);
  const [searchQuery, setSearchQuery]             = useState("");

  const confirmOverrideRef = useRef<(() => void) | null>(null);
  const cancelOverrideRef  = useRef<(() => void) | null>(null);

  const handleConfirmOverride = () => { setConfirmationFile(null); confirmOverrideRef.current?.(); };
  const handleCancelOverride  = () => { setConfirmationFile(null); cancelOverrideRef.current?.();  };
  const handleConfirmationRequired = (file: ExtractedFile) => { if (progressModalOpen) setConfirmationFile(file); };

  const fetchStats = async () => {
    try {
      const { total, approved, reviewed, rejected } = await getDocumentCounts();
      setStats({ total, approved, pending: reviewed, rejected });
    } catch (err) { console.error(err); }
  };

  const fetchInvoices = async () => {
    try {
      setInvoicesLoading(true);
      const data = await filterInvoices();
      setInvoices(data);
    } catch (err) { console.error(err); }
    finally { setInvoicesLoading(false); }
  };

  useEffect(() => {
    const init = async () => { await dispatch(fetchUser()); setAuthChecked(true); };
    init();
    fetchStats();
    fetchInvoices();
  }, [dispatch]);

  const handleUpload = async (files: File[]) => {
    const newEntries: ExtractedFile[] = files.map((file) => ({
      id: `${Date.now()}-${file.name}`,
      fileName: file.name,
      file,
      type: "invoice",
      extractedData: undefined,
      status: "extracting",
    }));
    dispatch(addFiles(newEntries));
    for (const entry of newEntries) {
      const file = files.find((f) => f.name === entry.fileName)!;
      try {
        const fileId = await extractInvoice(file);
        await pollExtractionStatus(fileId, (status, result, error) => {
          if (status === "completed") {
            const updated: ExtractedFile = { ...entry, extractedData: result, status: "done" };
            dispatch(updateFile(updated));
            setSelectedFile((cur) => cur?.id === entry.id ? updated : cur);
          }
          if (status === "failed") {
            const errEntry: ExtractedFile = { ...entry, status: "error" };
            dispatch(updateFile(errEntry));
            setToast({ visible: true, message: error ?? "Extraction failed", type: "error" });
          }
        });
      } catch (error: any) {
        dispatch(updateFile({ ...entry, status: "error" }));
        setToast({ visible: true, message: error?.response?.data?.message ?? error?.message ?? String(error), type: "error" });
      }
    }
  };

  const handleSave = () => {
    const filesToSave = extractedFiles.filter((f) => f.status === "done" && f.extractedData);
    if (filesToSave.length === 0) return;
    setUploadsInProgress(true);
    setProgressModalOpen(true);
  };

  const handleAllDone = async () => {
    setUploadsInProgress(false);
    setConfirmationFile(null);
    await fetchStats();
    await fetchInvoices();
  };

  if (!authChecked || loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return <Navigate to="/" />;
  if (user.role !== "associate") return <Navigate to="/dashboard" />;

  const initials = user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase();
  const canSave = extractedFiles.some((f) => f.status === "done" && f.extractedData)
    && !extractedFiles.some((f) => f.status === "uploading" || f.status === "extracting");

  const filteredInvoices = invoices.filter(inv =>
    searchQuery === "" ||
    inv.invoice_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.vendor?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const summaryCards = [
    { label: "My Uploads",  value: stats.total,    icon: <FileText    className="w-4 h-4" />, color: "bg-blue-50 text-blue-600"      },
    { label: "Approved",    value: stats.approved, icon: <CheckCircle className="w-4 h-4" />, color: "bg-emerald-50 text-emerald-600" },
    { label: "In Review",   value: stats.pending,  icon: <Clock       className="w-4 h-4" />, color: "bg-amber-50 text-amber-600"    },
    { label: "Rejected",    value: stats.rejected, icon: <XCircle     className="w-4 h-4" />, color: "bg-red-50 text-red-600"        },
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} user={{ ...user, initials }} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 shrink-0">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
                  <Receipt style={{ width: 18, height: 18 }} className="text-white" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-gray-900">{getGreeting()}, {user.name.split(" ")[0]}</h1>
                  <p className="text-xs text-gray-400">Upload invoices and track their status here.</p>
                </div>
              </div>
            </div>
            <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">
              {invoices.length} total
            </span>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-5">

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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

            {/* Upload + Extracted Files Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UploadBox
                type="Invoice"
                accentClass="border-t-blue-600"
                iconBg="bg-blue-50 text-blue-600"
                icon="🧾"
                accept=".pdf,.png,.jpg,.jpeg"
                onUpload={handleUpload}
              />

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col min-h-52">
                <div className="flex items-center justify-between mb-3">
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

                {extractedFiles.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-8 text-gray-400">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mb-2">
                      <Upload className="w-5 h-5 text-gray-300" />
                    </div>
                    <p className="text-xs">No files extracted yet</p>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
                      {extractedFiles.map((ef) => {
                        const isConfirmRequired = ef.status === "confirmation_required";
                        return (
                          <div key={ef.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-all group
                              ${isConfirmRequired ? "border-orange-200 bg-orange-50/50" : selectedFile?.id === ef.id ? "border-blue-300 bg-blue-50/50" : "border-gray-100 hover:border-blue-200 bg-white"}`}>
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0 ${isConfirmRequired ? "bg-orange-100 text-orange-500" : "bg-blue-50 text-blue-600"}`}>
                              {ef.fileName.match(/\.(png|jpe?g|webp)$/i) ? "🖼️" : "📄"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-700 truncate">{ef.fileName}</p>
                              <p className="text-xs mt-0.5">
                                {ef.status === "extracting" && <span className="text-amber-500">⏳ Processing…</span>}
                                {ef.status === "uploading"  && <span className="text-blue-500">⬆️ Uploading…</span>}
                                {ef.status === "done"       && <span className="text-emerald-600">✅ Ready to view</span>}
                                {ef.status === "error"      && <span className="text-red-500">❌ Failed</span>}
                                {isConfirmRequired          && <span className="text-orange-500 font-medium">⚠️ Already exists</span>}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {ef.status === "done" && (
                                <button onClick={() => setSelectedFile(ef)} className="p-1.5 rounded-md text-blue-500 hover:bg-blue-50 transition-colors">
                                  <Eye className="w-3.5 h-3.5" />
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
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="pt-3 mt-2 border-t border-gray-100">
                      <button onClick={handleSave} disabled={!canSave}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium py-2 rounded-lg transition-all">
                        {uploadsInProgress ? "Uploads in progress…" : "Save All Done Files"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Invoice List + Detail split layout */}
            <div className="flex gap-4 h-[calc(100vh-490px)] min-h-80">
              {/* List */}
              <div className="w-96 shrink-0 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 bg-blue-600">
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-lg">
                    <Search className="w-3.5 h-3.5 text-white/70" />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by invoice ID or vendor…"
                      className="flex-1 bg-transparent text-sm text-white placeholder-white/50 outline-none"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {invoicesLoading ? (
                    <div className="flex items-center justify-center h-full text-sm text-gray-400">Loading…</div>
                  ) : filteredInvoices.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-sm text-gray-400">No invoices found</div>
                  ) : (
                    filteredInvoices.map((inv) => (
                      <button
                        key={inv.invoice_id}
                        onClick={() => setSelectedInvoice((prev) => prev?.invoice_id === inv.invoice_id ? null : inv)}
                        className={`w-full text-left px-4 py-3.5 border-b border-gray-50 transition-colors
                          ${selectedInvoice?.invoice_id === inv.invoice_id ? "bg-blue-50 border-l-2 border-l-blue-500" : "hover:bg-gray-50/60"}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-800 font-mono truncate">{inv.invoice_id}</p>
                            <p className="text-xs text-gray-500 truncate mt-0.5">{inv.vendor?.name}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-bold text-gray-800">{formatCurrency(inv.total_amount, inv.currency_code)}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{inv.invoice_date}</p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Detail */}
              <div className="flex-1 min-w-0">
                <AnimatePresence mode="wait">
                  {selectedInvoice ? (
                    <motion.div key={selectedInvoice.invoice_id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                      className="h-full bg-white rounded-xl border border-gray-100 shadow-sm overflow-auto">
                      {/* Invoice Detail Header */}
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
                          <button onClick={() => setSelectedInvoice(null)} className="w-6 h-6 rounded-md bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors text-xs">✕</button>
                        </div>
                        <div className="mt-3 flex items-center gap-4">
                          <div>
                            <p className="text-xl font-bold text-white">{formatCurrency(selectedInvoice.total_amount, selectedInvoice.currency_code)}</p>
                            <p className="text-xs text-blue-200 mt-0.5">Invoice date: {selectedInvoice.invoice_date}</p>
                          </div>
                          {selectedInvoice.po_id && (
                            <span className="text-xs bg-white/20 text-white px-2.5 py-1 rounded-full font-medium">PO: {selectedInvoice.po_id}</span>
                          )}
                        </div>
                      </div>

                      <div className="p-5 space-y-4">
                        {/* Vendor Info */}
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Vendor Details</p>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div><p className="text-gray-400">Name</p><p className="font-medium text-gray-800 mt-0.5">{selectedInvoice.vendor?.name}</p></div>
                            {selectedInvoice.vendor?.email         && <div><p className="text-gray-400">Email</p>  <p className="font-medium text-gray-800 mt-0.5">{selectedInvoice.vendor.email}</p></div>}
                            {selectedInvoice.vendor?.mobile_number         && <div><p className="text-gray-400">Phone</p>  <p className="font-medium text-gray-800 mt-0.5">{selectedInvoice.vendor?.mobile_number}</p></div>}
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
                                {selectedInvoice.invoice_items?.map((item, i) => (
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
                              <span className="text-sm font-bold text-white">{formatCurrency(selectedInvoice.total_amount, selectedInvoice.currency_code)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="h-full flex flex-col items-center justify-center bg-white rounded-xl border border-gray-100 shadow-sm">
                      <div className="relative flex items-center justify-center mb-5">
                        <div className="absolute w-28 h-28 rounded-full bg-blue-50 opacity-60" />
                        <div className="absolute rounded-full bg-blue-100 opacity-60" style={{ width: 72, height: 72 }} />
                        <div className="relative w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-md">
                          <Receipt className="w-7 h-7 text-white" />
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-gray-700">Select an invoice to view details</p>
                      <p className="text-xs text-gray-400 mt-1">Click any invoice from the list</p>
                      <div className="flex flex-wrap items-center justify-center gap-2 mt-5 max-w-xs">
                        {["Invoice Details", "Vendor Info", "Line Items", "File Preview", "Upload History"].map((f) => (
                          <span key={f} className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">{f}</span>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

          </div>
        </main>
      </div>

      {/* Modals */}
      {selectedFile && (
        <InvoicePreviewModal
          file={selectedFile}
          onClose={() => setSelectedFile(null)}
          onUpdate={(updatedFile) => { dispatch(updateFile(updatedFile)); setSelectedFile(updatedFile); }}
        />
      )}

      {uploadsInProgress && (
        <div style={{ display: progressModalOpen ? undefined : "none" }}>
          <ProgressModal
            files={extractedFiles.filter((f) => f.status === "done" && f.extractedData)}
            submitFn={submitInvoice}
            overrideFn={overrideInvoice}
            pollFn={pollUploadStatus}
            onClose={() => setProgressModalOpen(false)}
            onSuccess={async (msg) => {
              setToast({ visible: true, message: msg, type: "success" });
              await fetchStats();
              await fetchInvoices();
            }}
            onError={(msg) => setToast({ visible: true, message: msg, type: "error" })}
            onConfirmationRequired={handleConfirmationRequired}
            confirmOverrideRef={confirmOverrideRef}
            cancelOverrideRef={cancelOverrideRef}
            onAllDone={handleAllDone}
          />
        </div>
      )}

      {confirmationFile && progressModalOpen && (
        <ConfirmationModal
          open={true}
          message={`"${confirmationFile.fileName}" already exists.`}
          onConfirm={handleConfirmOverride}
          onCancel={handleCancelOverride}
        />
      )}

      {toast.visible && <Toast message={toast.message} type={toast.type} onClose={() => setToast({ visible: false, message: "", type: "info" })} />}
    </div>
  );
}