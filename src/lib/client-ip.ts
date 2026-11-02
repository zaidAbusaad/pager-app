// The caller's IP address, as reported by the hosting platform's proxy.
// Hosts like Vercel put it in x-forwarded-for ("client, proxy1, proxy2");
// the first entry is the real client. Falls back to "unknown" so that limits
// still apply (all unknown callers then share one bucket).
export function clientIp(headers: Pick<Headers, "get">): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}
