import { CHART_COLORS } from "@/lib/metrics";

export function BarList({
  data,
  max,
}: {
  data: { name: string; value: number }[];
  max?: number;
}) {
  const top = max ? data.slice(0, max) : data;
  const highest = Math.max(1, ...top.map((d) => d.value));

  return (
    <div className="flex flex-col gap-3">
      {top.map((d, i) => (
        <div key={d.name} className="flex items-center gap-3">
          <span className="text-sm w-32 truncate text-ink/80" title={d.name}>
            {d.name}
          </span>
          <div className="flex-1 h-2.5 bg-line/50 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(d.value / highest) * 100}%`,
                backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
              }}
            />
          </div>
          <span className="text-sm font-medium w-8 text-right">{d.value}</span>
        </div>
      ))}
      {top.length === 0 && (
        <p className="text-sm text-muted">No data yet.</p>
      )}
    </div>
  );
}
