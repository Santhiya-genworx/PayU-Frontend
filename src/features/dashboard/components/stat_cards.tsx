import { FileText, CheckCircle, Clock, XCircle, Layers } from "lucide-react";

export type DocStatus = "approved" | "pending" | "reviewed" | "rejected";

interface StatCardsProps {
  total: number;
  approved: number;
  pending: number;
  reviewed: number;
  rejected: number;
  total_invoices: number;
  total_pos: number;
}

export function StatCards({
  total, approved, pending, reviewed, rejected, total_invoices, total_pos,
}: StatCardsProps) {
  const successRate = total > 0 ? Math.round((approved / total) * 100) : 0;

  const cards = [
    {
      label: "Matching Groups",
      value: total,
      icon: <Layers className="w-5 h-5" />,
      light: "bg-blue-50 text-blue-600",
      sub: `${total_invoices} invoice${total_invoices !== 1 ? "s" : ""} · ${total_pos} PO${total_pos !== 1 ? "s" : ""}`,
      extra: null,
    },
    {
      label: "Approved",
      value: approved,
      icon: <CheckCircle className="w-5 h-5" />,
      light: "bg-emerald-50 text-emerald-600",
      sub: null,
      extra: <p className="text-xs text-emerald-600 font-medium mt-1">{successRate}% success rate</p>,
    },
    {
      label: "Pending",
      value: pending,
      icon: <Clock className="w-5 h-5" />,
      light: "bg-amber-50 text-amber-600",
      sub: null,
      extra: null,
    },
    {
      label: "Reviewed",
      value: reviewed,
      icon: <Clock className="w-5 h-5" />,
      light: "bg-blue-50 text-blue-500",
      sub: null,
      extra: null,
    },
    {
      label: "Rejected",
      value: rejected,
      icon: <XCircle className="w-5 h-5" />,
      light: "bg-red-50 text-red-600",
      sub: null,
      extra: null,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-500">{card.label}</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.light}`}>
              {card.icon}
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800">{card.value.toLocaleString("en-IN")}</p>
          {card.extra}
          {card.sub && (
            <p className="text-[11px] text-gray-400 font-medium mt-1.5 flex items-center gap-1">
              <FileText className="w-3 h-3 shrink-0" />
              {card.sub}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
