type Status = "approved" | "pending" | "reviewed" | "rejected";

const config: Record<Status, { bg: string; text: string; dot: string; label: string }> = {
  approved: { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500", label: "Approved" },
  pending:  { bg: "bg-amber-100",   text: "text-amber-700",   dot: "bg-amber-400",   label: "Pending"  },
  reviewed: { bg: "bg-blue-100",    text: "text-blue-700",    dot: "bg-blue-500",    label: "Reviewed" },
  rejected: { bg: "bg-red-100",     text: "text-red-700",     dot: "bg-red-500",     label: "Rejected" },
};

export default function InvoiceStatusBadge({ status }: { status: Status }) {
  const c = config[status] ?? config["pending"];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}
