import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const SITE_URL = "https://billbook.top";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/auth", "/privacy", "/terms"],
      disallow: ["/api/", "/workspace"],
    },
    host: SITE_URL,
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
