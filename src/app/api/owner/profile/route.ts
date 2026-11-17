import type { NextRequest } from "next/server";
import { handle } from "@/lib/http";
import { ownerAuth } from "@/server/container";
import { requireOwner } from "@/server/owner-session";
import { phoneBody } from "@/validation/owner-schemas";

// PATCH /api/owner/profile   body: { phone }   (empty text removes the number)
export async function PATCH(request: NextRequest) {
  return handle(async () => {
    const owner = await requireOwner(request);
    const body = phoneBody.parse(await request.json());
    const phone = await ownerAuth.updatePhone(owner.id, body.phone);
    return Response.json({ phone });
  });
}
