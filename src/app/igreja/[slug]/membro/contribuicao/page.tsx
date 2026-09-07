import QRCode from "qrcode";
import { getMemberContext } from "@/lib/site/member";
import { pixPayload } from "@/lib/site/pix";
import { EmptyState, Sym } from "@/components/ui/primitives";
import { PixBox } from "../../PixBox";

export default async function MembroContribuicao({
  params,
}: PageProps<"/igreja/[slug]/membro/contribuicao">) {
  const { slug } = await params;
  const ctx = await getMemberContext(slug);
  const giving = ctx.site.giving ?? {};

  const payload = giving.pixKey
    ? pixPayload({
        key: giving.pixKey,
        name: giving.pixName || ctx.site.branding?.name || ctx.org.name,
        city: giving.pixCity || "",
      })
    : "";
  const qr = payload
    ? await QRCode.toDataURL(payload, { margin: 1, width: 240 })
    : undefined;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
          <Sym name="favorite" className="text-[22px]" /> Dízimos e ofertas
        </h1>
        {giving.description && (
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {giving.description}
          </p>
        )}
      </div>

      {giving.pixKey ? (
        <div className="card p-6">
          <PixBox pixKey={giving.pixKey} payload={payload} qrDataUrl={qr} />
        </div>
      ) : (
        <EmptyState icon="pix">
          A igreja ainda não configurou a chave PIX.
        </EmptyState>
      )}
    </div>
  );
}
