import { getDailyVerse } from "@/lib/verse";
import { Sym } from "@/components/ui/primitives";

export async function DailyVerse() {
  const verse = await getDailyVerse();
  if (!verse) return null;
  return (
    <div className="card p-5">
      <p className="flex items-center gap-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
        <Sym name="menu_book" className="text-[16px]" /> Palavra do dia
      </p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-base leading-relaxed">
        “{verse.text}”
      </p>
      {verse.reference && <p className="mt-2 text-sm font-medium">{verse.reference}</p>}
    </div>
  );
}

export function DailyVerseSkeleton() {
  return <div className="h-28 animate-pulse rounded-[var(--radius-lg)] bg-muted" />;
}
