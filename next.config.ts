import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Connects next-intl (Arabic/English texts) to Next.js. It finds
// src/i18n/request.ts by itself.
const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,

  // Development only: let phones and other devices on the local network open
  // the dev server. Without this Next blocks their scripts and the page looks
  // frozen. Each * stands for one number, so these cover home Wi-Fi addresses.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
};

export default withNextIntl(nextConfig);
