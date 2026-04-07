import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Navigate } from "react-router-dom";
import { type AppDispatch, type RootState } from "../../../app/store";
import { fetchUser } from "../../auth/slices/authSlice";

import Sidebar from "../components/sidebar";
import AddUserModal from "../components/create_user_modal";
import Toast from "../../../components/common/toast";
import { StatCards } from "../components/stat_cards";
import { VolumeChart } from "../components/volume_chart";
import { StatusPie } from "../components/status_pie";
import { AmountTrend } from "../components/amount_trend";
import { QuickStats } from "../components/quick_stats";
import { RecentActivity, toActivityRows } from "../components/recent_activity";

import {
  getDocumentCounts, getRecentActivity, createUser,
  getMonthlyVolumeData, getMonthlyAmountData, getQuickStats,
  type DocumentCounts, type RecentActivityItem,
} from "../services/dashboardService";

import type { ToastState } from "../../../types/toast";
import { BarChart2, UserPlus } from "lucide-react";
import logger from "../../../utils/logger";

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

const EMPTY_COUNTS: DocumentCounts = {
  total: 0, approved: 0, pending: 0, reviewed: 0, rejected: 0,
  total_invoices: 0, total_pos: 0,
};

export default function AdminDashboard() {
  const dispatch = useDispatch<AppDispatch>();
  const user     = useSelector((state: RootState) => state.auth.user);

  const [toast, setToast]         = useState<ToastState>({ visible: false, message: "", type: "info" });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [addUserOpen, setAddUserOpen] = useState(false);

  const [counts, setCounts]           = useState<DocumentCounts>(EMPTY_COUNTS);
  const [activityRows, setActivityRows] = useState<ReturnType<typeof toActivityRows>>([]);
  const [monthlyVolume, setMonthlyVolume] = useState<{ month: string; invoices: number; po: number }[]>([]);
  const [monthlyAmount, setMonthlyAmount] = useState<{ month: string; amount: number }[]>([]);
  const [quickStats, setQuickStats]   = useState({
    invoices_this_month: 0, po_this_month: 0,
    active_associates: 0,   amount_change_pct: 0,
  });

  const fetchStats = async () => {
    try {
      setCounts(await getDocumentCounts());
    } catch (err) { logger.error(err); }
  };

  const fetchActivity = async () => {
    try {
      const raw: RecentActivityItem[] = await getRecentActivity();
      setActivityRows(toActivityRows(raw));
    } catch (err) { logger.error(err); }
  };

  const fetchChartData = async () => {
    try {
      const [vol, amt, qs] = await Promise.all([
        getMonthlyVolumeData(), getMonthlyAmountData(), getQuickStats(),
      ]);
      setMonthlyVolume(vol);
      setMonthlyAmount(amt);
      setQuickStats(qs);
    } catch (err) { logger.error(err); }
  };

  useEffect(() => {
    dispatch(fetchUser());
    fetchStats();
    fetchActivity();
    fetchChartData();
  }, [dispatch]);

  const handleAddUser = async (data: {
    name: string; email: string; password: string; role: "associate" | "manager";
  }) => {
    try {
      await createUser(data);
      setToast({ visible: true, message: `User "${data.name}" added successfully!`, type: "success" });
    } catch (err: unknown) {
      const msg = isApiError(err)
        ? (err as ApiError).response?.data?.message ?? "Adding user failed!"
        : "Adding user failed!";
      setToast({ visible: true, message: msg, type: "error" });
    }
  };

  if (!user) return <Navigate to="/" />;
  if (user.role !== "admin") return <Navigate to="/associate-dashboard" />;

  const initials = user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase();

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
              <UserPlus className="w-4 h-4" /> Add User
            </button>
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-xs">
              {initials}
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <p className="text-xl font-bold text-gray-800">
              {getGreeting()}, {user.name.split(" ")[0]}
            </p>
            <p className="text-sm text-gray-500 mt-0.5">
              Here's what's happening with your documents today.
            </p>
          </div>

          <StatCards {...counts} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <VolumeChart data={monthlyVolume} />
            <StatusPie
              approved={counts.approved}
              pending={counts.pending}
              reviewed={counts.reviewed}
              rejected={counts.rejected}
            />
          </div>

          <AmountTrend data={monthlyAmount} changePercent={quickStats.amount_change_pct} />

          <QuickStats
            invoices_this_month={quickStats.invoices_this_month}
            po_this_month={quickStats.po_this_month}
            active_associates={quickStats.active_associates}
          />

          <RecentActivity rows={activityRows} />
        </main>
      </div>

      <AddUserModal
        open={addUserOpen}
        onClose={() => setAddUserOpen(false)}
        onSubmit={handleAddUser}
      />

      {toast.visible && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ visible: false, message: "", type: "info" })}
        />
      )}
    </div>
  );
}
