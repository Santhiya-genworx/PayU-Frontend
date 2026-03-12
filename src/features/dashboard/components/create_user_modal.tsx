import { useState } from "react";

interface AddUserModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; email: string; password: string; role: "associate" | "manager" }) => Promise<void> | void;
}

interface FormState {
  name: string;
  email: string;
  password: string;
  role: "associate" | "manager" | "";
}

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  role?: string;
}

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};

  if (!form.name.trim()) {
    errors.name = "Full name is required.";
  } else if (form.name.trim().length < 2) {
    errors.name = "Name must be at least 2 characters.";
  }

  if (!form.email.trim()) {
    errors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  if (!form.password) {
    errors.password = "Password is required.";
  } else if (form.password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  } else if (!/[A-Z]/.test(form.password)) {
    errors.password = "Must include at least one uppercase letter.";
  } else if (!/[0-9]/.test(form.password)) {
    errors.password = "Must include at least one number.";
  }

  if (!form.role) {
    errors.role = "Please select a role.";
  }

  return errors;
}

export default function AddUserModal({ open, onClose, onSubmit }: AddUserModalProps) {
  const [form, setForm] = useState<FormState>({ name: "", email: "", password: "", role: "" });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});

  if (!open) return null;

  const handleChange = (field: keyof FormState, value: string) => {
    const updated = { ...form, [field]: value };
    setForm(updated);
    if (touched[field]) {
      setErrors(validate(updated));
    }
  };

  const handleBlur = (field: keyof FormState) => {
    setTouched((t) => ({ ...t, [field]: true }));
    setErrors(validate(form));
  };

  const handleSubmit = async () => {
    const allTouched = { name: true, email: true, password: true, role: true };
    setTouched(allTouched);
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      await onSubmit({ name: form.name.trim(), email: form.email.trim(), password: form.password, role: form.role as "associate" | "manager" });
      setForm({ name: "", email: "", password: "", role: "" });
      setTouched({});
      setErrors({});
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setForm({ name: "", email: "", password: "", role: "" });
    setTouched({});
    setErrors({});
    onClose();
  };

  const inputBase = "w-full px-3.5 py-2.5 rounded-lg border text-sm text-gray-800 placeholder-gray-400 outline-none transition-all focus:ring-2";
  const inputOk = "border-gray-200 bg-white focus:border-indigo-400 focus:ring-indigo-100";
  const inputErr = "border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-100";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && handleClose()}>
      {/* Modal */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-[fadeInScale_0.18s_ease-out]">
        {/* Header */}
        <div className="bg-linear-to-r from-indigo-600 to-indigo-500 px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold text-lg">Add New User</h2>
            <p className="text-indigo-200 text-xs mt-0.5">Fill in the details to create an account</p>
          </div>
          <button onClick={handleClose} className="text-indigo-200 hover:text-white text-xl font-bold leading-none transition-colors">×</button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Full Name</label>
            <input type="text" placeholder="your name" value={form.name} onChange={(e) => handleChange("name", e.target.value)} onBlur={() => handleBlur("name")} className={`${inputBase} ${errors.name && touched.name ? inputErr : inputOk}`} />
            {errors.name && touched.name && (<p className="text-xs text-red-500 mt-1">{errors.name}</p>)}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email Address</label>
            <input type="email" placeholder="you.gmail.com" value={form.email} onChange={(e) => handleChange("email", e.target.value)} onBlur={() => handleBlur("email")} className={`${inputBase} ${errors.email && touched.email ? inputErr : inputOk}`} />
            {errors.email && touched.email && (<p className="text-xs text-red-500 mt-1">{errors.email}</p>)}
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Password</label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} placeholder="Min 8 chars, 1 uppercase, 1 number" value={form.password} onChange={(e) => handleChange("password", e.target.value)} onBlur={() => handleBlur("password")} className={`${inputBase} pr-10 ${errors.password && touched.password ? inputErr : inputOk}`} />
              <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs select-none">{showPassword ? "Hide" : "Show"}</button>
            </div>
            {errors.password && touched.password && (<p className="text-xs text-red-500 mt-1">{errors.password}</p>)}
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Role</label>
            <div className="flex gap-3">
              {(["associate", "manager"] as const).map((r) => (
                <button key={r} type="button" onClick={() => { handleChange("role", r); setTouched((t) => ({ ...t, role: true })); }} className={`flex-1 py-2.5 rounded-lg border text-sm font-medium capitalize transition-all
                    ${form.role === r
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-100"
                      : errors.role && touched.role
                      ? "border-red-300 text-gray-600 hover:border-red-400"
                      : "border-gray-200 text-gray-600 hover:border-indigo-300 hover:bg-indigo-50/50"
                    }`}
                >
                  {r === "associate" ? "🧾 Associate" : "🗂️ Manager"}
                </button>
              ))}
            </div>
            {errors.role && touched.role && (<p className="text-xs text-red-500 mt-1">{errors.role}</p>)}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex gap-3">
          <button onClick={handleClose} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={loading} className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2">
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Creating…
              </>
            ) : (
              "Add User"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}