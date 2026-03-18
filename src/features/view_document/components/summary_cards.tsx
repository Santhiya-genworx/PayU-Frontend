import { FileText, CheckCircle2, Clock, AlertTriangle, TrendingUp } from "lucide-react";
import { formatCurrency } from "../../../lib/formatCurrency";

interface InvoiceStats {
  total_invoices: number;
  total_value: number;
  approved_count: number;
  approved_value: number;
  pending_count: number;
  pending_value: number;
  rejected_count: number;
  rejected_value: number;
}

export default function InvoiceSummaryCards({ stats }: { stats: InvoiceStats }) {
  const cards = [
    {
      label: "Total Invoices",
      value: (stats.total_invoices ?? 0).toString(),
      sub: formatCurrency(stats.total_value ?? 0),
      icon: <FileText className="w-5 h-5" />,
      gradient: "from-blue-500 to-blue-600",
      lightBg: "bg-blue-50",
      iconColor: "text-blue-600",
      textColor: "text-blue-700",
      subColor: "text-blue-500",
      border: "border-blue-100",
      pill: "bg-blue-100 text-blue-700",
      pillLabel: "All time",
      barColor: "bg-blue-500",
      barWidth: "w-full",
    },
    {
      label: "Approved",
      value: (stats.approved_count ?? 0).toString(),
      sub: formatCurrency(stats.approved_value ?? 0),
      icon: <CheckCircle2 className="w-5 h-5" />,
      gradient: "from-emerald-500 to-emerald-600",
      lightBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      textColor: "text-emerald-700",
      subColor: "text-emerald-500",
      border: "border-emerald-100",
      pill: "bg-emerald-100 text-emerald-700",
      pillLabel: "Processed",
      barColor: "bg-emerald-500",
      barWidth: stats.total_invoices > 0 ? `${Math.round(((stats.approved_count ?? 0) / stats.total_invoices) * 100)}%` : "0%",
    },
    {
      label: "Pending Review",
      value: (stats.pending_count ?? 0).toString(),
      sub: formatCurrency(stats.pending_value ?? 0),
      icon: <Clock className="w-5 h-5" />,
      gradient: "from-amber-500 to-amber-600",
      lightBg: "bg-amber-50",
      iconColor: "text-amber-600",
      textColor: "text-amber-700",
      subColor: "text-amber-500",
      border: "border-amber-100",
      pill: "bg-amber-100 text-amber-700",
      pillLabel: "Awaiting",
      barColor: "bg-amber-400",
      barWidth: stats.total_invoices > 0
        ? `${Math.round(((stats.pending_count ?? 0) / stats.total_invoices) * 100)}%`
        : "0%",
    },
    {
      label: "Rejected",
      value: (stats.rejected_count ?? 0).toString(),
      sub: formatCurrency(stats.rejected_value ?? 0),
      icon: <AlertTriangle className="w-5 h-5" />,
      gradient: "from-red-500 to-red-600",
      lightBg: "bg-red-50",
      iconColor: "text-red-600",
      textColor: "text-red-700",
      subColor: "text-red-500",
      border: "border-red-100",
      pill: "bg-red-100 text-red-700",
      pillLabel: "Declined",
      barColor: "bg-red-400",
      barWidth: stats.total_invoices > 0
        ? `${Math.round(((stats.rejected_count ?? 0) / stats.total_invoices) * 100)}%`
        : "0%",
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`relative bg-white rounded-2xl border ${card.border} overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200`}
        >
          {/* Colored top bar */}
          <div className={`h-1 w-full bg-linear-to-r ${card.gradient}`} />

          <div className="p-5">
            {/* Header row */}
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl ${card.lightBg} flex items-center justify-center ${card.iconColor}`}>
                {card.icon}
              </div>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${card.pill}`}>
                {card.pillLabel}
              </span>
            </div>

            {/* Value */}
            <p className="text-3xl font-bold text-gray-900 tabular-nums">{card.value}</p>

            {/* Label */}
            <p className="text-sm font-medium text-gray-500 mt-0.5">{card.label}</p>

            {/* Divider */}
            <div className="my-3 border-t border-gray-100" />

            {/* Sub value with trend icon */}
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold ${card.subColor}`}>{card.sub}</span>
              <TrendingUp className={`w-3.5 h-3.5 ${card.subColor} opacity-70`} />
            </div>

            {/* Progress bar */}
            <div className="mt-3 h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${card.barColor} rounded-full transition-all duration-700`}
                style={{ width: card.barWidth }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}