import type { NextRequest } from "next/server";
import { handle, readOptionalJson } from "@/lib/http";
import { toOrderDto } from "@/lib/order-dto";
import { orderService } from "@/server/container";
import { requireCashier } from "@/server/require-cashier";
import { createOrderBody } from "@/validation/order-schemas";

// GET /api/cashier/orders
//   -> the shop's unfinished orders plus the most recently collected ones
export async function GET(request: NextRequest) {
  return handle(async () => {
    const shop = await requireCashier(request);
    const [orders, nextNumber] = await Promise.all([
      orderService.listBoard(shop.id),
      orderService.getNextNumber(shop.id),
    ]);
    return Response.json(
      {
        shop: { name: shop.name },
        orders: orders.map(toOrderDto),
        nextNumber,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  });
}

// POST /api/cashier/orders   body (optional): { "number": 27 }
//   -> creates an order with that number, or the next automatic one
export async function POST(request: NextRequest) {
  return handle(async () => {
    const shop = await requireCashier(request);
    const { number } = createOrderBody.parse(await readOptionalJson(request));
    const order = await orderService.createOrder(shop.id, number);
    return Response.json(toOrderDto(order), { status: 201 });
  });
}
