import { PrismaOrderRepository } from "@/repositories/prisma-order-repository";
import { PrismaShopRepository } from "@/repositories/prisma-shop-repository";
import { createCashierAuthService } from "@/services/cashier-auth-service";
import { createCustomerService } from "@/services/customer-service";
import { createOrderService } from "@/services/order-service";

// The one place where real implementations are wired together.
const orderRepository = new PrismaOrderRepository();
const shopRepository = new PrismaShopRepository();

export const orderService = createOrderService({ orders: orderRepository });

export const cashierAuth = createCashierAuthService({ shops: shopRepository });

export const customerService = createCustomerService({
  shops: shopRepository,
  orders: orderRepository,
});
