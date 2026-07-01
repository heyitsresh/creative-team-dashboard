import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CountUp } from "@/components/ui/CountUp";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`card animate-fade-slide-in ${className}`}>{children}</div>;
}

const GRADIENTS: Record<string, string> = {
  violet: "from-[#6C5CE7] to-[#8B7CF6]",
  pink: "from-[#E0529C] to-[#F17FB8]",
  orange: "from-[#F5A623] to-[#F9C868]",
  teal: "from-[#1FAA59] to-[#3FCB7A]",
};

export function StatCard({
  label,
  value,
  sublabel,
  icon: Icon,
  gradient,
  href,
}: {
  label: string;
  value: number;
  sublabel?: string;
  icon?: LucideIcon;
  gradient?: "violet" | "pink" | "orange" | "teal";
  /** Optional destination — makes the card clickable/tappable with a hover + press animation. */
  href?: string;
}) {
  const clickable = Boolean(href);
  const interactiveClasses = clickable
    ? "cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-cardHover active:scale-[0.97] active:duration-75"
    : "";

  if (gradient) {
    const content = (
      <div
        className={`group relative overflow-hidden rounded-card p-5 flex flex-col gap-3 text-white bg-gradient-to-br ${GRADIENTS[gradient]} shadow-card animate-fade-slide-in ${interactiveClasses}`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-white/80">{label}</span>
          {Icon && (
            <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Icon size={16} />
            </div>
          )}
        </div>
        <span className="text-3xl font-bold tracking-tight">
          <CountUp value={value} />
        </span>
        {sublabel && <span className="text-xs text-white/70">{sublabel}</span>}
        {clickable && (
          <ArrowRight
            size={16}
            className="absolute bottom-4 right-4 opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0"
          />
        )}
      </div>
    );
    return href ? (
      <Link href={href} className="block">
        {content}
      </Link>
    ) : (
      content
    );
  }

  const content = (
    <div className={`group relative card flex flex-col gap-1 min-w-[150px] animate-fade-slide-in ${interactiveClasses}`}>
      <div className="flex items-center justify-between">
        <span className="label-caps">{label}</span>
        {Icon && (
          <div className="h-7 w-7 rounded-lg bg-primary-light flex items-center justify-center">
            <Icon size={14} className="text-primary" />
          </div>
        )}
      </div>
      <span className="stat-number">
        <CountUp value={value} />
      </span>
      {sublabel && <span className="text-xs text-muted">{sublabel}</span>}
      {clickable && (
        <ArrowRight
          size={14}
          className="absolute bottom-4 right-4 text-primary opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0"
        />
      )}
    </div>
  );
  return href ? (
    <Link href={href} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}

const TAG_TONES = [
  { bg: "bg-tag-purple-bg", text: "text-tag-purple-text" },
  { bg: "bg-tag-pink-bg", text: "text-tag-pink-text" },
  { bg: "bg-tag-yellow-bg", text: "text-tag-yellow-text" },
  { bg: "bg-tag-green-bg", text: "text-tag-green-text" },
  { bg: "bg-tag-blue-bg", text: "text-tag-blue-text" },
];

function hashTone(key: string) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash);
  return TAG_TONES[Math.abs(hash) % TAG_TONES.length];
}

/**
 * Pastel tag pill. Pass `tone` for a fixed semantic color (success/warning/
 * danger/default), or omit it and pass any string as children/key to get a
 * deterministic pastel color from the palette (used for content-type tags,
 * matching the reference design's Design/Brand/Illustration pill style).
 */
export function Pill({
  children,
  tone,
  colorKey,
}: {
  children: ReactNode;
  tone?: "default" | "success" | "warning" | "danger";
  colorKey?: string;
}) {
  if (tone) {
    const tones: Record<string, string> = {
      default: "bg-line text-ink/70",
      success: "bg-tag-green-bg text-tag-green-text",
      warning: "bg-tag-yellow-bg text-tag-yellow-text",
      danger: "bg-tag-pink-bg text-tag-pink-text",
    };
    return <span className={`pill ${tones[tone]}`}>{children}</span>;
  }
  const { bg, text } = hashTone(colorKey ?? String(children));
  return <span className={`pill ${bg} ${text}`}>{children}</span>;
}
