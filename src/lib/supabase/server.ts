import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { AUTH_COOKIE_MAX_AGE } from "./cookie-options";

export { AUTH_COOKIE_MAX_AGE };

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { maxAge: AUTH_COOKIE_MAX_AGE },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, { maxAge: AUTH_COOKIE_MAX_AGE, ...options }),
            );
          } catch {
            // called from a Server Component - safe to ignore when middleware refreshes sessions
          }
        },
      },
    },
  );
}
