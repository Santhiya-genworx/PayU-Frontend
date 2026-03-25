import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Navigate } from "react-router-dom";
import { type AppDispatch, type RootState } from "../../../app/store";
import Sidebar from "../components/sidebar";
import {
  getDocumentCounts, getRecentActivity, createUser,
  getMonthlyVolumeData, getMonthlyAmountData, getQuickStats,
} from "../services/dashboardService";
import type { ToastState } from "../../../types/toast";
import Toast from "../../../components/common/toast";
import { fetchUser } from "../../auth/slices/authSlice";
import AddUserModal from "../components/create_user_modal";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from "recharts";
import {
  FileText, CheckCircle, Clock, XCircle, Users, TrendingUp,
  ShoppingCart, Receipt, Activity, UserPlus, BarChart2,
} from "lucide-react";
import logger from "../../../utils/logger";

type DocStatus = "approved" | "pending" | "reviewed" | "rejected";

interface ActivityRow {
  id: number;
  invoice_id: string;
  po_id: string | null;
  status: DocStatus;
  is_po_matched: boolean;
  total_amount: string;
  date: string;
}

// Raw shape returned by getRecentActivity() before formatting
interface RawActivityItem {
  invoice_id: string;
  po_id?: string | null;
  status?: string;
  is_po_matched?: boolean;
  total_amount: string | number;
  invoice_date?: string;
}

// Axios-style error shape
interface ApiError {
  response?: { data?: { message?: string } };
  message?: string;
}

function isApiError(err: unknown): err is ApiError {
  return typeof err === "object" && err !== null;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function StatusBadge({ status }: { status: DocStatus }) {
  const cfg: Record<DocStatus, string> = {
    approved: "bg-emerald-50 text-emerald-700 border border-emerald-100",
    pending:  "bg-amber-50 text-amber-700 border border-amber-100",
    reviewed: "bg-blue-50 text-blue-700 border border-blue-100",
    rejected: "bg-red-50 text-red-700 border border-red-100",
  };
  const labels: Record<DocStatus, string> = { approved: "Approved", pending: "Pending", reviewed: "Reviewed", rejected: "Rejected" };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg[status]}`}>
      {labels[status]}
    </span>
  );
}

const STATUS_COLORS: Record<string, string> = {
  Approved: "#10b981",
  Pending:  "#f59e0b",
  Reviewed: "#2563eb",
  Rejected: "#ef4444",
};

export default function AdminDashboard() {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const loading = useSelector((state: RootState) => state.auth.loading);

  const [authChecked, setAuthChecked]       = useState(false);
  const [toast, setToast]                   = useState<ToastState>({ visible: false, message: "", type: "info" });
  const [sidebarOpen, setSidebarOpen]       = useState(false);
  const [addUserOpen, setAddUserOpen]       = useState(false);
  const [stats, setStats]                   = useState({ total: 0, approved: 0, pending: 0, reviewed: 0, rejected: 0 });
  const [recentActivity, setRecentActivity] = useState<ActivityRow[]>([]);
  const [monthlyVolume, setMonthlyVolume]   = useState<{ month: string; invoices: number; po: number }[]>([]);
  const [monthlyAmount, setMonthlyAmount]   = useState<{ month: string; amount: number }[]>([]);
  const [quickStats, setQuickStats]         = useState({ invoices_this_month: 0, po_this_month: 0, active_associates: 0, amount_change_pct: 0 });

  const fetchStats = async () => {
    try {
      const { total, approved, pending, reviewed, rejected } = await getDocumentCounts();
      setStats({ total, approved, pending, reviewed, rejected });
    } catch (err) { logger.error(err); }
  };

  const fetchActivity = async () => {
    try {
      const data = await getRecentActivity();
      const formatted: ActivityRow[] = (data as RawActivityItem[]).map((item, index) => ({
        id:            index,
        invoice_id:    item.invoice_id,
        po_id:         item.po_id ?? null,
        status:        (item.status ?? "pending") as DocStatus,
        is_po_matched: !!item.is_po_matched,
        total_amount:  `₹ ${Number(item.total_amount).toLocaleString("en-IN")}`,
        date:          item.invoice_date ?? "",
      }));
      setRecentActivity(formatted);
    } catch (err) { logger.error(err); }
  };

  const fetchChartData = async () => {
    try {
      const [volumeData, amountData, qStats] = await Promise.all([
        getMonthlyVolumeData(),
        getMonthlyAmountData(),
        getQuickStats(),
      ]);
      setMonthlyVolume(volumeData);
      setMonthlyAmount(amountData);
      setQuickStats(qStats);
    } catch (err) { logger.error(err); }
  };

  useEffect(() => {
    const init = async () => { await dispatch(fetchUser()); setAuthChecked(true); };
    init();
    fetchStats();
    fetchActivity();
    fetchChartData();
  }, [dispatch]);

  const handleAddUser = async (data: { name: string; email: string; password: string; role: "associate" | "manager" }) => {
    try {
      await createUser(data);
      setToast({ visible: true, message: `User "${data.name}" added successfully!`, type: "success" });
    } catch (err: unknown) {
      const apiErr = isApiError(err) ? err : {};
      const message = (apiErr as ApiError).response?.data?.message ?? "Adding user failed!";
      setToast({ visible: true, message, type: "error" });
    }
  };

  if (!authChecked || loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return <Navigate to="/" />;
  if (user.role !== "admin") return <Navigate to="/associate-dashboard" />;

  const initials = user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase();
  const successRate = stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0;

  const pieData = [
    { name: "Approved", value: stats.approved },
    { name: "Pending",  value: stats.pending  },
    { name: "Reviewed", value: stats.reviewed },
    { name: "Rejected", value: stats.rejected },
  ].filter(d => d.value > 0);

  const statCards = [
    { label: "Total Documents", value: stats.total,    icon: <FileText className="w-5 h-5" />,     light: "bg-blue-50 text-blue-600"    },
    { label: "Approved",        value: stats.approved, icon: <CheckCircle className="w-5 h-5" />,  light: "bg-emerald-50 text-emerald-600" },
    { label: "Pending",         value: stats.pending,  icon: <Clock className="w-5 h-5" />,        light: "bg-amber-50 text-amber-600"  },
    { label: "Reviewed",        value: stats.reviewed, icon: <Clock className="w-5 h-5" />,        light: "bg-blue-50 text-blue-500"    },
    { label: "Rejected",        value: stats.rejected, icon: <XCircle className="w-5 h-5" />,      light: "bg-red-50 text-red-600"      },
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
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
                <BarChart2 className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-base font-semibold text-gray-800">Admin Dashboard</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAddUserOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              Add User
            </button>
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-xs">{initials}</div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Greeting */}
          <div>
            <p className="text-xl font-bold text-gray-800">{getGreeting()}, {user.name.split(" ")[0]}</p>
            <p className="text-sm text-gray-500 mt-0.5">Here's what's happening with your documents today.</p>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {statCards.map((card) => (
              <div key={card.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-gray-500">{card.label}</span>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.light}`}>
                    {card.icon}
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-800">{card.value.toLocaleString("en-IN")}</p>
                {card.label === "Approved" && (
                  <p className="text-xs text-emerald-600 font-medium mt-1">{successRate}% success rate</p>
                )}
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">Document Volume</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Invoices vs Purchase Orders (last 6 months)</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-600 inline-block" />Invoices</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />PO</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyVolume} barSize={12} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }} />
                  <Bar dataKey="invoices" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="po" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-800">Status Distribution</h3>
                <p className="text-xs text-gray-400 mt-0.5">All documents</p>
              </div>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="45%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? "#6b7280"} />
                      ))}
                    </Pie>
                    <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-sm text-gray-400">No data yet</div>
              )}
            </div>
          </div>

          {/* Area chart */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">Invoice Amount Trend</h3>
                <p className="text-xs text-gray-400 mt-0.5">Total processed amount over time (₹)</p>
              </div>
              <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${quickStats.amount_change_pct >= 0 ? "text-emerald-600 bg-emerald-50" : "text-red-500 bg-red-50"}`}>
                <TrendingUp className="w-3 h-3" />
                {quickStats.amount_change_pct >= 0 ? "+" : ""}{quickStats.amount_change_pct.toFixed(1)}% this month
              </div>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={monthlyAmount}>
                <defs>
                  <linearGradient id="amountGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                  formatter={(v) => v != null ? [`₹${Number(v).toLocaleString("en-IN")}`, "Amount"] : ["—", "Amount"]}
                />
                <Area type="monotone" dataKey="amount" stroke="#2563eb" strokeWidth={2} fill="url(#amountGrad)" dot={{ fill: "#2563eb", r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600"><Receipt className="w-5 h-5" /></div>
              <div>
                <p className="text-xs text-gray-400">Invoices (this month)</p>
                <p className="text-lg font-bold text-gray-800">{quickStats.invoices_this_month}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600"><ShoppingCart className="w-5 h-5" /></div>
              <div>
                <p className="text-xs text-gray-400">Purchase Orders</p>
                <p className="text-lg font-bold text-gray-800">{quickStats.po_this_month}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600"><Users className="w-5 h-5" /></div>
              <div>
                <p className="text-xs text-gray-400">Active Associates</p>
                <p className="text-lg font-bold text-gray-800">{quickStats.active_associates}</p>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-800">Recent Activity</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-2.5 text-left text-xs font-medium text-gray-400">Invoice ID</th>
                    <th className="pb-2.5 text-left text-xs font-medium text-gray-400">PO Linked</th>
                    <th className="pb-2.5 text-left text-xs font-medium text-gray-400">Amount</th>
                    <th className="pb-2.5 text-left text-xs font-medium text-gray-400">Status</th>
                    <th className="pb-2.5 text-left text-xs font-medium text-gray-400">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentActivity.length === 0 && (
                    <tr><td colSpan={5} className="py-8 text-center text-sm text-gray-400">No recent activity</td></tr>
                  )}
                  {recentActivity.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3 font-medium text-gray-700 text-xs font-mono">{row.invoice_id}</td>
                      <td className="py-3">
                        {row.po_id ? (
                          <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 font-medium">{row.po_id}</span>
                        ) : (
                          <span className="text-xs text-gray-300 italic">No PO</span>
                        )}
                      </td>
                      <td className="py-3 text-gray-700 font-medium text-xs">{row.total_amount}</td>
                      <td className="py-3"><StatusBadge status={row.status} /></td>
                      <td className="py-3 text-gray-400 text-xs">{row.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      <AddUserModal open={addUserOpen} onClose={() => setAddUserOpen(false)} onSubmit={handleAddUser} />
      {toast.visible && <Toast message={toast.message} type={toast.type} onClose={() => setToast({ visible: false, message: "", type: "info" })} />}
    </div>
  );
}