export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted text-sm">
      <div className="h-8 w-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
      {label}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="card border-tag-pink-text/30 bg-tag-pink-bg/60 text-tag-pink-text text-sm">
      {message}
    </div>
  );
}
