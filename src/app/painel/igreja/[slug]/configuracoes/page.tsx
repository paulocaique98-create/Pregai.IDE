import { notFound, redirect } from "next/navigation";
import { getOrgForMember } from "@/lib/site/queries";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/primitives";
import { canEditOrgSettings, type MemberMode, type OrgRole } from "@/lib/org/settings";
import { churchUrl } from "@/lib/site/urls";
import { SettingsForm } from "./SettingsForm";

export default async function ConfiguracoesPage({
  params,
}: PageProps<"/painel/igreja/[slug]/configuracoes">) {
  const { slug } = await params;
  const ctx = await getOrgForMember(slug);
  if (!ctx) notFound();
  if (!canEditOrgSettings(ctx.role as OrgRole)) {
    redirect(`/painel/igreja/${slug}/membros`);
  }

  // member_mode / custom_domain não estão no select padrão de getOrgForMember
  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("name, slug, member_mode, custom_domain")
    .eq("id", ctx.org.id)
    .maybeSingle();
  if (!org) notFound();

  return (
    <>
      <PageHeader
        kicker="Igreja"
        title="Configurações"
        description="Identidade da igreja e política de entrada de novos membros. Só o proprietário e o pastor editam."
      />

      <SettingsForm
        slug={slug}
        initialName={org.name}
        initialMode={(org.member_mode as MemberMode) ?? "approval"}
      />

      <section className="mt-8 card p-4 sm:p-5">
        <h2 className="font-[family-name:var(--font-display)] text-base font-semibold tracking-tight">
          Endereço
        </h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-muted-foreground">Site</dt>
            <dd className="font-mono text-xs">{churchUrl(org.slug)}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-muted-foreground">Domínio próprio</dt>
            <dd className="text-xs">{org.custom_domain || "não configurado"}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">
          O endereço (<code>{org.slug}</code>) não pode ser alterado por aqui: mudá-lo
          quebraria links já compartilhados. Fale com o suporte se precisar.
        </p>
      </section>
    </>
  );
}
