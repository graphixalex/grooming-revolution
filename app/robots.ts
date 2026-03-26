import type { MetadataRoute } from "next";

function getSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  return "https://grooming-revolution.com";
}

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/privacy-policy", "/terms-and-conditions", "/refund-policy", "/legal/"],
        disallow: [
          "/api/",
          "/dashboard",
          "/planner",
          "/clients",
          "/dogs",
          "/payments",
          "/cash",
          "/reports",
          "/operator-reports",
          "/messages",
          "/whatsapp",
          "/settings",
          "/billing",
          "/branches",
          "/support",
          "/book/",
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}

