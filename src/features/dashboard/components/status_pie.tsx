import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from "recharts";

const STATUS_COLORS: Record<string, string> = {
  Approved: "#10b981",
  Pending:  "#f59e0b",
  Reviewed: "#2563eb",
  Rejected: "#ef4444",
};

interface StatusPieProps {
  approved: number;
  pending: number;
  reviewed: number;
  rejected: number;
}

export function StatusPie({ approved, pending, reviewed, rejected }: StatusPieProps) {
  const pieData = [
    { name: "Approved", value: approved },
    { name: "Pending",  value: pending  },
    { name: "Reviewed", value: reviewed },
    { name: "Rejected", value: rejected },
  ].filter((d) => d.value > 0);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-800">Status Distribution</h3>
        <p className="text-xs text-gray-400 mt-0.5">Matching groups by status</p>
      </div>
      {pieData.length > 0 ? (
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%" cy="45%"
              innerRadius={55} outerRadius={80}
              paddingAngle={3}
              dataKey="value"
            >
              {pieData.map((entry) => (
                <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? "#6b7280"} />
              ))}
            </Pie>
            <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-48 flex items-center justify-center text-sm text-gray-400">No data yet</div>
      )}
    </div>
  );
}
