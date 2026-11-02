import type { MetadataRoute } from "next";

// Tells search engines what to leave alone: private links (cashier screens,
// customer order pages), the owner area and the API. Only the public website
// should show up in Google.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/*/c/", "/*/o/", "/*/s/", "/*/account"],
    },
  };
}
