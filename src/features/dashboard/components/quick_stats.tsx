import { Receipt, ShoppingCart, Users } from "lucide-react";

interface QuickStatsProps {
  invoices_this_month: number;
  po_this_month: number;
  active_associates: number;
}

export function QuickStats({ invoices_this_month, po_this_month, active_associates }: QuickStatsProps) {
  const items = [
    {
      label: "Invoices (this month)",
      value: invoices_this_month,
      icon: <Receipt className="w-5 h-5" />,
      bg: "bg-blue-50 text-blue-600",
    },
    {
      label: "Purchase Orders (this month)",
      value: po_this_month,
      icon: <ShoppingCart className="w-5 h-5" />,
      bg: "bg-violet-50 text-violet-600",
    },
    {
      label: "Active Associates",
      value: active_associates,
      icon: <Users className="w-5 h-5" />,
      bg: "bg-emerald-50 text-emerald-600",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-center gap-3"
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.bg}`}>
            {item.icon}
          </div>
          <div>
            <p className="text-xs text-gray-400">{item.label}</p>
            <p className="text-lg font-bold text-gray-800">{item.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
