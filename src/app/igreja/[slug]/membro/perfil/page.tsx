import { getMemberContext } from "@/lib/site/member";
import { signOut } from "@/app/entrar/actions";
import { Sym } from "@/components/ui/primitives";
import { updateProfile } from "../actions";
import { PushToggle } from "../PushToggle";

export default async function MembroPerfil({
  params,
}: PageProps<"/igreja/[slug]/membro/perfil">) {
  const { slug } = await params;
  const ctx = await getMemberContext(slug);

  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
        <Sym name="person" className="text-[22px]" /> Meu perfil
      </h1>

      <form action={updateProfile.bind(null, slug)} className="card space-y-3 p-5">
        <div>
          <label className="field-label">Nome completo</label>
          <input
            name="full_name"
            defaultValue={ctx.profile?.full_name ?? ""}
            className="field-input"
          />
        </div>
        <div>
          <label className="field-label">WhatsApp</label>
          <input
            name="phone"
            defaultValue={ctx.profile?.phone ?? ""}
            placeholder="(11) 90000-0000"
            className="field-input"
          />
        </div>
        <div>
          <label className="field-label">E-mail</label>
          <input
            value={ctx.user.email ?? ""}
            disabled
            className="field-input opacity-60"
          />
        </div>
        <button className="btn btn-primary">Salvar</button>
      </form>

      <PushToggle />

      <form action={signOut}>
        <button className="btn btn-outline w-full">Sair da conta</button>
      </form>
    </div>
  );
}
