"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface Props {
  data: { week: number; yards: number; touchdowns: number }[];
  dataKey?: string;
}

export default function PlayerStatChart({ data, dataKey = "yards" }: Props) {
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
        <Bar dataKey={dataKey} fill="#FFCB05" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
