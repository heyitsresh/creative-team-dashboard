import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { CHART_COLORS } from "@/lib/metrics";

export function TrendLine({
  data,
  series,
  height = 260,
}: {
  data: Record<string, string | number>[];
  series: string[];
  height?: number;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-muted py-10 text-center">No data yet.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid stroke="#E7E3DA" vertical={false} />
        <XAxis dataKey="period" tick={{ fontSize: 12, fill: "#8A857B" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 12, fill: "#8A857B" }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ borderRadius: 10, border: "1px solid #E7E3DA", fontSize: 13 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s, i) => (
          <Line
            key={s}
            type="monotone"
            dataKey={s}
            stroke={CHART_COLORS[i % CHART_COLORS.length]}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
