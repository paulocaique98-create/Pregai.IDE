import { createClient } from "@/lib/supabase/server";
import { Sym } from "@/components/ui/primitives";
import { ConfirmButtons } from "./ConfirmButtons";

const fmt = (d: string) =>
  new Date(d + "T12:00").toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

export const metadata = { title: "Confirmar escala", robots: { index: false } };

export default async function ConfirmarPage({
  params,
}: PageProps<"/confirmar/[token]">) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("assignment_by_token", { p_token: token });
  const a = data as {
    found: boolean;
    status?: string;
    role?: string;
    date?: string;
    title?: string;
    department?: string;
    church?: string;
  } | null;

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col justify-center px-5 py-16">
      {!a?.found ? (
        <div className="card p-6 text-center">
          <Sym name="link_off" className="text-[28px] text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            Este link de escala não existe ou expirou.
          </p>
        </div>
      ) : (
        <div className="card p-6">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
            {a.church} · {a.department}
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-xl font-semibold">
            {a.title}
          </h1>
          <p className="mt-1 text-sm capitalize text-muted-foreground">
            {a.date ? fmt(a.date) : ""} · {a.role}
          </p>
          <div className="mt-5">
            <ConfirmButtons token={token} status={a.status ?? "pending"} />
          </div>
        </div>
      )}
    </main>
  );
}
