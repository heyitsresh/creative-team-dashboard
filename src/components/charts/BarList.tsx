import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CHART_COLORS } from "@/lib/metrics";

export function BarList({
  data,
  max,
  getHref,
  onRowClick,
}: {
  data: { name: string; value: number }[];
  max?: number;
  /** When provided, each row becomes a clickable link (e.g. drill into that client's health card). */
  getHref?: (d: { name: string; value: number }) => string;
  /** Alternative to getHref — call this instead of navigating (e.g. swap to an in-page detail view). Ignored if getHref is also set. */
  onRowClick?: (d: { name: string; value: number }) => void;
}) {
  const top = max ? data.slice(0, max) : data;
  const highest = Math.max(1, ...top.map((d) => d.value));

  return (
    <div className="flex flex-col gap-1">
      {top.map((d, i) => {
        const row = (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-sm w-32 truncate text-ink/80" title={d.name}>
              {d.name}
            </span>
            <div className="flex-1 h-2.5 bg-line/50 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${(d.value / highest) * 100}%`,
                  backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                }}
              />
            </div>
            <span className="text-sm font-medium w-8 text-right">{d.value}</span>
          </div>
        );

        if (getHref) {
          return (
            <Link
              key={d.name}
              href={getHref(d)}
              className="group flex items-center gap-2 -mx-2 px-2 py-1.5 rounded-lg transition-colors duration-150 hover:bg-primary-light/60"
            >
              {row}
              <ArrowRight
                size={14}
                className="text-primary shrink-0 opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0"
              />
            </Link>
          );
        }

        if (onRowClick) {
          return (
            <button
              key={d.name}
              onClick={() => onRowClick(d)}
              className="group flex items-center gap-2 -mx-2 px-2 py-1.5 rounded-lg transition-colors duration-150 hover:bg-primary-light/60 text-left w-full"
            >
              {row}
              <ArrowRight
                size={14}
                className="text-primary shrink-0 opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0"
              />
            </button>
          );
        }

        return (
          <div key={d.name} className="py-1.5">
            {row}
          </div>
        );
      })}
      {top.length === 0 && (
        <p className="text-sm text-muted">No data yet.</p>
      )}
    </div>
  );
}
