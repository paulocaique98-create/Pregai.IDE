import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/platform";
import { signOut } from "@/app/entrar/actions";
import { Sym } from "@/components/ui/primitives";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/entrar");
  if (!isPlatformAdmin(data.user.email)) redirect("/painel");

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link
            href="/admin"
            className="flex items-center gap-2 font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight"
          >
            <Sym name="admin_panel_settings" className="text-[22px]" /> Pregai · Plataforma
          </Link>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="hidden sm:block">{data.user.email}</span>
            <form action={signOut}>
              <button className="btn btn-ghost">Sair</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
