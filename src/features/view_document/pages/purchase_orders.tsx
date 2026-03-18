import { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ShoppingCart, Search, FileText, Package, DollarSign, Clock, CheckCircle, Upload, Trash2, Eye } from "lucide-react";
import { type AppDispatch, type RootState } from "../../../app/store";
import { addFiles, updateFile, removeFile } from "../../dashboard/slices/dashboardSlice";
import Sidebar from "../../dashboard/components/sidebar";
import UploadBox from "../../dashboard/components/upload_box";
import PurchaseOrderPreviewModal from "../../dashboard/components/purchase_order_preview";
import ProgressModal from "../../dashboard/components/progress_modal";
import ConfirmationModal from "../../dashboard/components/confirmation_modal";
import { fetchUser } from "../../auth/slices/authSlice";
import { filterPurchaseOrders, getDocumentStats } from "../services/documentService";
import { extractPurchaseOrder, pollExtractionStatus, submitPurchaseOrder, pollUploadStatus, overridePurchaseOrder } from "../../dashboard/services/dashboardService";
import type { ExtractedFile } from "../../../types/process";
import type { POData } from "../../../types/purchase_order";
import type { ToastState } from "../../../types/toast";
import Toast from "../../../components/common/toast";
import { formatCurrency } from "../../../lib/formatCurrency";

export default function PurchaseOrders() {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const extractedFiles = useSelector((state: RootState) => state.extraction.files);

  const [authChecked, setAuthChecked] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [orders, setOrders] = useState<POData[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<POData | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<ExtractedFile | null>(null);
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [uploadsInProgress, setUploadsInProgress] = useState(false);
  const [confirmationFile, setConfirmationFile] = useState<ExtractedFile | null>(null);
  const [toast, setToast] = useState<ToastState>({ visible: false, message: "", type: "info" });
  const [searchQuery, setSearchQuery] = useState("");

  const confirmOverrideRef = useRef<(() => void) | null>(null);
  const cancelOverrideRef  = useRef<(() => void) | null>(null);

  const handleConfirmOverride = () => { setConfirmationFile(null); confirmOverrideRef.current?.(); };
  const handleCancelOverride  = () => { setConfirmationFile(null); cancelOverrideRef.current?.();  };
  const handleConfirmationRequired = (file: ExtractedFile) => { if (progressModalOpen) setConfirmationFile(file); };

  useEffect(() => {
    const init = async () => { await dispatch(fetchUser()); setAuthChecked(true); };
    init();

    const fetchData = async () => {
      try {
        const [poData, statsData] = await Promise.all([filterPurchaseOrders(), getDocumentStats()]);
        setOrders(poData);
        setStats(statsData);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [dispatch]);

  const handleUpload = async (files: File[]) => {
    const newEntries: ExtractedFile[] = files.map((file) => ({
      id: `${Date.now()}-${file.name}`,
      fileName: file.name,
      file,
      type: "po",
      extractedData: undefined,
      status: "extracting",
    }));

    dispatch(addFiles(newEntries));

    for (const entry of newEntries) {
      const file = files.find((f) => f.name === entry.fileName)!;
      try {
        const fileId = await extractPurchaseOrder(file);
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

  if (!authChecked) return null;
  if (!user) return <Navigate to="/" />;

  const initials = user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase();
  const canSave = extractedFiles.some((f) => f.status === "done" && f.extractedData)
    && !extractedFiles.some((f) => f.status === "uploading" || f.status === "extracting");

  const filteredOrders = orders.filter(o =>
    searchQuery === "" ||
    o.po_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.vendor.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const summaryCards = [
    { label: "Total POs", value: stats?.total_documents ?? 0, icon: <FileText className="w-4 h-4" />, color: "bg-blue-50 text-blue-600" },
    { label: "Approved", value: stats?.approved ?? 0, icon: <CheckCircle className="w-4 h-4" />, color: "bg-emerald-50 text-emerald-600" },
    { label: "In Review", value: stats?.pending ?? 0, icon: <Clock className="w-4 h-4" />, color: "bg-amber-50 text-amber-600"    },
    { label: "Total Value", value: `₹${((stats?.total_amount ?? 0) / 100000).toFixed(1)}L`,  icon: <DollarSign  className="w-4 h-4" />, color: "bg-violet-50 text-violet-600"  },
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
                <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center shadow-sm">
                  <ShoppingCart style={{ width: 18, height: 18 }} className="text-white" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-gray-900">Purchase Orders</h1>
                  <p className="text-xs text-gray-400">Manage and review all POs</p>
                </div>
              </div>
            </div>
            <span className="text-xs font-semibold text-violet-700 bg-violet-50 border border-violet-100 px-3 py-1 rounded-full">
              {orders.length} total
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
                type="Purchase Order"
                accentClass="border-t-violet-600"
                iconBg="bg-violet-50 text-violet-600"
                icon="📋"
                accept=".pdf,.png,.jpg,.jpeg,.docx"
                onUpload={handleUpload}
              />

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col min-h-52">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-gray-500" />
                    <p className="text-sm font-semibold text-gray-700">Extracted Files</p>
                  </div>
                  {uploadsInProgress && !progressModalOpen && (
                    <button onClick={() => setProgressModalOpen(true)} className="flex items-center gap-1.5 text-xs text-violet-600 bg-violet-50 px-2.5 py-1 rounded-full font-medium">
                      <span className="animate-pulse w-1.5 h-1.5 rounded-full bg-violet-500 inline-block" /> Uploading…
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
                              ${isConfirmRequired ? "border-orange-200 bg-orange-50/50" : selectedFile?.id === ef.id ? "border-violet-300 bg-violet-50/50" : "border-gray-100 hover:border-violet-200 bg-white"}`}>
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0 ${isConfirmRequired ? "bg-orange-100 text-orange-500" : "bg-violet-50 text-violet-600"}`}>
                              📋
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
                                <button onClick={() => setSelectedFile(ef)} className="p-1.5 rounded-md text-violet-500 hover:bg-violet-50 transition-colors">
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {isConfirmRequired && !progressModalOpen && (
                                <>
                                  <button onClick={handleConfirmOverride} className="text-xs font-medium px-2 py-1 rounded-md bg-violet-600 text-white hover:bg-violet-700">Override</button>
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
                        className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium py-2 rounded-lg transition-all">
                        {uploadsInProgress ? "Uploads in progress…" : "Save All Done Files"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* PO List + Detail split layout */}
            <div className="flex gap-4 h-[calc(100vh-490px)] min-h-80">
              {/* List */}
              <div className="w-96 shrink-0 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 bg-violet-600">
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-lg">
                    <Search className="w-3.5 h-3.5 text-white/70" />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by PO ID or vendor…"
                      className="flex-1 bg-transparent text-sm text-white placeholder-white/50 outline-none"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {loading ? (
                    <div className="flex items-center justify-center h-full text-sm text-gray-400">Loading…</div>
                  ) : filteredOrders.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-sm text-gray-400">No purchase orders found</div>
                  ) : (
                    filteredOrders.map((po) => (
                      <button
                        key={po.po_id}
                        onClick={() => setSelectedOrder((prev) => prev?.po_id === po.po_id ? null : po)}
                        className={`w-full text-left px-4 py-3.5 border-b border-gray-50 transition-colors
                          ${selectedOrder?.po_id === po.po_id ? "bg-violet-50 border-l-2 border-l-violet-500" : "hover:bg-gray-50/60"}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-800 font-mono truncate">{po.po_id}</p>
                            <p className="text-xs text-gray-500 truncate mt-0.5">{po.vendor.name}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-bold text-gray-800">{formatCurrency(po.total_amount, po.currency_code)}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{po.ordered_date}</p>
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
                  {selectedOrder ? (
                    <motion.div key={selectedOrder.po_id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                      className="h-full bg-white rounded-xl border border-gray-100 shadow-sm overflow-auto">
                      {/* PO Detail Header */}
                      <div className="bg-violet-600 px-5 py-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                              <ShoppingCart style={{ width: 18, height: 18 }} className="text-white" />
                            </div>
                            <div>
                              <h2 className="text-sm font-bold text-white font-mono">{selectedOrder.po_id}</h2>
                              <p className="text-xs text-violet-200 mt-0.5">{selectedOrder.vendor.name}</p>
                            </div>
                          </div>
                          <button onClick={() => setSelectedOrder(null)} className="w-6 h-6 rounded-md bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors text-xs">✕</button>
                        </div>
                        <div className="mt-3 flex items-center gap-4">
                          <div>
                            <p className="text-xl font-bold text-white">{formatCurrency(selectedOrder.total_amount, selectedOrder.currency_code)}</p>
                            <p className="text-xs text-violet-200 mt-0.5">Ordered {selectedOrder.ordered_date}</p>
                          </div>
                          {selectedOrder.gl_code && (
                            <span className="text-xs bg-white/20 text-white px-2.5 py-1 rounded-full font-medium">GL: {selectedOrder.gl_code}</span>
                          )}
                        </div>
                      </div>

                      <div className="p-5 space-y-4">
                        {/* Vendor Info */}
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Vendor Details</p>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div><p className="text-gray-400">Name</p><p className="font-medium text-gray-800 mt-0.5">{selectedOrder.vendor.name}</p></div>
                            {selectedOrder.vendor.email         && <div><p className="text-gray-400">Email</p>  <p className="font-medium text-gray-800 mt-0.5">{selectedOrder.vendor.email}</p></div>}
                            {selectedOrder.vendor.mobile_number && <div><p className="text-gray-400">Phone</p>  <p className="font-medium text-gray-800 mt-0.5">{selectedOrder.vendor.mobile_number}</p></div>}
                            {selectedOrder.vendor.address       && <div><p className="text-gray-400">Address</p><p className="font-medium text-gray-800 mt-0.5">{selectedOrder.vendor.address}</p></div>}
                          </div>
                        </div>

                        {/* Line Items */}
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Ordered Items</p>
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
                                {selectedOrder.ordered_items.map((item, i) => (
                                  <tr key={i} className="border-t border-gray-50">
                                    <td className="px-3 py-2.5 text-gray-700">{item.item_description}</td>
                                    <td className="px-3 py-2.5 text-right text-gray-600">{item.quantity}</td>
                                    <td className="px-3 py-2.5 text-right text-gray-600">{formatCurrency(item.unit_price, selectedOrder.currency_code)}</td>
                                    <td className="px-3 py-2.5 text-right font-semibold text-gray-800">{formatCurrency(item.total_price, selectedOrder.currency_code)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <div className="bg-violet-600 px-4 py-2.5 flex justify-between items-center">
                              <span className="text-xs font-bold text-white">Total Amount</span>
                              <span className="text-sm font-bold text-white">{formatCurrency(selectedOrder.total_amount, selectedOrder.currency_code)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="h-full flex flex-col items-center justify-center bg-white rounded-xl border border-gray-100 shadow-sm">
                      <div className="relative flex items-center justify-center mb-5">
                        <div className="absolute w-28 h-28 rounded-full bg-violet-50 opacity-60" />
                        <div className="absolute rounded-full bg-violet-100 opacity-60" style={{ width: 72, height: 72 }} />
                        <div className="relative w-14 h-14 rounded-2xl bg-violet-600 flex items-center justify-center shadow-md">
                          <ShoppingCart className="w-7 h-7 text-white" />
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-gray-700">Select a PO to view details</p>
                      <p className="text-xs text-gray-400 mt-1">Click any purchase order from the list</p>
                      <div className="flex flex-wrap items-center justify-center gap-2 mt-5 max-w-xs">
                        {["PO Details", "Vendor Info", "Line Items", "File Preview", "Order History"].map((f) => (
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
        <PurchaseOrderPreviewModal
          file={selectedFile}
          onClose={() => setSelectedFile(null)}
          onUpdate={(f) => { dispatch(updateFile(f)); setSelectedFile(f); }}
        />
      )}

      {uploadsInProgress && (
        <div style={{ display: progressModalOpen ? undefined : "none" }}>
          <ProgressModal
            files={extractedFiles.filter((f) => f.status === "done" && f.extractedData)}
            submitFn={submitPurchaseOrder}
            overrideFn={overridePurchaseOrder}
            pollFn={pollUploadStatus}
            onClose={() => setProgressModalOpen(false)}
            onSuccess={async (msg) => { setToast({ visible: true, message: msg, type: "success" }); }}
            onError={(msg) => setToast({ visible: true, message: msg, type: "error" })}
            onConfirmationRequired={handleConfirmationRequired}
            confirmOverrideRef={confirmOverrideRef}
            cancelOverrideRef={cancelOverrideRef}
            onAllDone={() => { setUploadsInProgress(false); setConfirmationFile(null); }}
          />
        </div>
      )}

      {confirmationFile && progressModalOpen && (
        <ConfirmationModal open={true} message={`"${confirmationFile.fileName}" already exists.`} onConfirm={handleConfirmOverride} onCancel={handleCancelOverride} />
      )}

      {toast.visible && <Toast message={toast.message} type={toast.type} onClose={() => setToast({ visible: false, message: "", type: "info" })} />}
    </div>
  );
}