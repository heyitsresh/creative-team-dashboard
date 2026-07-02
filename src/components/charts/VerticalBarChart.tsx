import { useRouter } from "next/router";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { CHART_COLORS } from "@/lib/metrics";

/**
 * Column (vertical-bar) chart — the horizontal BarList reads great for a
 * handful of rows, but it caps out fast (each row eats a full line of
 * height). Turning it sideways lets a wide card show many more categories
 * at once, scrolling horizontally past whatever doesn't fit at a glance
 * instead of just truncating the list.
 */
export function VerticalBarChart({
  data,
  getHref,
  height = 280,
  barWidth = 56,
}: {
  data: { name: string; value: number }[];
  getHref?: (d: { name: string; value: number }) => string;
  height?: number;
  barWidth?: number;
}) {
  const router = useRouter();

  if (data.length === 0) {
    return <p className="text-sm text-muted py-10 text-center">No data yet.</p>;
  }

  const minWidth = Math.max(data.length * barWidth, 320);

  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <div style={{ width: minWidth, minWidth: "100%" }}>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 44 }}>
            <CartesianGrid stroke="#E7E3DA" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "#8A857B" }}
              axisLine={false}
              tickLine={false}
              interval={0}
              angle={-38}
              textAnchor="end"
              height={60}
              tickFormatter={(v: string) => (v.length > 16 ? `${v.slice(0, 15)}…` : v)}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#8A857B" }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              width={34}
            />
            <Tooltip
              cursor={{ fill: "rgba(108,92,231,0.06)" }}
              contentStyle={{ borderRadius: 10, border: "1px solid #E7E3DA", fontSize: 13 }}
            />
            <Bar
              dataKey="value"
              radius={[6, 6, 0, 0]}
              cursor={getHref ? "pointer" : undefined}
              onClick={(d: { name: string; value: number }) => {
                if (getHref) router.push(getHref(d));
              }}
            >
              {data.map((d, i) => (
                <Cell key={d.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
