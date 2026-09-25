import type { MetadataRoute } from "next";
import { COLLECTION_SLUGS } from "@/lib/collections";
import { getHadithKeys, getNarratorIndex } from "@/lib/data/server";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const chunks = 1 + Math.ceil(getNarratorIndex().rows.length / 10000) + Math.ceil(COLLECTION_SLUGS.flatMap((c) => getHadithKeys(c)).length / 10000);
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/*/search"] },
    sitemap: Array.from({ length: chunks }, (_, i) => `${SITE_URL}/sitemap/${i}.xml`),
  };
}
