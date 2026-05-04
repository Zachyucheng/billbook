import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const SITE_URL = "https://billbook.top";

const lastModified = new Date("2026-05-02T00:00:00.000Z");

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/legal`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.5,
    },
  ];
}
