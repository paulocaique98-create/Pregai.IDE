import type { ReactNode } from "react";

export function Sym({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-outlined ${className}`} aria-hidden>
      {name}
    </span>
  );
}

export function Kicker({ children }: { children: ReactNode }) {
  return (
    <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
      {children}
    </span>
  );
}

export function PageHeader({
  kicker,
  title,
  description,
  actions,
}: {
  kicker?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        {kicker && <Kicker>{kicker}</Kicker>}
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-[1.75rem] font-semibold leading-tight tracking-tight md:text-[2rem]">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function SectionHeading({
  kicker,
  title,
  aside,
}: {
  kicker?: string;
  title: string;
  aside?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
      <div>
        {kicker && <Kicker>{kicker}</Kicker>}
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
          {title}
        </h2>
      </div>
      {aside && <div className="text-sm text-muted-foreground">{aside}</div>}
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  icon,
  progress,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: string;
  progress?: number;
}) {
  return (
    <div className="card min-w-0 p-3 sm:p-4">
      <div className="flex items-start justify-between gap-1.5">
        <span className="min-w-0 text-[0.625rem] font-medium uppercase leading-tight tracking-wide text-muted-foreground sm:text-[0.6875rem]">
          {label}
        </span>
        {icon && (
          <Sym name={icon} className="shrink-0 text-[16px] text-muted-foreground sm:text-[18px]" />
        )}
      </div>
      <div className="mt-2 flex items-baseline gap-1.5 sm:mt-3">
        <span className="text-xl font-semibold tabular-nums tracking-tight sm:text-2xl">
          {value}
        </span>
        {hint && <span className="truncate text-xs text-muted-foreground">{hint}</span>}
      </div>
      {typeof progress === "number" && (
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary"
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function Badge({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "solid" | "outline";
}) {
  const cls =
    tone === "solid"
      ? "bg-primary text-primary-foreground"
      : tone === "outline"
        ? "border border-border text-foreground"
        : "bg-muted text-muted-foreground";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[var(--radius)] px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide ${cls}`}
    >
      {children}
    </span>
  );
}

export function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
      {initials || "?"}
    </span>
  );
}

export function EmptyState({ icon, children }: { icon?: string; children: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-12 text-center">
      {icon && <Sym name={icon} className="text-[28px] text-muted-foreground" />}
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
