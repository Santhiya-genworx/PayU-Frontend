import { FileCheck, LogOut } from "lucide-react";
import { logout } from "../../auth/slices/authSlice";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import Toast from "../../../components/common/toast";
import { useAppDispatch } from "../../auth/hooks/authHook";
import type { User } from "../../../types/user";

interface NavItem {
  icon: string;
  label: string;
  path?: string;
}

const NAV_ITEMS: NavItem[] = [
  { icon: "⊞", label: "Dashboard", path: "/dashboard" },
  { icon: "☰", label: "All Documents", path: "/documents" },
];

function Sidebar({ open, onClose, user }: { open: boolean; onClose: () => void; user: User & { initials: string }; }) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [showToast, setShowToast] = useState(false);
  const [message, setMessage] = useState("");
  const [msgType, setMsgType] = useState<"info" | "success" | "error">("info");

  const handleLogout = () => {
    try {
      dispatch(logout()).unwrap();
      navigate("/", { replace: true });
    } catch (error) {
      setMessage("Logout failed. Try again!");
      setMsgType("error");
      setShowToast(true);
    }
  };

  const handleNavigation = (path?: string) => {
    if (!path) return;
    navigate(path);
    onClose();
  };

  return (
    <>
      {open && (<div className="fixed inset-0 bg-black/30 z-20" onClick={onClose} />)}

      <aside className={`fixed top-0 left-0 h-full w-60 bg-gray-900 text-white flex flex-col z-30 transform transition-transform duration-200 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Header */}
        <div className="p-5 flex items-center justify-between border-b border-gray-700">
          <div className="text-xl font-bold flex items-center gap-2">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md">
              <FileCheck size={20} color="white" strokeWidth={2} />
            </div>
            <p>PayU</p>
          </div>

          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 flex flex-col gap-2">
          {NAV_ITEMS.map((item) => (
            <button key={item.label} onClick={() => handleNavigation(item.path)} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 transition-colors cursor-pointer">
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-4 border-t border-gray-700 flex flex-col gap-3 items-center">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">
              {user.initials}
            </div>
            <span className="truncate">{user.name}</span>
          </div>

          <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer text-red-400 hover:bg-gray-800 hover:text-red-300 transition-colors">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {showToast && (<Toast message={message} type={msgType} onClose={() => setShowToast(false)} />)}
    </>
  );
}

export default Sidebar;