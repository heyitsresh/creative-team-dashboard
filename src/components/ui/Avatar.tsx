const RING_COLORS = [
  "bg-primary",
  "bg-tag-pink-text",
  "bg-tag-yellow-text",
  "bg-tag-green-text",
  "bg-tag-blue-text",
];

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function colorFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const palette = ["#6C5CE7", "#E0529C", "#B9790A", "#1FAA59", "#3D7BFD"];
  return palette[Math.abs(hash) % palette.length];
}

export function Avatar({
  name,
  size = 28,
}: {
  name: string;
  size?: number;
}) {
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-semibold shrink-0 ring-2 ring-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        backgroundColor: colorFor(name || "?"),
      }}
      title={name}
    >
      {initials(name || "?")}
    </div>
  );
}

export function AvatarStack({
  names,
  max = 4,
  size = 26,
}: {
  names: string[];
  max?: number;
  size?: number;
}) {
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;
  return (
    <div className="flex items-center">
      {shown.map((n, i) => (
        <div key={n + i} style={{ marginLeft: i === 0 ? 0 : -8 }}>
          <Avatar name={n} size={size} />
        </div>
      ))}
      {rest > 0 && (
        <div
          className="rounded-full bg-line flex items-center justify-center text-ink/60 font-semibold ring-2 ring-white"
          style={{ width: size, height: size, fontSize: size * 0.34, marginLeft: -8 }}
        >
          +{rest}
        </div>
      )}
    </div>
  );
}
