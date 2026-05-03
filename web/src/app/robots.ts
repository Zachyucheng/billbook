import type { MetadataRoute } from "next";
import { absoluteUrl, siteConfig } from "@/lib/site";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/auth", "/privacy", "/terms"],
      disallow: ["/api/", "/workspace"],
    },
    host: siteConfig.url,
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
