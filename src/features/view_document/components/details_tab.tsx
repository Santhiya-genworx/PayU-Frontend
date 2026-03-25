import { Calendar, Hash, CreditCard, Receipt, Tag, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { InvoiceData } from "../../../types/invoice";
import { formatCurrency } from "../../../lib/formatCurrency";

export default function InvoiceDetailsTab({ invoice }: { invoice: InvoiceData }) {
  // po_id set but not matched in DB
  const poUnmatched = invoice.po_id && !invoice.is_po_matched;

  const metaFields = [
    { icon: <Hash className="w-3.5 h-3.5 text-gray-400" />,       label: "Invoice ID",      value: invoice.invoice_id                         },
    { icon: <Receipt className="w-3.5 h-3.5 text-gray-400" />,    label: "PO Reference",    value: invoice.po_id || "—"                        },
    { icon: <Calendar className="w-3.5 h-3.5 text-gray-400" />,   label: "Invoice Date",    value: invoice.invoice_date                        },
    { icon: <Clock className="w-3.5 h-3.5 text-gray-400" />,      label: "Due Date",        value: invoice.due_date                            },
    { icon: <CreditCard className="w-3.5 h-3.5 text-gray-400" />, label: "Currency",        value: invoice.currency_code                       },
    // matching_status from InvoiceMatching (pending/approved/reviewed/rejected)
    { icon: <Tag className="w-3.5 h-3.5 text-gray-400" />,        label: "Matching Status", value: invoice.matching_status ?? "pending"        },
  ];

  return (
    <div className="space-y-5">

      {/* PO unmatched warning */}
      {poUnmatched && (
        <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
          <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-orange-700">PO Not Matched</p>
            <p className="text-[11px] text-orange-600 mt-0.5 leading-relaxed">
              The referenced PO <span className="font-mono font-semibold">{invoice.po_id}</span> was not found in the system. This invoice may need manual verification.
            </p>
          </div>
        </div>
      )}

      {/* PO matched banner */}
      {invoice.po_id && invoice.is_po_matched && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-emerald-700">PO Matched</p>
            <p className="text-[11px] text-emerald-600 mt-0.5">
              Matched to <span className="font-mono font-semibold">{invoice.po_id}</span>
            </p>
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Invoice Information</p>
        <div className="grid grid-cols-2 gap-2">
          {metaFields.map((f) => (
            <div key={f.label} className="bg-white rounded-lg border border-gray-100 p-3">
              <div className="flex items-center gap-1.5 mb-1.5">{f.icon}<span className="text-[11px] font-medium text-gray-400">{f.label}</span></div>
              <p className="text-sm font-semibold text-gray-800 truncate capitalize">{f.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Line Items</p>
        <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500">Description</th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500">Qty</th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500 hidden sm:table-cell">Rate</th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.invoice_items?.map((item, i) => (
                <tr key={i} className={`border-t border-gray-50 ${i % 2 === 1 ? "bg-gray-50/40" : ""}`}>
                  <td className="px-3 py-2.5 text-gray-700 text-xs">{item.item_description}</td>
                  <td className="px-3 py-2.5 text-right text-xs text-gray-600">{item.quantity}</td>
                  <td className="px-3 py-2.5 text-right text-xs text-gray-500 hidden sm:table-cell">
                    {item.unit_price ? formatCurrency(item.unit_price, invoice.currency_code) : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right text-xs font-semibold text-gray-800">
                    {formatCurrency(item.total_price, invoice.currency_code)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 space-y-2">
          <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span className="font-medium text-gray-700">{formatCurrency(invoice.subtotal, invoice.currency_code)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-gray-500">Tax</span><span className="font-medium text-gray-700">{formatCurrency(invoice.tax_amount, invoice.currency_code)}</span></div>
          {invoice.discount_amount > 0 && (
            <div className="flex justify-between text-sm"><span className="text-gray-500">Discount</span><span className="font-medium text-emerald-600">−{formatCurrency(invoice.discount_amount, invoice.currency_code)}</span></div>
          )}
        </div>
        <div className="bg-blue-500 px-4 py-3 flex justify-between items-center">
          <span className="text-sm font-semibold text-white">Total Amount</span>
          <span className="text-base font-bold text-white">{formatCurrency(invoice.total_amount, invoice.currency_code)}</span>
        </div>
      </div>
    </div>
  );
}