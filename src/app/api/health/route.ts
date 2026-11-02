import { connection } from "next/server";
import { getPrisma } from "@/lib/db";

// GET /api/health  ->  200 when the app AND its database answer.
// Uptime monitors (UptimeRobot, Better Stack...) call this every minute and
// message you when it stops answering.
export async function GET() {
  await connection(); // always run at request time, never frozen at build time
  try {
    await getPrisma().$queryRaw`SELECT 1`;
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
