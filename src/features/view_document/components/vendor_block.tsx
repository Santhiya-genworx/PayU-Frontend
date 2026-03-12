import type { InvoiceData } from "../../../types/invoice";

function VendorBlock({ vendor }: { vendor: InvoiceData["vendor"] }) {
  const rows: { label: string; value: string; full?: boolean }[] = [
    { label: "Name", value: vendor.name },
    { label: "Email", value: vendor.email },
    { label: "Mobile", value: vendor.mobile_number },
    { label: "GST No.", value: vendor.gst_number },
    { label: "Country", value: vendor.country_code },
    { label: "Bank", value: vendor.bank_name },
    { label: "Account Holder", value: vendor.account_holder_name },
    { label: "Account No.", value: vendor.account_number },
    { label: "IFSC", value: vendor.ifsc_code },
    { label: "Address", value: vendor.address, full: true },
  ];
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Vendor Info</p>
      <div className="grid grid-cols-2 gap-y-3 gap-x-4">
        {rows.map(r => (
          <div key={r.label} className={r.full ? "col-span-2" : ""}>
            <p className="text-xs text-gray-400">{r.label}</p>
            <p className="text-sm font-medium text-gray-800 wrap-break-word">{r.value || "—"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default VendorBlock;