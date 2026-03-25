import { FileCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import Toast from "../../../components/common/toast";
import { login } from "../slices/authSlice";
import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "../hooks/authHook";
import type { ToastState } from "../../../types/toast";

function Login() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: "",
    type: "info",
  });

  const [formData, setFormData] = useState({
    email: "",
    password: ""
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      setFormData({...formData,[e.target.id]:e.target.value})
  }

  async function signin(e: FormEvent) {
    e.preventDefault();

    if(!formData.email || !formData.password) {
      setToast({
        visible: true,
        message: "Email and Password are required",
        type: "error",
      });
      return;
    }

    try {
      const user = await dispatch(login(formData)).unwrap();
      setToast({
        visible: true,
        message: "Login successful!",
        type: "success",
      });
      let path = "/";
      if(user.role == "admin")
        path = "/admin-dashboard";
      else if(user.role == "associate")
        path = "/associate-dashboard";
      setTimeout(()=>navigate(path), 2500);
    }
    catch (error: any) {
      setToast({
        visible: true,
        message: error?.response?.data?.message ?? error?.message ?? "Login failed. Try again!",
        type: "error",
      });
    }
  }

  return (
    <>
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6 py-12" style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
        {/* Logo */}
        <div className="mb-8 flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md">
            <FileCheck size={20} color="white" strokeWidth={2} />
          </div>
          <div>
            <p className="text-slate-900 font-bold text-base leading-tight">PayU</p>
            <p className="text-slate-400 text-xs leading-tight">Accounts Payable Assistant</p>
          </div>
        </div>

        {/* Card */}
        <div className="w-full max-w-100 bg-white border border-gray-200 rounded-2xl shadow-sm px-8 py-8">
          <div className="mb-7">
            <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
            <p className="text-sm text-slate-500 mt-1">Sign in to your PayU account</p>
          </div>

          <form onSubmit={signin} className="flex flex-col gap-5">
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Email</label>
              <input id="email" type="email" placeholder="you@company.com" value={formData.email} onChange={handleChange} className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900
                placeholder:text-slate-400 outline-none transition-all duration-150 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-400" />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Password</label>
              <input id="password" type="password" placeholder="Enter your password" value={formData.password} onChange={handleChange} className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900
              placeholder:text-slate-400 outline-none transition-all duration-150 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-400" />
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between -mt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 accent-blue-600" />
                <span className="text-sm text-slate-600">Remember me</span>
              </label>
              <button type="button" className="text-sm text-blue-600 hover:text-blue-800 font-medium">Forgot password?</button>
            </div>

            {/* Submit */}
            <button type="submit" className="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-all duration-150 shadow-sm hover:shadow-md mt-1 cursor-pointer">
              Sign in to PayU
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-7 text-xs text-slate-400 text-center leading-relaxed">&copy; 2026 PayU · Accounts Payable Assistant <br /> For access, contact your system administrator.</p>
      </div>

      {toast.visible && (<Toast message={toast.message} type={toast.type} onClose={() => setToast({visible: false, message: "", type:"info"})} />)}
    </>
  );
}

export default Login;