import type { NextRequest } from "next/server";
import { handle } from "@/lib/http";
import { branchService } from "@/server/container";
import { requireOwner } from "@/server/owner-session";
import { createBranchBody } from "@/validation/owner-schemas";

// GET /api/owner/shops -> the logged-in owner's branches
export async function GET(request: NextRequest) {
  return handle(async () => {
    const owner = await requireOwner(request);
    const shops = await branchService.listBranches(owner.id);
    return Response.json({ shops }, { headers: { "Cache-Control": "no-store" } });
  });
}

// POST /api/owner/shops   body: { name }
//   -> creates a branch; the response holds its cashier secret (shown once)
export async function POST(request: NextRequest) {
  return handle(async () => {
    const owner = await requireOwner(request);
    const body = createBranchBody.parse(await request.json());
    const created = await branchService.createBranch(owner.id, body);
    return Response.json(created, { status: 201 });
  });
}
