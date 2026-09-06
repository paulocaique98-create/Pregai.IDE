import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/site/urls";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/igreja/"],
        disallow: ["/painel/", "/entrar", "/onboarding", "/auth/"],
      },
    ],
    sitemap: `${appUrl()}/sitemap.xml`,
  };
}
