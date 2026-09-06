import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { appUrl } from "@/lib/site/urls";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = appUrl();
  const entries: MetadataRoute.Sitemap = [
    { url: base, priority: 1 },
    { url: `${base}/privacidade` },
    { url: `${base}/termos` },
  ];

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("organizations")
      .select("slug, id, site_configs!inner(is_published)")
      .eq("site_configs.is_published", true);
    for (const org of data ?? []) {
      entries.push(
        { url: `${base}/igreja/${org.slug}`, priority: 0.8 },
        { url: `${base}/igreja/${org.slug}/instalar`, priority: 0.3 },
      );
    }
  } catch {
    // sem banco: devolve só as rotas estáticas
  }

  return entries;
}
