import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the Supabase session on every request. Tenant subdomain routing
// will be added here in Phase 1 (rewrite <slug>.<base-domain> -> /igreja/<slug>).
export async function proxy(request: NextRequest) {
  // OAuth: se o Supabase devolver ?code= numa rota que não é o handler
  // (acontece quando o Site URL dele aponta para outro lugar), redireciona.
  const code = request.nextUrl.searchParams.get("code");
  if (code && request.nextUrl.pathname !== "/auth/callback") {
    const to = request.nextUrl.clone();
    const next = to.searchParams.get("next");
    to.pathname = "/auth/callback";
    to.search = `?code=${code}${next ? `&next=${encodeURIComponent(next)}` : ""}`;
    return NextResponse.redirect(to);
  }

  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    console.error("proxy: Supabase env vars ausentes");
    return response;
  }

  const supabase = createServerClient(url, anon, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  try {
    await supabase.auth.getUser();
  } catch (e) {
    console.error("proxy: getUser falhou", e);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
