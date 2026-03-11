import { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Navigate } from "react-router-dom";
import { type AppDispatch, type RootState } from "../../../app/store";
import { addFiles, updateFile, removeFile } from "../slices/dashboardSlice";
import Sidebar from "../components/sidebar";
import UploadBox from "../components/upload_box";
import InvoicePreviewModal from "../../dashboard/components/invoice_preview";
import { extractInvoice, extractPurchaseOrder, pollExtractionStatus, getTotalDocuments, getApprovedDocuments, getReviewedDocuments, getRejectedDocuments,
  submitInvoice, submitPurchaseOrder, pollUploadStatus, getRecentActivity, overrideInvoice, overridePurchaseOrder,
  createUser,} from "../../dashboard/services/dashboardService";
import type { ExtractedFile } from "../../../types/process";
import ProgressModal from "../components/progress_modal";
import PurchaseOrderPreviewModal from "../components/purchase_order_preview";
import type { ToastState } from "../../../types/toast";
import Toast from "../../../components/common/toast";
import { fetchUser } from "../../auth/slices/authSlice";
import ConfirmationModal from "../components/confirmation_modal";
import AddUserModal from "../components/create_user_modal";

type DocStatus = "success" | "pending" | "failed";
type DocType = "Invoice" | "Purchase Order";

interface StatItem { label: string; value: number | string; sub: string; accentClass: string; }
interface ActivityRow { id: number; file: string; type: DocType; total_amount: string; status: DocStatus; date: string; }

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function StatusBadge({ status }: { status: DocStatus }) {
  const config: Record<DocStatus, string> = {
    success: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    failed: "bg-red-100 text-red-800",
  };
  return <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${config[status]}`}>{status}</span>;
}

function StatCard({ label, value, sub, accentClass }: StatItem) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border-t-4 ${accentClass} p-5`}>
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className="text-3xl font-bold text-gray-800 mt-1">{typeof value === "number" ? value.toLocaleString("en-IN") : value}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  );
}

function Dashboard() {
  const dispatch = useDispatch<AppDispatch>();

  const user = useSelector((state: RootState) => state.auth.user);
  const extractedFiles = useSelector((state: RootState) => state.extraction.files);
  const loading = useSelector((state: RootState) => state.auth.loading);

  const [authChecked, setAuthChecked] = useState(false);
  const [toast, setToast] = useState<ToastState>({ visible: false, message: "", type: "info" });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState([
    { label: "Total Documents", value: 0 as number | string, sub: "All time", accentClass: "border-t-blue-600"  },
    { label: "Approved", value: 0 as number | string, sub: "0% success rate", accentClass: "border-t-green-600" },
    { label: "Pending Review", value: 0 as number | string, sub: "Awaiting approval", accentClass: "border-t-amber-500" },
    { label: "Failed", value: 0 as number | string, sub: "Needs attention", accentClass: "border-t-red-500"   },
  ]);
  const [selectedFile, setSelectedFile] = useState<ExtractedFile | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityRow[]>([]);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [uploadsInProgress, setUploadsInProgress] = useState(false);
  const [confirmationFile, setConfirmationFile] = useState<ExtractedFile | null>(null);

  const confirmOverrideRef = useRef<(() => void) | null>(null);
  const cancelOverrideRef  = useRef<(() => void) | null>(null);

  const handleConfirmOverride = () => {
    setConfirmationFile(null);
    confirmOverrideRef.current?.();
  };

  const handleCancelOverride = () => {
    setConfirmationFile(null);
    cancelOverrideRef.current?.();
  };

  const handleConfirmationRequired = (file: ExtractedFile) => {
    if (progressModalOpen) {
      setConfirmationFile(file);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const data = await getRecentActivity();
      const formatted: ActivityRow[] = data.map((item: any, index: number) => {
        const isInvoice = "invoice_id" in item;
        return {
          id: index,
          file: isInvoice ? item.invoice_id : item.po_id,
          type: isInvoice ? "Invoice" : "Purchase Order",
          total_amount: `₹ ${Number(item.total_amount).toLocaleString("en-IN")}`,
          status: item.status === "approved" ? "success" : item.status === "pending" ? "pending" : "failed",
          date: isInvoice ? item.invoice_date : item.ordered_date,
        };
      });
      setRecentActivity(formatted);
    } catch (err) { console.error("Failed to fetch activity", err); }
  };

  const fetchStats = async () => {
    try {
      const [total, approved, reviewed, rejected] = await Promise.all([
        getTotalDocuments(), getApprovedDocuments(), getReviewedDocuments(), getRejectedDocuments(),
      ]);
      const successRate = total > 0 ? Math.round((approved / total) * 100) : 0;
      setStats([
        { label: "Total Documents", value: total, sub: "All time", accentClass: "border-t-blue-600" },
        { label: "Approved", value: approved, sub: `${successRate}% success rate`, accentClass: "border-t-green-600" },
        { label: "Pending Review", value: reviewed, sub: "Awaiting approval", accentClass: "border-t-amber-500" },
        { label: "Failed", value: rejected, sub: "Needs attention", accentClass: "border-t-red-500" },
      ]);
    } catch (err) { console.error("Failed to fetch stats", err); }
  };

  useEffect(() => {
    const init = async () => { await dispatch(fetchUser()); setAuthChecked(true); };
    init();
    fetchStats();
    fetchRecentActivity();
  }, [dispatch]);

  const handleUpload = async (files: File[]) => {
    const newEntries: ExtractedFile[] = files.map((file) => ({
      id: `${Date.now()}-${file.name}`,
      fileName: file.name,
      file,
      type: user?.role === "admin" ? "po" : "invoice",
      extractedData: undefined,
      status: "extracting",
    }));

    dispatch(addFiles(newEntries));

    for (const entry of newEntries) {
      const file = files.find((f) => f.name === entry.fileName)!;
      try {
        const fileId = user?.role === "associate" ? await extractInvoice(file) : await extractPurchaseOrder(file);

        await pollExtractionStatus(fileId, (status, result, error) => {
          if (status === "completed") {
            const updated: ExtractedFile = { ...entry, extractedData: result, status: "done" };
            dispatch(updateFile(updated));
            setSelectedFile((cur) => cur?.id === entry.id ? updated : cur);
          }
          if (status === "failed") {
            const errEntry: ExtractedFile = { ...entry, status: "error" };
            dispatch(updateFile(errEntry));
            setSelectedFile((cur) => cur?.id === entry.id ? errEntry : cur);
            setToast({ visible: true, message: error ?? "Extraction failed", type: "error" });
          }
        });
      } catch (error: any) {
        const errEntry: ExtractedFile = { ...entry, status: "error" };
        dispatch(updateFile(errEntry));
        setSelectedFile((cur) => cur?.id === entry.id ? errEntry : cur);
        setToast({ visible: true, message: error?.response?.data?.message ?? error?.message ?? String(error), type: "error" });
      }
    }
  };

  const handleAddUser = async (data: { name: string; email: string; password: string; role: "associate" | "manager" }) => {
    try {
      await createUser(data);
      setToast({ visible: true, message: `User "${data.name}" added successfully!`, type: "success" });
    } catch (error: any) {
      const msg = error?.response?.data?.message ?? error?.message ?? "Adding user failed!";
      setToast({ visible: true, message: msg, type: "error" });
    }
  };

  const handleSave = () => {
    const filesToSave = extractedFiles.filter((f) => f.status === "done" && f.extractedData);
    if (filesToSave.length === 0) return;
    setUploadsInProgress(true);
    setProgressModalOpen(true);
  };

  const handleCloseProgressModal = () => { setProgressModalOpen(false); };

  const handleAllDone = async () => {
    setUploadsInProgress(false);
    setConfirmationFile(null);
    await fetchStats();
    await fetchRecentActivity();
  };

  if (!authChecked || loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return <Navigate to="/" />;

  const initials = user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase();
  const canSave = extractedFiles.some((f) => f.status === "done" && f.extractedData) && !extractedFiles.some((f) => f.status === "uploading") && !extractedFiles.some((f) => f.status === "extracting");

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} user={{ ...user, initials }} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="text-gray-600 hover:text-gray-900 text-xl transition-colors cursor-pointer">☰</button>
            <h1 className="text-lg font-semibold text-gray-800">Dashboard</h1>
          </div>
          <div className="flex flex-row items-center gap-4">
            {user.role === "admin" && (
                <button onClick={() => setAddUserOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg border  text-sm font-medium transition-colors shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <line x1="19" y1="8" x2="19" y2="14" />
                    <line x1="16" y1="11" x2="22" y2="11" />
                  </svg>
                  Add User
                </button>
              )}
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-sm">{initials}</div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          <p className="text-2xl font-bold text-gray-800">{getGreeting()}, {user.name.split(" ")[0]}</p>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{stats.map((stat) => <StatCard key={stat.label} {...stat} />)}</div>

          {/* Upload + Extracted Files */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-4">
              {user.role === "associate" && (
                <UploadBox type="Invoice" accentClass="border-t-blue-600" iconBg="bg-blue-50 text-blue-600" icon="🧾" accept=".pdf,.png,.jpg,.jpeg" onUpload={handleUpload} />
              )}
              {user.role === "admin" && (
                <UploadBox type="Purchase Order" accentClass="border-t-violet-600" iconBg="bg-violet-50 text-violet-600" icon="📋" accept=".pdf,.png,.jpg,.jpeg,.docx" onUpload={handleUpload} />
              )}
            </div>

            {/* Extracted Files List */}
            <div className="bg-white rounded-xl shadow-sm border-t-4 border-t-indigo-500 p-5 flex flex-col h-full">
              <div className="flex items-center justify-between mb-3 shrink-0">
                <p className="text-sm font-semibold text-gray-700">Extracted Files</p>

                {uploadsInProgress && !progressModalOpen && (
                  <button onClick={() => setProgressModalOpen(true)} className="flex items-center gap-1.5 text-xs text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full hover:bg-indigo-100 transition-colors font-medium">
                    <span className="animate-pulse w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block" /> Uploading…
                  </button>
                )}
              </div>

              {extractedFiles.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-sm text-gray-400">No files uploaded yet</div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2">
                    {extractedFiles.map((ef) => {
                      const isConfirmRequired = ef.status === "confirmation_required";
                      return (
                        <div key={ef.id} className={`flex items-start gap-3 p-3 rounded-lg border transition-all group
                            ${isConfirmRequired ? "border-orange-200 bg-orange-50/60" : selectedFile?.id === ef.id ? "border-indigo-400 bg-indigo-50" : "border-gray-100 hover:border-indigo-300 hover:bg-indigo-50/40"}
                          `}
                        >
                          <button onClick={() => ef.status === "done" && setSelectedFile(ef)} disabled={ef.status === "extracting" || ef.status === "uploading" || isConfirmRequired} className="flex items-center gap-3 flex-1 text-left min-w-0">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 ${isConfirmRequired ? "bg-orange-100 text-orange-500" : "bg-indigo-50 text-indigo-600"}`}>
                              {ef.fileName.match(/\.(png|jpe?g|webp)$/i) ? "🖼️" : "📄"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-700 truncate">{ef.fileName}</p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {ef.status === "extracting" && (
                                  <span className="flex items-center gap-1 text-amber-500">
                                    <span className="inline-block animate-spin">⏳</span> Processing…
                                  </span>
                                )}
                                {ef.status === "uploading" && (
                                  <span className="flex items-center gap-1 text-blue-500">
                                    <span className="animate-pulse">⬆️</span> Uploading…
                                  </span>
                                )}
                                {ef.status === "done"  && <span className="text-green-600">✅ Ready to view</span>}
                                {ef.status === "error" && <span className="text-red-500">❌ Failed</span>}
                                {isConfirmRequired && (
                                  <span className="text-orange-500 font-medium">⚠️ Already exists</span>
                                )}
                              </p>
                            </div>
                          </button>

                          {isConfirmRequired && !progressModalOpen && (
                            <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                              <button onClick={handleConfirmOverride} className="text-xs font-medium px-2.5 py-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">Override</button>
                              <button onClick={handleCancelOverride} className="text-xs font-medium px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">Skip</button>
                            </div>
                          )}

                          {!isConfirmRequired && ef.status !== "extracting" && ef.status !== "uploading" && (
                            <button
                              onClick={() => {
                                dispatch(removeFile(ef.id));
                                if (selectedFile?.id === ef.id) setSelectedFile(null);
                              }}
                              className="text-red-400 hover:text-red-600 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            >✕</button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-4 mt-3 border-t border-gray-100 shrink-0">
                    <button onClick={handleSave} disabled={!canSave} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-lg transition-all">
                      {uploadsInProgress ? "Uploads in progress…" : "Save All Done Files"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="text-base font-semibold text-gray-800 mb-4">Recent Activity</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-100">
                    <th className="pb-2 font-medium">File</th>
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 font-medium">Amount</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivity.length === 0 && (<tr><td colSpan={5} className="text-center p-4 text-gray-400">No activity found</td></tr>)}
                  {recentActivity.map((row) => (
                    <tr key={row.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="py-3 font-medium text-gray-700">{row.file}</td>
                      <td className="py-3 text-gray-500">{row.type}</td>
                      <td className="py-3 text-gray-700 font-medium">{row.total_amount}</td>
                      <td className="py-3"><StatusBadge status={row.status} /></td>
                      <td className="py-3 text-gray-400">{row.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Preview Modals */}
      {user.role === "associate" && selectedFile && (
        <InvoicePreviewModal file={selectedFile} onClose={() => setSelectedFile(null)} onUpdate={(updatedFile) => { dispatch(updateFile(updatedFile)); setSelectedFile(updatedFile); }}/>
      )}
      {user.role === "admin" && selectedFile && (
        <PurchaseOrderPreviewModal file={selectedFile} onClose={() => setSelectedFile(null)} onUpdate={(updatedFile) => { dispatch(updateFile(updatedFile)); setSelectedFile(updatedFile); }} />
      )}

      {uploadsInProgress && (
        <div style={{ display: progressModalOpen ? undefined : "none" }}>
          <ProgressModal
            files={extractedFiles.filter((f) => f.status === "done" && f.extractedData)}
            submitFn={user.role === "associate" ? submitInvoice : submitPurchaseOrder}
            overrideFn={user.role === "associate" ? overrideInvoice : overridePurchaseOrder}
            pollFn={pollUploadStatus}
            onClose={handleCloseProgressModal}
            onSuccess={async (msg) => {
              setToast({ visible: true, message: msg, type: "success" });
              await fetchStats();
              await fetchRecentActivity();
            }}
            onError={(msg) => setToast({ visible: true, message: msg, type: "error" })}
            onConfirmationRequired={handleConfirmationRequired}
            confirmOverrideRef={confirmOverrideRef}
            cancelOverrideRef={cancelOverrideRef}
            onAllDone={handleAllDone}
          />
        </div>
      )}

      {confirmationFile && progressModalOpen && (<ConfirmationModal open={true} message={`"${confirmationFile.fileName}" already exists.`} onConfirm={handleConfirmOverride} onCancel={handleCancelOverride} />)}

      <AddUserModal open={addUserOpen} onClose={() => setAddUserOpen(false)} onSubmit={handleAddUser} />

      {toast.visible && (<Toast message={toast.message} type={toast.type} onClose={() => setToast({ visible: false, message: "", type: "info" })} />)}
    </div>
  );
}

export default Dashboard;