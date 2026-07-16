"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

interface Props {
  data: { week: number; tackles: number; sacks: number }[];
}

export default function DefensiveStatChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e2d47" vertical={false} />
        <XAxis
          dataKey="week"
          tick={{ fill: "#6b7280", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `Wk ${v}`}
        />
        <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ background: "#0d1627", border: "1px solid #1e2d47", borderRadius: 8 }}
          labelStyle={{ color: "#FFCB05" }}
          itemStyle={{ color: "#f0f0f0" }}
          labelFormatter={(v) => `Week ${v}`}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, color: "#6b7280", paddingTop: 8 }}
          formatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)}
        />
        <Bar dataKey="tackles" fill="#FFCB05" radius={[3, 3, 0, 0]} />
        <Bar dataKey="sacks" fill="#60a5fa" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
