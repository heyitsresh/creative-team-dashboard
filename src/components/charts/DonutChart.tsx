import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { CHART_COLORS } from "@/lib/metrics";

export function DonutChart({
  data,
  height = 220,
  showLegend = true,
}: {
  data: { name: string; value: number }[];
  height?: number;
  /** Renders a scrollable color-key legend under the chart (on by default — a plain donut with no labels is unreadable past 4-5 slices). */
  showLegend?: boolean;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-muted py-10 text-center">No data yet.</p>;
  }
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="60%"
            outerRadius="90%"
            paddingAngle={2}
            strokeWidth={0}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: 10,
              border: "1px solid #E7E3DA",
              fontSize: 13,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      {showLegend && (
        <ul className="mt-3 max-h-40 overflow-y-auto pr-1 space-y-1.5">
          {data.map((d, i) => (
            <li key={d.name} className="flex items-center justify-between gap-3 text-xs">
              <span className="flex items-center gap-2 min-w-0 text-ink/70">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                />
                <span className="truncate">{d.name}</span>
              </span>
              <span className="text-muted shrink-0">
                {d.value}
                <span className="text-muted/60"> · {total ? Math.round((d.value / total) * 100) : 0}%</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
