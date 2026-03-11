function fmt(n: number, code = "INR") {
  const symbol = code === "INR" ? "₹" : code;
  return `${symbol} ${Number(n).toLocaleString("en-IN")}`;
}

function SummaryBar({ stats }: { stats: any }) {

  const cards = [
    {
      label: "Total Invoices",
      text: stats.total_invoices,
      sub: fmt(stats.invoice_value),
      accent: "border-t-blue-600"
    },
    {
      label: "Purchase Orders",
      text: stats.total_pos,
      sub: fmt(stats.po_value),
      accent: "border-t-violet-600"
    },
    {
      label: "Total Documents",
      text: stats.total_invoices + stats.total_pos,
      sub: "Combined",
      accent: "border-t-indigo-500"
    },
    {
      label: "Invoice Value",
      text: fmt(stats.invoice_value),
      sub: "All invoices",
      accent: "border-t-green-600"
    },
    {
      label: "PO Value",
      text: fmt(stats.po_value),
      sub: "All POs",
      accent: "border-t-amber-500"
    }
    ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map(c => (
        <div key={c.label} className={`bg-white rounded-xl shadow-sm border-t-4 ${c.accent} p-5`}>
          <p className="text-sm text-gray-500 font-medium">{c.label}</p>
          <p className="text-2xl font-bold text-gray-800 mt-1 truncate">{c.text}</p>
          <p className="text-xs text-gray-400 mt-1">{c.sub}</p>
        </div>
      ))}
    </div>
  );
}

export default SummaryBar;