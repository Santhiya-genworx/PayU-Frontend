import { TrendingUp } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface AmountTrendProps {
  data: { month: string; amount: number }[];
  changePercent: number;
}

export function AmountTrend({ data, changePercent }: AmountTrendProps) {
  const isPositive = changePercent >= 0;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Invoice Amount Trend</h3>
          <p className="text-xs text-gray-400 mt-0.5">Total processed amount over time (₹)</p>
        </div>
        <div
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${
            isPositive ? "text-emerald-600 bg-emerald-50" : "text-red-500 bg-red-50"
          }`}
        >
          <TrendingUp className="w-3 h-3" />
          {isPositive ? "+" : ""}{changePercent.toFixed(1)}% this month
        </div>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="amountGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0}    />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
            formatter={(v) =>
              v != null ? [`₹${Number(v).toLocaleString("en-IN")}`, "Amount"] : ["—", "Amount"]
            }
          />
          <Area
            type="monotone"
            dataKey="amount"
            stroke="#2563eb"
            strokeWidth={2}
            fill="url(#amountGrad)"
            dot={{ fill: "#2563eb", r: 3 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
