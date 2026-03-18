import { FileCheck, LogOut, LayoutDashboard, FileText, ShoppingCart } from "lucide-react";
import { logout } from "../../auth/slices/authSlice";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import Toast from "../../../components/common/toast";
import { useAppDispatch } from "../../auth/hooks/authHook";
import type { User } from "../../../types/user";
import type { ToastState } from "../../../types/toast";

interface NavItem {
  icon: React.ReactNode;
  label: string;
  path?: string;
  users: string[];
}

function Sidebar({ open, onClose, user }: { open: boolean; onClose: () => void; user: User & { initials: string }; }) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [toast, setToast] = useState<ToastState>({ visible: false, message: "", type: "info" });

  const nav_items: NavItem[] = [
    { icon: <LayoutDashboard className="w-4 h-4" />, label: "Dashboard",       path: user?.role === "admin" ? "/admin-dashboard" : "/associate-dashboard", users: ["admin", "associate"] },
    { icon: <FileText className="w-4 h-4" />,        label: "Invoices",        path: "/invoices",        users: ["admin"] },
    { icon: <ShoppingCart className="w-4 h-4" />,    label: "Purchase Orders", path: "/purchase-orders", users: ["admin"] },
  ];

  const handleLogout = () => {
    try {
      dispatch(logout()).unwrap();
      navigate("/", { replace: true });
    } catch {
      setToast({ visible: true, message: "Logout failed. Try again!", type: "error" });
    }
  };

  const handleNavigation = (path?: string) => {
    if (!path) return;
    navigate(path);
    onClose();
  };

  const currentPath = window.location.pathname;

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/30 z-20" onClick={onClose} />}

      <aside className={`fixed top-0 left-0 h-full w-58 bg-gray-900 text-white flex flex-col z-30 transform transition-transform duration-200 ${open ? "translate-x-0" : "-translate-x-full"}`}
        style={{ width: 232 }}>
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
              <FileCheck size={16} color="white" strokeWidth={2} />
            </div>
            <span className="text-base font-bold text-white">PayU</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white flex items-center justify-center transition-colors text-sm">✕</button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 flex flex-col gap-0.5">
          {nav_items
            .filter((item) => item.users.includes(user?.role))
            .map((item) => {
              const isActive = currentPath === item.path;
              return (
                <button
                  key={item.label}
                  onClick={() => handleNavigation(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer
                    ${isActive ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-800 hover:text-white"}`}
                >
                  {item.icon}
                  {item.label}
                </button>
              );
            })}
        </nav>

        {/* Logout + User badge */}
        <div className="p-3 border-t border-gray-800 flex flex-col justify-center gap-2">
          
          <div className="flex items-center gap-2.5 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold shrink-0">{user.initials}</div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user.name}</p>
              <p className="text-[11px] text-gray-400 capitalize">{user.role}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-gray-800 hover:text-red-300 transition-colors cursor-pointer"
          >
            <LogOut size={15} /> Logout
          </button>
        </div>
      </aside>

      {toast.visible && <Toast message={toast.message} type={toast.type} onClose={() => setToast({ visible: false, message: "", type: "info" })} />}
    </>
  );
}

export default Sidebar;