import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { JOIN_INTENT_COOKIE } from "@/lib/site/member";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; token: string }> },
) {
  const { slug, token } = await params;
  const { origin } = new URL(req.url);
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    const next = `/igreja/${slug}/convite/${token}`;
    return NextResponse.redirect(
      `${origin}/igreja/${slug}/entrar?next=${encodeURIComponent(next)}`,
    );
  }

  const { data } = await supabase.rpc("accept_invite", { p_token: token });
  const result = (data as { result?: string; slug?: string } | null)?.result;
  const targetSlug = (data as { slug?: string } | null)?.slug ?? slug;

  if (result === "not_found" || result === "expired" || !result) {
    return NextResponse.redirect(`${origin}/igreja/${slug}?convite=${result ?? "invalido"}`);
  }

  if (result === "pending") {
    const { data: org } = await supabase
      .from("organizations")
      .select("id, name")
      .eq("slug", targetSlug)
      .maybeSingle();
    if (org) {
      const { orgStaffEmails, sendEmail, tmpl } = await import("@/lib/email");
      const to = await orgStaffEmails(org.id);
      if (to.length) {
        const who = auth.user.user_metadata?.full_name || auth.user.email || "Alguém";
        await sendEmail({ to, ...tmpl.newPendingMember(org.name, targetSlug, who) });
      }
    }
  }

  const res = NextResponse.redirect(`${origin}/igreja/${targetSlug}/membro`);
  res.cookies.set(JOIN_INTENT_COOKIE, targetSlug, { path: "/", maxAge: 600 });
  return res;
}
