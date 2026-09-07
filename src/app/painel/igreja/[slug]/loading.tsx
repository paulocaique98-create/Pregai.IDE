export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-52 rounded bg-muted" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="h-20 rounded-[var(--radius-lg)] bg-muted" />
        <div className="h-20 rounded-[var(--radius-lg)] bg-muted" />
        <div className="h-20 rounded-[var(--radius-lg)] bg-muted" />
        <div className="h-20 rounded-[var(--radius-lg)] bg-muted" />
      </div>
      <div className="h-64 rounded-[var(--radius-lg)] bg-muted" />
    </div>
  );
}
