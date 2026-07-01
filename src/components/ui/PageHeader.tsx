import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
  tabs,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  tabs?: ReactNode;
}) {
  return (
    <div className="mb-6 animate-fade-slide-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
          {description && (
            <p className="text-muted text-sm mt-1.5 max-w-xl">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {tabs && <div className="flex items-center gap-2 mt-5">{tabs}</div>}
    </div>
  );
}

export function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`btn-press px-4 py-2 rounded-pill text-sm font-medium transition-colors ${
        active
          ? "bg-primary text-white"
          : "bg-white border border-line text-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
