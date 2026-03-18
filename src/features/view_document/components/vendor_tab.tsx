import { Building2, MapPin, Mail, Phone, FileCheck, Landmark, User, Globe } from "lucide-react";
import type { Vendor } from "../../../types/process";

export default function InvoiceVendorTab({ vendor }: { vendor: Vendor }) {
  const phone = vendor.mobile_number ? `${vendor.country_code ?? ""} ${vendor.mobile_number}`.trim() : "";

  const sections = [
    {
      title: "Company Info",
      icon: <Building2 className="w-3.5 h-3.5" />,
      items: [
        { icon: <Building2 className="w-3.5 h-3.5" />, label: "Company Name", value: vendor.name       },
        { icon: <MapPin    className="w-3.5 h-3.5" />, label: "Address",      value: vendor.address    },
        { icon: <Globe     className="w-3.5 h-3.5" />, label: "Country",      value: vendor.country_code },
      ].filter(i => i.value),
    },
    {
      title: "Contact",
      icon: <Mail className="w-3.5 h-3.5" />,
      items: [
        { icon: <Mail  className="w-3.5 h-3.5" />, label: "Email", value: vendor.email },
        { icon: <Phone className="w-3.5 h-3.5" />, label: "Phone", value: phone        },
      ].filter(i => i.value),
    },
    {
      title: "Tax & Compliance",
      icon: <FileCheck className="w-3.5 h-3.5" />,
      items: [
        { icon: <FileCheck className="w-3.5 h-3.5" />, label: "GST Number", value: vendor.gst_number },
      ].filter(i => i.value),
    },
    {
      title: "Banking Details",
      icon: <Landmark className="w-3.5 h-3.5" />,
      items: [
        { icon: <Landmark className="w-3.5 h-3.5" />, label: "Bank Name",       value: vendor.bank_name           },
        { icon: <User     className="w-3.5 h-3.5" />, label: "Account Holder",  value: vendor.account_holder_name },
        { icon: <Landmark className="w-3.5 h-3.5" />, label: "Account Number",  value: vendor.account_number      },
        { icon: <Landmark className="w-3.5 h-3.5" />, label: "IFSC Code",       value: vendor.ifsc_code           },
      ].filter(i => i.value),
    },
  ].filter(s => s.items.length > 0);

  return (
    <div className="space-y-4">
      {/* Vendor avatar card */}
      <div className="bg-blue-600 rounded-xl p-4 flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center text-white text-lg font-bold shrink-0">
          {vendor.name?.charAt(0)?.toUpperCase() ?? "V"}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-white text-sm leading-tight truncate">{vendor.name}</p>
          {vendor.email && <p className="text-xs text-blue-200 mt-0.5 truncate">{vendor.email}</p>}
        </div>
      </div>

      {/* Sections */}
      {sections.map((section) => (
        <div key={section.title} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {/* Section header — consistent gray */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
            <span className="text-gray-400">{section.icon}</span>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{section.title}</p>
          </div>
          {/* Rows */}
          <div className="divide-y divide-gray-50">
            {section.items.map((item) => (
              <div key={item.label} className="flex items-start gap-3 px-4 py-3">
                <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 shrink-0 mt-0.5">
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{item.label}</p>
                  <p className="text-sm font-medium text-gray-800 break-all mt-0.5">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
