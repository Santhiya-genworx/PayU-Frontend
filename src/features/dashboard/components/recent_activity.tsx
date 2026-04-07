import { Activity, LinkIcon } from "lucide-react";
import type { RecentActivityItem } from "../services/dashboardService";

type DocStatus = "approved" | "pending" | "reviewed" | "rejected";

interface ActivityRow {
  id:            number;
  group_id:      number;
  invoices:      string[];
  pos:           string[];
  status:        DocStatus;
  is_po_matched: boolean | null;
  total_amount:  string;
  invoice_count: number;
  date:          string;
}

function StatusBadge({ status }: { status: DocStatus }) {
  const cfg: Record<DocStatus, string> = {
    approved: "bg-emerald-50 text-emerald-700 border border-emerald-100",
    pending:  "bg-amber-50 text-amber-700 border border-amber-100",
    reviewed: "bg-blue-50 text-blue-700 border border-blue-100",
    rejected: "bg-red-50 text-red-700 border border-red-100",
  };
  const labels: Record<DocStatus, string> = {
    approved: "Approved",
    pending:  "Pending",
    reviewed: "Reviewed",
    rejected: "Rejected",
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg[status]}`}>
      {labels[status]}
    </span>
  );
}

function IdPills({
  ids,
  colorClass,
  max = 2,
}: {
  ids: string[];
  colorClass: string;
  max?: number;
}) {
  const visible  = ids.slice(0, max);
  const overflow = ids.length - max;
  return (
    <div className="flex flex-wrap gap-1 items-center">
      {visible.map((id) => (
        <span
          key={id}
          className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-medium ${colorClass}`}
        >
          {id}
        </span>
      ))}
      {overflow > 0 && <span className="text-[10px] text-gray-400">+{overflow}</span>}
    </div>
  );
}

/** Convert raw RecentActivityItem[] from the API into display rows */
export function toActivityRows(items: RecentActivityItem[]): ActivityRow[] {
  return items.map((item, index) => ({
    id:            index,
    group_id:      item.group_id,
    invoices:      item.invoices ?? [],
    pos:           item.pos      ?? [],
    status:        (item.status ?? "pending") as DocStatus,
    is_po_matched: item.is_po_matched ?? null,
    // total_amount is already the accumulated sum across all group invoices
    total_amount: `₹ ${Number(item.total_amount ?? 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`,
    invoice_count: (item.invoices ?? []).length,
    date:          item.invoice_date ?? item.updated_at ?? "",
  }));
}

interface RecentActivityProps {
  rows: ActivityRow[];
}

export function RecentActivity({ rows }: RecentActivityProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-gray-500" />
        <h2 className="text-sm font-semibold text-gray-800">Recent Activity</h2>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full ml-1">
          matching groups
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="pb-2.5 text-left text-xs font-medium text-gray-400">Invoices</th>
              <th className="pb-2.5 text-left text-xs font-medium text-gray-400">POs Linked</th>
              <th className="pb-2.5 text-left text-xs font-medium text-gray-400">
                Amount
                <span className="ml-1 font-normal text-gray-300">(all invoices)</span>
              </th>
              <th className="pb-2.5 text-left text-xs font-medium text-gray-400">Status</th>
              <th className="pb-2.5 text-left text-xs font-medium text-gray-400">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-gray-400">
                  No recent activity
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="py-3">
                  {row.invoices.length > 0 ? (
                    <IdPills ids={row.invoices} colorClass="bg-gray-100 text-gray-700" max={2} />
                  ) : (
                    <span className="text-xs text-gray-300 italic">—</span>
                  )}
                </td>
                <td className="py-3">
                  {row.pos.length > 0 ? (
                    <IdPills ids={row.pos} colorClass="bg-violet-50 text-violet-700" max={2} />
                  ) : (
                    <span className="text-xs text-gray-300 italic flex items-center gap-1">
                      <LinkIcon className="w-3 h-3" /> No PO
                    </span>
                  )}
                </td>
                <td className="py-3 text-gray-700 font-medium text-xs">
                  {row.total_amount}
                  {row.invoice_count > 1 && (
                    <span className="ml-1 text-[10px] text-gray-400 font-normal">
                      ({row.invoice_count} inv)
                    </span>
                  )}
                </td>
                <td className="py-3">
                  <StatusBadge status={row.status} />
                </td>
                <td className="py-3 text-gray-400 text-xs">{row.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
