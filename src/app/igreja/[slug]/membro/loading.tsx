export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-7 w-40 rounded bg-muted" />
      <div className="h-28 rounded-[var(--radius-lg)] bg-muted" />
      <div className="h-40 rounded-[var(--radius-lg)] bg-muted" />
      <div className="h-24 rounded-[var(--radius-lg)] bg-muted" />
    </div>
  );
}
