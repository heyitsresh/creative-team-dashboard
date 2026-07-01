// Small shared display helpers used by any "line-per-task" table in the app
// (the by-person queue table, the by-client task table, etc.) so status/
// priority dot colors and date formatting stay consistent everywhere.

const DOT_PALETTE = ["#6C5CE7", "#E0529C", "#F5A623", "#1FAA59", "#3D7BFD", "#B983FF"];

const PRIORITY_COLOR: Record<string, string> = {
  highest: "#E0529C",
  high: "#E0529C",
  medium: "#F5A623",
  low: "#1FAA59",
  lowest: "#1FAA59",
};

export function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function statusDotColor(status: string) {
  let hash = 0;
  for (let i = 0; i < status.length; i++) hash = status.charCodeAt(i) + ((hash << 5) - hash);
  return DOT_PALETTE[Math.abs(hash) % DOT_PALETTE.length];
}

export function priorityDotColor(priority: string | null) {
  if (!priority) return "#8C8AA0";
  return PRIORITY_COLOR[priority.toLowerCase()] || "#8C8AA0";
}
