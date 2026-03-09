import { useState, useEffect } from "react";
import type { POData, OrderedItem } from "../../../types/purchase_order";
import type { ExtractedFile } from "../../../types/process";

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string | number;
  onChange: (val: string) => void;
  type?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
        {label}
      </label>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all"
      />
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 mt-2">
      <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest whitespace-nowrap">
        {title}
      </p>
      <div className="flex-1 h-px bg-indigo-100" />
    </div>
  );
}

export default function PurchaseOrderPreviewModal({
  file,
  onClose,
  onUpdate,
}: {
  file: ExtractedFile;
  onClose: () => void;
  onUpdate: (updatedFile: ExtractedFile) => void;
}) {
  const emptyForm: POData = {
    po_id: "",
    gl_code: "",
    ordered_date: "",
    currency_code: "",
    total_amount: 0,
    vendor: {
      name: "",
      email: "",
      address: "",
      country_code: "",
      mobile_number: "",
      gst_number: "",
      bank_name: "",
      account_holder_name: "",
      account_number: "",
      ifsc_code: "",
    },
    ordered_items: [],
    file_url: ""
  };

  const [form, setForm] = useState<POData>(emptyForm);

  const handleUpdate = () => {
    const updatedFile: ExtractedFile = {
      ...file,
      extractedData: form,
      type: "po",
      status: "done",
    };
    onUpdate(updatedFile);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  useEffect(() => {
    if (!file?.extractedData) return;

    const raw = file.extractedData as Partial<POData>;

    setForm({
      po_id: raw.po_id ?? "",
      gl_code: raw.gl_code ?? "",
      ordered_date: raw.ordered_date ?? "",
      currency_code: raw.currency_code ?? "",
      total_amount: raw.total_amount ?? 0,
      vendor: {
        name: raw.vendor?.name ?? "",
        email: raw.vendor?.email ?? "",
        address: raw.vendor?.address ?? "",
        country_code: raw.vendor?.country_code ?? "",
        mobile_number: raw.vendor?.mobile_number ?? "",
        gst_number: raw.vendor?.gst_number ?? "",
        bank_name: raw.vendor?.bank_name ?? "",
        account_holder_name: raw.vendor?.account_holder_name ?? "",
        account_number: raw.vendor?.account_number ?? "",
        ifsc_code: raw.vendor?.ifsc_code ?? "",
      },
      ordered_items: raw.ordered_items ?? [],
      file_url: raw.file_url ?? ""
    });
  }, [file.extractedData]);

  const set = (path: string, val: string) => {
    setForm((prev) => {
      const next = structuredClone(prev);
      const keys = path.split(".");
      let cur: any = next;

      for (let i = 0; i < keys.length - 1; i++) {
        cur = cur[keys[i]];
      }

      const lastKey = keys[keys.length - 1];

      cur[lastKey] = ["quantity", "unit_price", "total_price", "total_amount"].includes(
        lastKey
      )
        ? Number(val)
        : val;

      return next;
    });
  };

  const setItem = (i: number, key: keyof OrderedItem, val: string) => {
    setForm((prev) => {
      const items = structuredClone(prev.ordered_items);
      (items[i] as any)[key] = ["quantity", "unit_price", "total_price"].includes(key)
        ? Number(val)
        : val;
      return { ...prev, ordered_items: items };
    });
  };

  const removeItem = (i: number) => {
    setForm((prev) => ({
      ...prev,
      ordered_items: prev.ordered_items.filter((_, idx) => idx !== i),
    }));
  };

  const isImage = /\.(png|jpe?g|webp)$/i.test(file.file.name);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-gray-100 shrink-0">
          <div>
            <p className="text-sm font-semibold text-gray-800">{file.fileName}</p>
            <p className="text-xs text-gray-400">Purchase Order Preview & Edit</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden divide-x divide-gray-100">

          {/* LEFT — Editable Fields */}
          <div className="w-1/2 overflow-y-auto p-5 flex flex-col gap-3">

            {file.status === "extracting" && (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-6 justify-center">
                <span className="animate-spin inline-block">⏳</span> Extracting data…
              </div>
            )}
            {file.status === "error" && (
              <p className="text-sm text-red-500 py-6 text-center">
                Extraction failed. You can fill in manually.
              </p>
            )}

            {/* PO Info */}
            <SectionTitle title="Purchase Order Info" />
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="PO ID"
                value={form.po_id}
                onChange={(v) => set("po_id", v)}
              />
              <Field
                label="GL Code"
                value={form.gl_code}
                onChange={(v) => set("gl_code", v)}
              />
              <Field
                label="Ordered Date"
                value={form.ordered_date}
                type="date"
                onChange={(v) => set("ordered_date", v)}
              />
              <Field
                label="Total Amount"
                value={form.total_amount}
                type="number"
                onChange={(v) => set("total_amount", v)}
              />
            </div>

            {/* Vendor */}
            <SectionTitle title="Vendor Details" />
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Vendor Name"
                value={form.vendor.name}
                onChange={(v) => set("vendor.name", v)}
              />
              <Field
                label="Email"
                value={form.vendor.email}
                type="email"
                onChange={(v) => set("vendor.email", v)}
              />
              <div className="col-span-2">
                <Field
                  label="Address"
                  value={form.vendor.address}
                  onChange={(v) => set("vendor.address", v)}
                />
              </div>
              <Field
                label="Country Code"
                value={form.vendor.country_code}
                onChange={(v) => set("vendor.country_code", v)}
              />
              <Field
                label="Mobile Number"
                value={form.vendor.mobile_number}
                onChange={(v) => set("vendor.mobile_number", v)}
              />
              <Field
                label="GST Number"
                value={form.vendor.gst_number}
                onChange={(v) => set("vendor.gst_number", v)}
              />
              <Field
                label="Bank Name"
                value={form.vendor.bank_name}
                onChange={(v) => set("vendor.bank_name", v)}
              />
              <Field
                label="Account Holder"
                value={form.vendor.account_holder_name}
                onChange={(v) => set("vendor.account_holder_name", v)}
              />
              <Field
                label="Account Number"
                value={form.vendor.account_number}
                onChange={(v) => set("vendor.account_number", v)}
              />
              <Field
                label="IFSC Code"
                value={form.vendor.ifsc_code}
                onChange={(v) => set("vendor.ifsc_code", v)}
              />
            </div>

            {/* Ordered Items */}
            <div className="flex items-center justify-between mt-2">
              <SectionTitle title="Ordered Items" />
            </div>
            <div className="flex flex-col gap-2">
              {form.ordered_items.map((item, i) => (
                <div
                  key={i}
                  className="border border-gray-100 rounded-xl p-3 bg-gray-50 flex flex-col gap-2 relative group"
                >
                  <button
                    onClick={() => removeItem(i)}
                    className="absolute top-2 right-2 text-red-300 hover:text-red-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove item"
                  >
                    ✕
                  </button>
                  <Field
                    label="Description"
                    value={item.item_description}
                    onChange={(v) => setItem(i, "item_description", v)}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <Field
                      label="Qty"
                      value={item.quantity}
                      type="number"
                      onChange={(v) => setItem(i, "quantity", v)}
                    />
                    <Field
                      label="Unit Price"
                      value={item.unit_price}
                      type="number"
                      onChange={(v) => setItem(i, "unit_price", v)}
                    />
                    <Field
                      label="Total Price"
                      value={item.total_price}
                      type="number"
                      onChange={(v) => setItem(i, "total_price", v)}
                    />
                  </div>
                </div>
              ))}
              {form.ordered_items.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-3">
                  No items yet. Click "+ Add Item" to add one.
                </p>
              )}
            </div>
          </div>

          {/* RIGHT — File Preview */}
          <div className="w-1/2 flex flex-col overflow-hidden bg-gray-50">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-5 pt-4 pb-2 shrink-0">
              File Preview
            </p>
            {isImage ? (
  <div className="flex-1 overflow-y-auto p-4">
    <img
      src={URL.createObjectURL(file.file)}
      alt={file.fileName}
      className="rounded-xl w-full object-contain shadow-sm"
    />
  </div>
) : (
  <iframe
    src={URL.createObjectURL(file.file)}
    className="flex-1 w-full border-0"
    title="PO File Preview"
  />
)}
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="border-t border-gray-100 px-6 py-3 flex justify-end gap-3 shrink-0 bg-white">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleUpdate}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-all shadow-sm"
          >
            Update
          </button>
        </div>
      </div>
    </div>
  );
}