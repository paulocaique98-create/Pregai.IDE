import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Link curto de convite: /c/<token> -> rota canonica /igreja/<slug>/convite/<token> */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const { origin } = new URL(req.url);

  const admin = createAdminClient();
  const { data } = await admin
    .from("organization_invites")
    .select("token, organizations(slug)")
    .eq("token", token)
    .maybeSingle();

  const slug = (data as { organizations?: { slug?: string } } | null)?.organizations?.slug;
  if (!slug) {
    return NextResponse.redirect(`${origin}/?convite=invalido`);
  }
  return NextResponse.redirect(`${origin}/igreja/${slug}/convite/${token}`);
}
