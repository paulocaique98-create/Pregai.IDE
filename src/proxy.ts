import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_MAX_AGE } from "@/lib/supabase/cookie-options";

// Sessão + roteamento white-label por subdomínio.
const RESERVED_SUBS = new Set(["www", "app", "api", "admin", "auth"]);

export async function proxy(request: NextRequest) {
  // White-label: <slug>.<dominio-base> -> /igreja/<slug>
  // Inerte enquanto NEXT_PUBLIC_TENANT_BASE_DOMAIN for o host da Vercel.
  const host = (request.headers.get("host") ?? "").split(":")[0];
  const base = process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN ?? "";
  const path = request.nextUrl.pathname;
  if (
    base &&
    host !== base &&
    host.endsWith(`.${base}`) &&
    !path.startsWith("/igreja/") &&
    !path.startsWith("/_next") &&
    !path.startsWith("/auth/")
  ) {
    const sub = host.slice(0, -(base.length + 1));
    if (sub && !sub.includes(".") && !RESERVED_SUBS.has(sub)) {
      const rewritten = request.nextUrl.clone();
      rewritten.pathname = `/igreja/${sub}${path === "/" ? "" : path}`;
      return NextResponse.rewrite(rewritten);
    }
  }

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
      cookieOptions: { maxAge: AUTH_COOKIE_MAX_AGE },
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
            response.cookies.set(name, value, { maxAge: AUTH_COOKIE_MAX_AGE, ...options }),
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
